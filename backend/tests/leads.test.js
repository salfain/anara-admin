// Guards the date handling behind the spreadsheet-style table, where a single
// cell edit resends the whole row: any drift compounds with every keystroke.

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const TEST_DB = process.env.TEST_DATABASE_URL;

if (!TEST_DB) {
  test('leads suite', { skip: 'set TEST_DATABASE_URL to run' }, () => {});
  return;
}

process.env.DATABASE_URL = TEST_DB;
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

const jwt = require('jsonwebtoken');
const pool = require('../src/db/pool');
const app = require('../src/app');

let base;
let server;
let headers;

const toInputDate = (v) => (v ? String(v).slice(0, 10) : '');

// Mirrors the payload the table sends when one cell changes.
const toPayload = (l) => ({
  entryDate: toInputDate(l.entryDate),
  whatsapp: l.whatsapp || '',
  picSales: l.picSales || null,
  status: l.status || 'Baru',
  notes: l.notes || null,
  followUp1: toInputDate(l.followUp1) || null,
  followUp2: toInputDate(l.followUp2) || null,
  followUp3: toInputDate(l.followUp3) || null,
  country: l.country || null,
});

async function createLead() {
  const res = await fetch(`${base}/leads`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      entryDate: '2026-08-28',
      whatsapp: '628111',
      picSales: 'Dita',
      status: 'Nego',
      country: 'Korea',
      notes: 'catatan asli',
      followUp1: '2026-07-29',
    }),
  });
  return (await res.json()).data;
}

test.before(async () => {
  const schema = fs.readFileSync(path.join(__dirname, '../src/db/schema.sql'), 'utf8');
  await pool.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
  await pool.query(schema);
  await pool.query(
    `INSERT INTO users (id, email, name, role, status) VALUES (1, 'a@t.id', 'A', 'admin', 'active')`
  );

  server = app.listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}/api`;
  headers = {
    Authorization: `Bearer ${jwt.sign({ sub: 1, email: 'a@t.id', role: 'admin', isAdmin: true }, process.env.JWT_SECRET)}`,
    'Content-Type': 'application/json',
  };
});

test.after(async () => {
  await new Promise((r) => server.close(r));
  await pool.end();
});

test('dates come back as plain calendar days, not shifted timestamps', async () => {
  const lead = await createLead();
  assert.equal(lead.entryDate, '2026-08-28');
  assert.equal(lead.followUp1, '2026-07-29');
});

test('editing one cell leaves every other column intact', async () => {
  const lead = await createLead();
  const res = await fetch(`${base}/leads/${lead.id}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ ...toPayload(lead), status: 'Sudah DP' }),
  });
  assert.equal(res.status, 200);

  const after = (await res.json()).data;
  assert.equal(after.status, 'Sudah DP');
  for (const field of ['whatsapp', 'picSales', 'country', 'notes', 'entryDate', 'followUp1']) {
    assert.equal(after[field], lead[field], `${field} should survive the edit`);
  }
});

test('repeated edits do not walk the dates backwards', async () => {
  // The original bug: each save re-read a date that had already slipped a day,
  // so five edits moved it five days.
  let lead = await createLead();
  for (let i = 0; i < 5; i++) {
    const res = await fetch(`${base}/leads/${lead.id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ ...toPayload(lead), notes: `edit ${i}` }),
    });
    lead = (await res.json()).data;
  }
  assert.equal(lead.entryDate, '2026-08-28');
  assert.equal(lead.followUp1, '2026-07-29');
});

test('summary counts leads that have gone quiet', async () => {
  await pool.query('DELETE FROM leads');
  const day = (n) => {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d.toISOString().slice(0, 10);
  };

  const rows = [
    // [entry, fu1, status, harapan]
    [day(0), null, 'Baru'],        // baru masuk hari ini -> aman
    [day(2), null, 'Baru'],        // 2 hari -> masih aman
    [day(3), null, 'Baru'],        // 3 hari -> perlu FU
    [day(10), day(4), 'Nego'],     // FU terakhir 4 hari lalu -> perlu FU
    [day(30), day(9), 'Proses'],   // FU terakhir 9 hari lalu -> terlambat
    [day(30), null, 'Sudah DP'],   // sudah closing -> tidak dihitung
    [day(30), null, 'Batal'],      // batal -> tidak dihitung
  ];
  for (const [entry, fu1, status] of rows) {
    await pool.query(
      `INSERT INTO leads (entry_date, whatsapp, status, follow_up_1) VALUES ($1, '628', $2, $3)`,
      [entry, status, fu1]
    );
  }

  const { data } = await (await fetch(`${base}/leads/summary`, { headers })).json();
  // due mencakup yang terlambat: 3 hari, 4 hari, dan 9 hari.
  assert.equal(data.followUp.due, 3);
  assert.equal(data.followUp.overdue, 1);
  assert.equal(data.followUp.dueAfterDays, 3);
});

test('a lead carries its customer name and the package they asked about', async () => {
  await pool.query('DELETE FROM leads');
  const pkg = await pool.query(
    `INSERT INTO packages (name, destination, dates, price) VALUES ('Korea Autumn 2026', 'Korea', '12-19 Okt 2026', 18500000) RETURNING id`
  );
  const packageId = pkg.rows[0].id;

  const created = await (await fetch(`${base}/leads`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ entryDate: '2026-08-28', whatsapp: '628111', name: 'Ibu Sari', packageId }),
  })).json();

  // Detail paket ikut di respons supaya pesan follow-up tidak perlu request lagi.
  assert.equal(created.data.name, 'Ibu Sari');
  assert.equal(created.data.packageName, 'Korea Autumn 2026');
  assert.equal(created.data.packageDates, '12-19 Okt 2026');
  assert.equal(created.data.packagePrice, 18500000);

  const list = await (await fetch(`${base}/leads`, { headers })).json();
  assert.equal(list.data[0].packageName, 'Korea Autumn 2026');
});

test('import matches packages by name and keeps leads whose package is unknown', async () => {
  await pool.query('DELETE FROM leads');
  await pool.query('DELETE FROM packages');
  await pool.query(`INSERT INTO packages (name) VALUES ('Korea Autumn 2026')`);

  const res = await fetch(`${base}/leads/bulk`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      rows: [
        { entryDate: '2026-08-01', whatsapp: '628001', name: 'Sari', packageName: 'korea autumn 2026' },
        { entryDate: '2026-08-02', whatsapp: '628002', name: 'Budi', packageName: 'Paket Yang Sudah Dihapus' },
      ],
    }),
  });
  assert.equal((await res.json()).data.imported, 2);

  const list = await (await fetch(`${base}/leads`, { headers })).json();
  const byNumber = Object.fromEntries(list.data.map((l) => [l.whatsapp, l]));
  // Pencocokan nama paket mengabaikan besar-kecil huruf.
  assert.equal(byNumber['628001'].packageName, 'Korea Autumn 2026');
  assert.equal(byNumber['628001'].name, 'Sari');
  // Paket tak dikenal tidak boleh menggagalkan barisnya.
  assert.equal(byNumber['628002'].packageId, null);
  assert.equal(byNumber['628002'].name, 'Budi');
});

test('sales analytics counts conversion per package and per PIC', async () => {
  await pool.query('DELETE FROM leads');
  await pool.query('DELETE FROM packages');
  const korea = (await pool.query(`INSERT INTO packages (name) VALUES ('Korea') RETURNING id`)).rows[0].id;
  const jepang = (await pool.query(`INSERT INTO packages (name) VALUES ('Jepang') RETURNING id`)).rows[0].id;

  // Korea: banyak ditanya, sedikit jadi. Jepang: sebaliknya. Justru pola ini
  // yang harus terlihat, dan tidak terlihat kalau hanya menghitung lead.
  const rows = [
    [korea, 'Dita', 'Sudah DP'],
    [korea, 'Dita', 'Batal'],
    [korea, 'Dita', 'Batal'],
    [korea, 'Budi', 'Nego'],
    [jepang, 'Budi', 'Sudah DP'],
    [jepang, 'Budi', 'Sudah DP'],
    [jepang, 'Budi', 'Batal'],
  ];
  for (const [pkg, pic, status] of rows) {
    await pool.query(
      `INSERT INTO leads (entry_date, whatsapp, package_id, pic_sales, status)
       VALUES ('2026-08-01', '628', $1, $2, $3)`,
      [pkg, pic, status]
    );
  }

  const { data } = await (await fetch(`${base}/analytics/sales`, { headers })).json();

  const byPkg = Object.fromEntries(data.byPackage.map((r) => [r.label, r]));
  assert.equal(byPkg.Korea.leads, 4);
  assert.equal(byPkg.Korea.won, 1);
  assert.equal(byPkg.Korea.open, 1, 'lead yang masih Nego belum selesai');
  // 1 dari 3 yang selesai — lead yang masih berjalan tidak ikut membagi.
  assert.equal(byPkg.Korea.conversion, 33);
  assert.equal(byPkg.Jepang.conversion, 67);

  const byPic = Object.fromEntries(data.byPic.map((r) => [r.label, r]));
  assert.equal(byPic.Dita.conversion, 33);
  assert.equal(byPic.Budi.conversion, 67);
});

test('conversion is blank, not zero, when nothing has finished yet', async () => {
  await pool.query('DELETE FROM leads');
  await pool.query(
    `INSERT INTO leads (entry_date, whatsapp, pic_sales, status) VALUES ('2026-08-01', '628', 'Sari', 'Nego')`
  );
  const { data } = await (await fetch(`${base}/analytics/sales`, { headers })).json();
  // 0% akan terbaca sebagai "gagal semua", padahal belum ada yang selesai.
  assert.equal(data.byPic[0].conversion, null);
});

test('the closing date is stamped once and not moved by later edits', async () => {
  await pool.query('DELETE FROM leads');
  const lead = (await (await fetch(`${base}/leads`, {
    method: 'POST', headers,
    body: JSON.stringify({ entryDate: '2026-08-01', whatsapp: '628999', status: 'Nego' }),
  })).json()).data;
  assert.equal(lead.wonAt, null);

  const won = (await (await fetch(`${base}/leads/${lead.id}`, {
    method: 'PUT', headers,
    body: JSON.stringify({ ...toPayload(lead), status: 'Sudah DP' }),
  })).json()).data;
  assert.ok(won.wonAt, 'tanggal closing tercatat saat status berubah');

  const edited = (await (await fetch(`${base}/leads/${lead.id}`, {
    method: 'PUT', headers,
    body: JSON.stringify({ ...toPayload(won), notes: 'catatan menyusul' }),
  })).json()).data;
  assert.equal(
    new Date(edited.wonAt).getTime(), new Date(won.wonAt).getTime(),
    'menyunting catatan tidak boleh menggeser tanggal closing'
  );

  const reopened = (await (await fetch(`${base}/leads/${lead.id}`, {
    method: 'PUT', headers,
    body: JSON.stringify({ ...toPayload(won), status: 'Nego' }),
  })).json()).data;
  assert.equal(reopened.wonAt, null, 'status dicabut, tanggalnya ikut dicabut');
});

test('typos in the PIC name no longer split the conversion table', async () => {
  await pool.query('DELETE FROM leads');
  await pool.query(`INSERT INTO users (id, email, name, role, status)
                    VALUES (9, 'dita@t.id', 'Dita', 'cs', 'active') ON CONFLICT DO NOTHING`);

  // Ditulis tiga cara berbeda — dulu jadi tiga baris terpisah di laporan.
  for (const [pic, status] of [['Dita', 'Sudah DP'], ['dita', 'Batal'], ['  DITA  ', 'Sudah DP']]) {
    await fetch(`${base}/leads`, {
      method: 'POST', headers,
      body: JSON.stringify({ entryDate: '2026-08-01', whatsapp: '628', picSales: pic }),
    }).then((r) => r.json()).then(({ data }) =>
      fetch(`${base}/leads/${data.id}`, {
        method: 'PUT', headers,
        body: JSON.stringify({ ...toPayload(data), picSales: pic, status }),
      })
    );
  }

  const { data } = await (await fetch(`${base}/analytics/sales`, { headers })).json();
  const dita = data.byPic.filter((r) => r.label === 'Dita');
  assert.equal(dita.length, 1, 'ketiganya harus menyatu jadi satu baris');
  assert.equal(dita[0].leads, 3);
  assert.equal(dita[0].conversion, 67);
});

test('a PIC who has no account is still counted, under the name typed', async () => {
  await pool.query('DELETE FROM leads');
  await fetch(`${base}/leads`, {
    method: 'POST', headers,
    body: JSON.stringify({ entryDate: '2026-08-01', whatsapp: '628', picSales: 'Freelancer Luar' }),
  });
  const { data } = await (await fetch(`${base}/analytics/sales`, { headers })).json();
  assert.equal(data.byPic[0].label, 'Freelancer Luar');
});

test('the sales range filters by when the lead arrived', async () => {
  await pool.query('DELETE FROM leads');
  for (const [tanggal, status] of [['2026-06-15', 'Sudah DP'], ['2026-08-20', 'Batal']]) {
    await pool.query(
      `INSERT INTO leads (entry_date, whatsapp, pic_sales, status) VALUES ($1, '628', 'Sari', $2)`,
      [tanggal, status]
    );
  }

  const semua = await (await fetch(`${base}/analytics/sales`, { headers })).json();
  assert.equal(semua.data.byPic[0].leads, 2);

  const agustus = await (await fetch(
    `${base}/analytics/sales?start_date=2026-08-01&end_date=2026-08-31`, { headers }
  )).json();
  assert.equal(agustus.data.byPic[0].leads, 1);
  assert.equal(agustus.data.byPic[0].won, 0, 'closing bulan Juni tidak boleh ikut');
});

test('the trend shows every month, including the quiet ones', async () => {
  await pool.query('DELETE FROM leads');
  const bulanLalu = new Date();
  bulanLalu.setDate(1);
  bulanLalu.setMonth(bulanLalu.getMonth() - 1);
  const kunci = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  const tanggal = `${kunci(bulanLalu)}-05`;

  for (const status of ['Sudah DP', 'Sudah DP', 'Batal', 'Nego']) {
    await pool.query(
      `INSERT INTO leads (entry_date, whatsapp, status) VALUES ($1, '628', $2)`,
      [tanggal, status]
    );
  }

  const { data } = await (await fetch(`${base}/analytics/sales-trend?months=6`, { headers })).json();
  assert.equal(data.length, 6, 'bulan tanpa lead tetap muncul');

  const target = data.find((d) => d.month === kunci(bulanLalu));
  assert.equal(target.leads, 4);
  assert.equal(target.won, 2);
  // 2 dari 3 yang selesai — lead yang masih Nego tidak ikut membagi.
  assert.equal(target.conversion, 67);

  // Bulan sepi bukan bulan gagal, jadi bukan 0%.
  const sepi = data.find((d) => d.leads === 0);
  assert.equal(sepi.conversion, null);
});

test('a lead keeps a history of what happened, newest first', async () => {
  await pool.query('DELETE FROM leads');
  const lead = (await (await fetch(`${base}/leads`, {
    method: 'POST', headers,
    body: JSON.stringify({ entryDate: '2026-08-01', whatsapp: '628777', status: 'Baru' }),
  })).json()).data;

  await fetch(`${base}/leads/${lead.id}/notes`, {
    method: 'POST', headers,
    body: JSON.stringify({ body: 'Sudah dikirim itinerary, minta waktu diskusi dengan suami.' }),
  });

  // Perubahan status dicatat sendiri — pertanyaan "kenapa jadi Batal" biasanya
  // dimulai dari "kapan berubahnya, dan oleh siapa".
  await fetch(`${base}/leads/${lead.id}`, {
    method: 'PUT', headers,
    body: JSON.stringify({ ...toPayload(lead), status: 'Nego' }),
  });

  const { data } = await (await fetch(`${base}/leads/${lead.id}/notes`, { headers })).json();
  assert.equal(data.length, 2);
  assert.equal(data[0].kind, 'status');
  assert.equal(data[0].body, 'Status: Baru → Nego');
  assert.equal(data[0].author, 'A', 'tercatat siapa yang mengubah');
  assert.equal(data[1].kind, 'note');
});

test('editing something else does not add a status entry', async () => {
  await pool.query('DELETE FROM leads');
  const lead = (await (await fetch(`${base}/leads`, {
    method: 'POST', headers,
    body: JSON.stringify({ entryDate: '2026-08-01', whatsapp: '628888', status: 'Nego' }),
  })).json()).data;

  await fetch(`${base}/leads/${lead.id}`, {
    method: 'PUT', headers,
    body: JSON.stringify({ ...toPayload(lead), notes: 'ubah catatan saja' }),
  });

  const { data } = await (await fetch(`${base}/leads/${lead.id}/notes`, { headers })).json();
  assert.equal(data.length, 0, 'riwayat hanya untuk yang benar-benar berubah');
});

test('an empty note is refused', async () => {
  await pool.query('DELETE FROM leads');
  const lead = (await (await fetch(`${base}/leads`, {
    method: 'POST', headers,
    body: JSON.stringify({ entryDate: '2026-08-01', whatsapp: '628999' }),
  })).json()).data;

  const res = await fetch(`${base}/leads/${lead.id}/notes`, {
    method: 'POST', headers, body: JSON.stringify({ body: '   ' }),
  });
  assert.equal(res.status, 400);
});

test('deleting a lead takes its history with it', async () => {
  await pool.query('DELETE FROM leads');
  const lead = (await (await fetch(`${base}/leads`, {
    method: 'POST', headers,
    body: JSON.stringify({ entryDate: '2026-08-01', whatsapp: '628111' }),
  })).json()).data;
  await fetch(`${base}/leads/${lead.id}/notes`, {
    method: 'POST', headers, body: JSON.stringify({ body: 'halo' }),
  });

  await fetch(`${base}/leads/${lead.id}`, { method: 'DELETE', headers });
  const sisa = await pool.query('SELECT count(*)::int AS n FROM lead_notes');
  assert.equal(sisa.rows[0].n, 0, 'jangan tinggalkan catatan yatim');
});

test('the reminder separates my queue from the team queue', async () => {
  await pool.query('DELETE FROM leads');
  await pool.query(`INSERT INTO users (id, email, name, role, status)
                    VALUES (60, 'rekan@t.id', 'Rekan', 'cs', 'active') ON CONFLICT DO NOTHING`);

  const lama = new Date();
  lama.setDate(lama.getDate() - 10);
  const tanggalLama = lama.toISOString().slice(0, 10);

  // Dua menganggur milik saya (user 1), satu milik rekan, satu masih segar.
  const rows = [
    [1, tanggalLama], [1, tanggalLama], [60, tanggalLama],
    [1, new Date().toISOString().slice(0, 10)],
  ];
  for (const [pic, tanggal] of rows) {
    await pool.query(
      `INSERT INTO leads (entry_date, whatsapp, pic_user_id, status) VALUES ($1, '628', $2, 'Nego')`,
      [tanggal, pic]
    );
  }

  const { data } = await (await fetch(`${base}/leads/summary`, { headers })).json();
  assert.equal(data.followUp.due, 3, 'seluruh tim');
  assert.equal(data.followUp.mineDue, 2, 'hanya milik saya');
  assert.equal(data.followUp.mineOverdue, 2);
  assert.equal(data.followUp.mineTotal, 3, 'termasuk yang belum jatuh tempo');
});

test('someone with no leads assigned is not shown an empty personal queue', async () => {
  await pool.query('DELETE FROM leads');
  const lama = new Date();
  lama.setDate(lama.getDate() - 10);
  await pool.query(
    `INSERT INTO leads (entry_date, whatsapp, pic_user_id, status) VALUES ($1, '628', 60, 'Nego')`,
    [lama.toISOString().slice(0, 10)]
  );

  const { data } = await (await fetch(`${base}/leads/summary`, { headers })).json();
  // mineTotal nol membedakan "bukan urusan saya" dari "punya, sudah beres" —
  // manajer tetap harus melihat angka tim.
  assert.equal(data.followUp.mineTotal, 0);
  assert.equal(data.followUp.due, 1);
});

test('the follow-up date comes from the chosen departure, not the package blob', async () => {
  await pool.query('DELETE FROM leads');
  await pool.query('DELETE FROM packages');
  const pkg = (await pool.query(
    `INSERT INTO packages (name, dates) VALUES ('Korea', '12-19 Okt / 24-31 Okt / 5-12 Nov') RETURNING id`
  )).rows[0].id;
  const dep = (await pool.query(
    `INSERT INTO package_departures (package_id, depart_date) VALUES ($1, '2026-10-24') RETURNING id`,
    [pkg]
  )).rows[0].id;

  const lead = (await (await fetch(`${base}/leads`, {
    method: 'POST', headers,
    body: JSON.stringify({ entryDate: '2026-08-01', whatsapp: '628', departureId: dep }),
  })).json()).data;

  // Inti perubahannya: pesan follow-up menyebut satu tanggal yang ditanyakan,
  // bukan seluruh daftar tanggal paket itu.
  assert.equal(lead.packageDates, '2026-10-24');
  assert.equal(lead.departureId, dep);
  // Paketnya ikut dari keberangkatan, tanpa perlu dikirim terpisah.
  assert.equal(lead.packageId, pkg);
  assert.equal(lead.packageName, 'Korea');
});

test('without a departure it still falls back to the package text', async () => {
  await pool.query('DELETE FROM leads');
  const pkg = (await pool.query(`SELECT id FROM packages LIMIT 1`)).rows[0].id;
  const lead = (await (await fetch(`${base}/leads`, {
    method: 'POST', headers,
    body: JSON.stringify({ entryDate: '2026-08-01', whatsapp: '628', packageId: pkg }),
  })).json()).data;

  // Customer sering menanyakan paket sebelum menyebut tanggal — itu bukan
  // kesalahan, jadi tidak dikosongkan.
  assert.equal(lead.packageDates, '12-19 Okt / 24-31 Okt / 5-12 Nov');
  assert.equal(lead.departureId, null);
});

test('a lead keeps its package when the departure is deleted', async () => {
  await pool.query('DELETE FROM leads');
  const pkg = (await pool.query(`SELECT id FROM packages LIMIT 1`)).rows[0].id;
  const dep = (await pool.query(
    `INSERT INTO package_departures (package_id, depart_date) VALUES ($1, '2026-12-01') RETURNING id`,
    [pkg]
  )).rows[0].id;
  const lead = (await (await fetch(`${base}/leads`, {
    method: 'POST', headers,
    body: JSON.stringify({ entryDate: '2026-08-01', whatsapp: '628', departureId: dep }),
  })).json()).data;

  await pool.query('DELETE FROM package_departures WHERE id = $1', [dep]);

  const list = await (await fetch(`${base}/leads`, { headers })).json();
  const setelah = list.data.find((l) => l.id === lead.id);
  assert.equal(setelah.departureId, null, 'tanggalnya lepas');
  assert.equal(setelah.packageId, pkg, 'tapi paketnya tetap — lead tidak kehilangan konteks');
});

test('the daily report counts one CS on one day', async () => {
  await pool.query('DELETE FROM leads');
  await pool.query('DELETE FROM packages');
  await pool.query(`INSERT INTO users (id, email, name, role, status)
                    VALUES (70, 'alvin@t.id', 'Alvin', 'cs', 'active') ON CONFLICT DO NOTHING`);
  const korea = (await pool.query(`INSERT INTO packages (name) VALUES ('Korea') RETURNING id`)).rows[0].id;
  const eropa = (await pool.query(`INSERT INTO packages (name) VALUES ('Eropa Barat') RETURNING id`)).rows[0].id;

  const hariIni = '2026-08-28';
  const kemarin = '2026-08-27';

  // Milik Alvin hari ini: dua Korea, satu Eropa.
  for (const pkg of [korea, korea, eropa]) {
    await pool.query(
      `INSERT INTO leads (entry_date, whatsapp, pic_user_id, package_id) VALUES ($1, '628', 70, $2)`,
      [hariIni, pkg]
    );
  }
  // Yang tidak boleh ikut: milik orang lain, dan milik Alvin tapi hari lain.
  await pool.query(`INSERT INTO leads (entry_date, whatsapp, pic_user_id) VALUES ($1, '628', 1)`, [hariIni]);
  await pool.query(`INSERT INTO leads (entry_date, whatsapp, pic_user_id) VALUES ($1, '628', 70)`, [kemarin]);

  const { data } = await (await fetch(`${base}/leads/daily-report?date=${hariIni}&userId=70`, { headers })).json();
  assert.equal(data.picName, 'Alvin');
  assert.equal(data.newLeads, 3);
  assert.deepEqual(data.byPackage, [
    { label: 'Korea', count: 2 },
    { label: 'Eropa Barat', count: 1 },
  ]);
});

test('closings and follow-ups are counted on the day they happened', async () => {
  await pool.query('DELETE FROM leads');
  const hariIni = '2026-08-28';

  // Closing hari ini, meski lead-nya masuk jauh sebelumnya.
  await pool.query(
    `INSERT INTO leads (entry_date, whatsapp, pic_user_id, status, won_at)
     VALUES ('2026-01-01', '628', 70, 'Sudah DP', $1::date)`,
    [hariIni]
  );
  // Di-follow-up hari ini di slot mana pun — slot ketiga sama sahnya.
  await pool.query(
    `INSERT INTO leads (entry_date, whatsapp, pic_user_id, follow_up_3)
     VALUES ('2026-02-01', '628', 70, $1::date)`,
    [hariIni]
  );
  // Di-follow-up kemarin, tidak ikut hari ini.
  await pool.query(
    `INSERT INTO leads (entry_date, whatsapp, pic_user_id, follow_up_1)
     VALUES ('2026-02-01', '628', 70, '2026-08-27')`
  );

  const { data } = await (await fetch(`${base}/leads/daily-report?date=${hariIni}&userId=70`, { headers })).json();
  assert.equal(data.newLeads, 0, 'tidak ada lead baru hari itu');
  assert.equal(data.closing, 1);
  assert.equal(data.followedUp, 1);
});

test('a day with nothing reports zeros rather than failing', async () => {
  await pool.query('DELETE FROM leads');
  const { data } = await (await fetch(`${base}/leads/daily-report?date=2026-08-28&userId=70`, { headers })).json();
  assert.equal(data.newLeads, 0);
  assert.equal(data.closing, 0);
  assert.deepEqual(data.byPackage, []);
});
