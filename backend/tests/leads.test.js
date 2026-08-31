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
