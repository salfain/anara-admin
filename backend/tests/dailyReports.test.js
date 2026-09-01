// Laporan harian yang disimpan, diisi admin.

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const TEST_DB = process.env.TEST_DATABASE_URL;
if (!TEST_DB) {
  test('daily reports suite', { skip: 'set TEST_DATABASE_URL to run' }, () => {});
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

const call = (method, url, body) =>
  fetch(base + url, { method, headers, body: body ? JSON.stringify(body) : undefined });

test.before(async () => {
  const schema = fs.readFileSync(path.join(__dirname, '../src/db/schema.sql'), 'utf8');
  await pool.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
  await pool.query(schema);
  await pool.query(`INSERT INTO users (id, email, name, role, status) VALUES
    (1, 'a@t.id', 'Admin', 'admin', 'active'),
    (2, 'alvin@t.id', 'Alvin', 'cs', 'active')`);

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

test('a report is saved and read back with the CS name', async () => {
  await pool.query('DELETE FROM daily_reports');
  const { data } = await (await call('POST', '/daily-reports', {
    reportDate: '2026-08-28',
    userId: 2,
    janjiTf: 2,
    totalClosing: 1,
    totalFollowup: 22,
    breakdownCounts: { '3 negara': 2, Korea: 1 },
  })).json();

  assert.equal(data.picName, 'Alvin');
  assert.equal(data.totalFollowup, 22);
  assert.deepEqual(data.breakdownCounts, { '3 negara': 2, Korea: 1 });
  // New Leads selalu jumlah rinciannya, bukan angka yang dikirim terpisah.
  assert.equal(data.newLeads, 3);
});

test('saving the same day again corrects it instead of adding a second row', async () => {
  // Admin akan membuka laporan kemarin dan membetulkan angkanya.
  await call('POST', '/daily-reports', {
    reportDate: '2026-08-28', userId: 2, breakdownCounts: { Korea: 5 }, totalClosing: 2, totalFollowup: 22,
  });

  const { data } = await (await call('GET', '/daily-reports')).json();
  assert.equal(data.length, 1, 'satu laporan per orang per hari');
  assert.equal(data[0].newLeads, 5);
});

test('an empty Janji TF stays empty rather than becoming zero', async () => {
  await pool.query('DELETE FROM daily_reports');
  const { data } = await (await call('POST', '/daily-reports', {
    reportDate: '2026-08-29', userId: 2, breakdownCounts: { Korea: 1 }, janjiTf: '',
  })).json();
  // Nol berarti tidak ada yang janji transfer; kosong berarti belum dihitung.
  assert.equal(data.janjiTf, null);
});

test('reports are filtered by month so the page does not load everything', async () => {
  await pool.query('DELETE FROM daily_reports');
  for (const tanggal of ['2026-07-15', '2026-08-01', '2026-08-20']) {
    await call('POST', '/daily-reports', { reportDate: tanggal, userId: 2, breakdownCounts: { Korea: 1 } });
  }

  const agustus = await (await call('GET', '/daily-reports?month=2026-08')).json();
  assert.equal(agustus.data.length, 2);
  // Terbaru di depan, karena yang dibuka pertama biasanya hari ini.
  assert.equal(agustus.data[0].reportDate, '2026-08-20');
});

test('removing a CS takes their reports with them', async () => {
  await pool.query('DELETE FROM daily_reports');
  await call('POST', '/daily-reports', { reportDate: '2026-09-01', userId: 2, breakdownCounts: { Korea: 1 } });
  await pool.query('DELETE FROM users WHERE id = 2');

  const sisa = await pool.query('SELECT count(*)::int AS n FROM daily_reports');
  assert.equal(sisa.rows[0].n, 0, 'jangan tinggalkan laporan tanpa pemilik');
});

test('one day returns every active CS, saved or not', async () => {
  await pool.query('DELETE FROM daily_reports');
  await pool.query(`INSERT INTO users (id, email, name, role, status) VALUES
    (3, 'dita@t.id', 'Dita', 'cs', 'active'),
    (4, 'lama@t.id', 'Sudah Keluar', 'cs', 'pending') ON CONFLICT DO NOTHING`);

  const { data } = await (await call('GET', '/daily-reports/day?date=2026-09-01')).json();
  const nama = data.rows.map((r) => r.picName);

  // Barisnya selalu ada, karena orangnya memang selalu ada. Tidak ada langkah
  // membuat baris lebih dulu.
  assert.ok(nama.includes('Admin'));
  assert.ok(nama.includes('Dita'));
  assert.ok(!nama.includes('Sudah Keluar'), 'yang belum aktif tidak ikut');
  assert.equal(data.rows.every((r) => r.saved === null), true);
});

test('computed figures arrive as a starting point', async () => {
  await pool.query('DELETE FROM daily_reports');
  await pool.query('DELETE FROM leads');
  await pool.query(`INSERT INTO packages (name) VALUES ('Korea') ON CONFLICT DO NOTHING`);
  const pkg = (await pool.query(`SELECT id FROM packages LIMIT 1`)).rows[0].id;
  for (let i = 0; i < 2; i++) {
    await pool.query(
      `INSERT INTO leads (entry_date, whatsapp, pic_user_id, package_id) VALUES ('2026-09-01', '628', 3, $1)`,
      [pkg]
    );
  }

  const { data } = await (await call('GET', '/daily-reports/day?date=2026-09-01')).json();
  const dita = data.rows.find((r) => r.picName === 'Dita');
  assert.equal(dita.computed.newLeads, 2);
  assert.deepEqual(dita.computed.breakdownCounts, { Korea: 2 });
  assert.equal(dita.saved, null, 'belum disimpan sampai admin menyimpannya');
});

test('a saved report is returned alongside what the data says', async () => {
  await call('POST', '/daily-reports', { reportDate: '2026-09-01', userId: 3, breakdownCounts: { Korea: 5 } });

  const { data } = await (await call('GET', '/daily-reports/day?date=2026-09-01')).json();
  const dita = data.rows.find((r) => r.picName === 'Dita');
  assert.equal(dita.saved.newLeads, 5, 'yang tersimpan yang berlaku');
  // Hitungannya tetap dikirim, supaya selisihnya bisa terlihat.
  assert.equal(dita.computed.newLeads, 2);
});

test('New Leads is the sum of the package numbers, never typed', async () => {
  await pool.query('DELETE FROM daily_reports');
  const { data } = await (await call('POST', '/daily-reports', {
    reportDate: '2026-09-05',
    userId: 3,
    // newLeads sengaja dikirim salah; yang berlaku tetap jumlah rinciannya.
    newLeads: 999,
    breakdownCounts: { Korea: 2, 'Eropa Barat': 3 },
  })).json();
  assert.equal(data.newLeads, 5);
});

test('a package left at zero is not stored', async () => {
  await pool.query('DELETE FROM daily_reports');
  const { data } = await (await call('POST', '/daily-reports', {
    reportDate: '2026-09-06',
    userId: 3,
    breakdownCounts: { Korea: 2, Vietnam: 0, Hongkong: '' },
  })).json();
  // Ketiadaan sudah berarti nol, jadi tidak perlu disimpan.
  assert.deepEqual(data.breakdownCounts, { Korea: 2 });
  assert.equal(data.newLeads, 2);
});

test('the day lists the packages that can be columns', async () => {
  const { data } = await (await call('GET', '/daily-reports/day?date=2026-09-01')).json();
  assert.ok(Array.isArray(data.packages));
});
