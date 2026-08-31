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
