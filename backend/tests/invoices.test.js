// Invoice: rincian harga, pembayaran, dan sisa tagihan.

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const TEST_DB = process.env.TEST_DATABASE_URL;
if (!TEST_DB) {
  test('invoices suite', { skip: 'set TEST_DATABASE_URL to run' }, () => {});
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
  await pool.query(`INSERT INTO users (id, email, name, role, status) VALUES (1, 'a@t.id', 'A', 'admin', 'active')`);

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

// Angka dari invoice sungguhan: 5 peserta, tur plus tipping plus extra tiket.
async function invoiceContoh() {
  await pool.query('DELETE FROM invoices');
  const inv = (await (await call('POST', '/invoices', {
    invoiceNo: '01468/NAD-INV/VIII/26',
    customerName: 'NANA ANDRIANI',
    customerAddress: 'JAKARTA',
    customerPhone: '0878-6013-0325',
    departureLabel: '29 DESEMBER 2026 - 03 JANUARI 2027',
    invoiceDate: '2026-08-31',
    csName: 'DITA',
  })).json()).data;

  await call('PUT', `/invoices/${inv.id}/items`, {
    items: [
      { code: 'TOUR 3 COUNTRIES (HS)', description: '6D5N (Malaysia, Singapore, thailand)', qty: 5, unitPrice: 7596000 },
      { code: 'Exclude', description: 'Exclude Tipping', qty: 5, unitPrice: 360000 },
      { code: 'Extra', description: 'Ticket', qty: 5, unitPrice: 200000 },
    ],
  });
  return inv.id;
}

test('the totals match the printed invoice', async () => {
  const id = await invoiceContoh();
  const { data } = await (await call('GET', `/invoices/${id}`)).json();

  assert.equal(data.items[0].amount, 37980000);
  assert.equal(data.subtotal, 40780000);
  // Belum ada pembayaran, jadi sisa tagihan sama dengan subtotal.
  assert.equal(data.outstanding, 40780000);
});

test('payments reduce the outstanding amount', async () => {
  const id = await invoiceContoh();
  await call('PUT', `/invoices/${id}/payments`, {
    payments: [{ paidOn: '2026-08-31', amount: 1250000 }],
  });

  const { data } = await (await call('GET', `/invoices/${id}`)).json();
  assert.equal(data.paid, 1250000);
  assert.equal(data.outstanding, 39530000, 'angka yang sama dengan invoice cetak');
});

test('money keeps its exact value through a round trip', async () => {
  const id = await invoiceContoh();
  await call('PUT', `/invoices/${id}/items`, {
    items: [{ code: 'X', description: 'Pecahan', qty: 3, unitPrice: 333333.33 }],
  });
  const { data } = await (await call('GET', `/invoices/${id}`)).json();
  // NUMERIC, bukan float: pembulatan biner akan membuat sisa tagihan meleset.
  assert.equal(data.subtotal, 999999.99);
});

test('replacing the lines removes the ones taken out', async () => {
  const id = await invoiceContoh();
  await call('PUT', `/invoices/${id}/items`, {
    items: [{ code: 'Satu saja', description: '', qty: 1, unitPrice: 100 }],
  });
  const { data } = await (await call('GET', `/invoices/${id}`)).json();
  assert.equal(data.items.length, 1);
  assert.equal(data.subtotal, 100);
});

test('two invoices cannot share a number', async () => {
  await invoiceContoh();
  const res = await call('POST', '/invoices', {
    invoiceNo: '01468/NAD-INV/VIII/26',
    customerName: 'ORANG LAIN',
  });
  assert.equal(res.status, 409);
});

test('deleting an invoice takes its lines and payments with it', async () => {
  const id = await invoiceContoh();
  await call('PUT', `/invoices/${id}/payments`, { payments: [{ paidOn: '2026-08-31', amount: 500000 }] });
  await call('DELETE', `/invoices/${id}`);

  const items = await pool.query('SELECT count(*)::int AS n FROM invoice_items');
  const bayar = await pool.query('SELECT count(*)::int AS n FROM invoice_payments');
  assert.equal(items.rows[0].n, 0);
  assert.equal(bayar.rows[0].n, 0);
});

test('the list carries the outstanding amount without the line detail', async () => {
  const id = await invoiceContoh();
  await call('PUT', `/invoices/${id}/payments`, { payments: [{ paidOn: '2026-08-31', amount: 1250000 }] });

  const { data } = await (await call('GET', '/invoices')).json();
  assert.equal(data.length, 1);
  assert.equal(data[0].outstanding, 39530000);
  assert.equal(data[0].items, undefined, 'daftar tidak perlu membawa rinciannya');
});
