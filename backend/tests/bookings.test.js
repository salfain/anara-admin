// Penagihan: invoice, peserta, dan deretan centang dari spreadsheet.

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const TEST_DB = process.env.TEST_DATABASE_URL;
if (!TEST_DB) {
  test('bookings suite', { skip: 'set TEST_DATABASE_URL to run' }, () => {});
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
let departureId;

const call = (method, url, body) =>
  fetch(base + url, { method, headers, body: body ? JSON.stringify(body) : undefined });

test.before(async () => {
  const schema = fs.readFileSync(path.join(__dirname, '../src/db/schema.sql'), 'utf8');
  await pool.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
  await pool.query(schema);
  await pool.query(`INSERT INTO users (id, email, name, role, status) VALUES (1, 'a@t.id', 'A', 'admin', 'active')`);

  const pkg = await pool.query(`INSERT INTO packages (name) VALUES ('EROPA BARAT') RETURNING id`);
  const dep = await pool.query(
    `INSERT INTO package_departures (package_id, depart_date) VALUES ($1, '2026-11-15') RETURNING id`,
    [pkg.rows[0].id]
  );
  departureId = dep.rows[0].id;

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

async function buatBooking() {
  const res = await call('POST', '/bookings', {
    departureId,
    invoiceNo: '01454/NAD-INV/VII/26',
    customerName: 'DITA',
  });
  return (await res.json()).data;
}

test('one invoice carries several participants', async () => {
  await pool.query('DELETE FROM bookings');
  const booking = await buatBooking();

  // Persis grup dari spreadsheet: satu invoice, empat nama.
  for (const nama of ['ISNAINIM MUFARROHA', 'IDRIS ZUHRI', 'ISHAQ ZUHRI', 'SYAIFUDDIN ZUHRI']) {
    await call('POST', `/bookings/${booking.id}/participants`, {
      name: nama, origin: 'SURABAYA', destination: 'SURABAYA',
    });
  }

  const { data } = await (await call('GET', `/bookings?departureId=${departureId}`)).json();
  assert.equal(data.length, 1, 'satu invoice, bukan empat baris terpisah');
  assert.equal(data[0].participants.length, 4);
  assert.equal(data[0].invoiceNo, '01454/NAD-INV/VII/26');
  // Urutan input dipertahankan — daftar peserta bukan himpunan.
  assert.equal(data[0].participants[0].name, 'ISNAINIM MUFARROHA');
  assert.equal(data[0].participants[3].name, 'SYAIFUDDIN ZUHRI');
});

test('a tick is saved on its own without touching the rest of the row', async () => {
  await pool.query('DELETE FROM bookings');
  const booking = await buatBooking();
  const peserta = (await (await call('POST', `/bookings/${booking.id}/participants`, {
    name: 'BUDI', origin: 'SURABAYA',
  })).json()).data;

  await call('PUT', `/bookings/${booking.id}/participants/${peserta.id}`, { paidDp: true });
  await call('PUT', `/bookings/${booking.id}/participants/${peserta.id}`, { codeOutbound: 'ABC123' });

  const { data } = await (await call('GET', `/bookings?departureId=${departureId}`)).json();
  const p = data[0].participants[0];
  assert.equal(p.paidDp, true);
  assert.equal(p.codeOutbound, 'ABC123');
  // Yang tidak dikirim harus tetap seperti semula — dua orang bisa mencentang
  // kolom berbeda pada baris yang sama.
  assert.equal(p.origin, 'SURABAYA');
  assert.equal(p.paidSettlement, false);
});

test('a field that is not on the list cannot be written', async () => {
  await pool.query('DELETE FROM bookings');
  const booking = await buatBooking();
  const peserta = (await (await call('POST', `/bookings/${booking.id}/participants`, { name: 'X' })).json()).data;

  const res = await call('PUT', `/bookings/${booking.id}/participants/${peserta.id}`, { booking_id: 999 });
  assert.equal(res.status, 400, 'badan permintaan tidak boleh memilih kolom');
});

test('deleting a booking takes its participants with it', async () => {
  await pool.query('DELETE FROM bookings');
  const booking = await buatBooking();
  await call('POST', `/bookings/${booking.id}/participants`, { name: 'A' });
  await call('POST', `/bookings/${booking.id}/participants`, { name: 'B' });

  await call('DELETE', `/bookings/${booking.id}`);
  const sisa = await pool.query('SELECT count(*)::int AS n FROM booking_participants');
  assert.equal(sisa.rows[0].n, 0);
});

test('a booking survives its departure being removed', async () => {
  await pool.query('DELETE FROM bookings');
  const booking = await buatBooking();
  await pool.query('DELETE FROM package_departures WHERE id = $1', [departureId]);

  const { data } = await (await call('GET', '/bookings')).json();
  // Tagihan yang sudah dibayar tidak boleh ikut hilang hanya karena jadwalnya
  // dihapus — uangnya nyata, jadwalnya cuma penanda.
  assert.equal(data.length, 1);
  assert.equal(data[0].departureId, null);
});

async function keberangkatanBaru(tanggal) {
  const pkg = (await pool.query(`SELECT id FROM packages LIMIT 1`)).rows[0].id;
  const dep = await pool.query(
    `INSERT INTO package_departures (package_id, depart_date) VALUES ($1, $2) RETURNING id`,
    [pkg, tanggal]
  );
  return dep.rows[0].id;
}

test('the summary counts people behind on DP or on the ticket', async () => {
  await pool.query('DELETE FROM bookings');
  const dep = await keberangkatanBaru('2027-06-01');
  const booking = (await (await call('POST', '/bookings', {
    departureId: dep, customerName: 'DITA',
  })).json()).data;

  // Empat orang: satu lunas, dua belum DP, satu sudah DP tapi belum tiket.
  const nama = ['LUNAS', 'BELUM-A', 'BELUM-B', 'DP-SAJA'];
  const ids = [];
  for (const n of nama) {
    ids.push((await (await call('POST', `/bookings/${booking.id}/participants`, { name: n })).json()).data.id);
  }
  await call('PUT', `/bookings/${booking.id}/participants/${ids[0]}`, { paidDp: true });
  await call('PUT', `/bookings/${booking.id}/participants/${ids[0]}`, { paidTicket: true });
  await call('PUT', `/bookings/${booking.id}/participants/${ids[3]}`, { paidDp: true });

  const { data } = await (await call('GET', '/bookings/summary')).json();
  assert.equal(data.total, 4);
  assert.equal(data.unpaidDp, 2, 'BELUM-A dan BELUM-B');
  assert.equal(data.unpaidTicket, 3, 'semua kecuali LUNAS');
  // Satu orang bisa menunggak keduanya, jadi lencana memakai jumlah terbesar,
  // bukan penjumlahan — 5 akan lebih banyak daripada jumlah pesertanya.
  assert.equal(data.needsAttention, 3);
});

test('departures already gone are left out of the reminder', async () => {
  await pool.query('DELETE FROM bookings');
  const lampau = await keberangkatanBaru('2020-01-01');
  const b = (await (await call('POST', '/bookings', { departureId: lampau, customerName: 'LAMA' })).json()).data;
  await call('POST', `/bookings/${b.id}/participants`, { name: 'ORANG LAMA' });

  const { data } = await (await call('GET', '/bookings/summary')).json();
  // Menagih DP untuk trip yang sudah berangkat bukan pekerjaan hari ini, dan
  // angkanya akan menumpuk sampai lencananya diabaikan.
  assert.equal(data.total, 0);
});
