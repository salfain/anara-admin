// Jadwal keberangkatan per paket, beserta jalur import dari spreadsheet.

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const TEST_DB = process.env.TEST_DATABASE_URL;
if (!TEST_DB) {
  test('departures suite', { skip: 'set TEST_DATABASE_URL to run' }, () => {});
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

// Persis bentuk baris di spreadsheet Status Seat.
const barisSpreadsheet = [
  { packageName: '6D WINTER HOLIDAY HONGKONG', departDate: '2026-12-16', seatStatus: 'AVAILABLE' },
  { packageName: '6D WINTER HOLIDAY HONGKONG', departDate: '2026-12-17', seatStatus: 'AVAILABLE' },
  { packageName: '6D WINTER HOLIDAY HONGKONG', departDate: '2026-12-18', seatStatus: 'AVAILABLE' },
];

test('import creates the package when the name is new', async () => {
  await pool.query('DELETE FROM packages');
  const res = await call('POST', '/departures/import', { rows: barisSpreadsheet });
  const { data } = await res.json();

  assert.equal(data.imported, 3);
  assert.equal(data.packagesCreated, 1, 'satu paket, tiga tanggal');

  const pkg = await pool.query('SELECT count(*)::int AS n FROM packages');
  assert.equal(pkg.rows[0].n, 1);
});

test('importing again updates instead of duplicating', async () => {
  // Spreadsheet berubah statusnya, lalu diimport ulang — ini yang akan terjadi
  // setiap kali seat menipis, jadi harus aman.
  const ubah = barisSpreadsheet.map((r, i) =>
    i === 0 ? { ...r, seatStatus: 'WAITING LIST' } : r
  );
  const { data } = await (await call('POST', '/departures/import', { rows: ubah })).json();

  assert.equal(data.imported, 0, 'tidak ada baris baru');
  assert.equal(data.updated, 3);

  const semua = await (await call('GET', '/departures')).json();
  assert.equal(semua.data.length, 3, 'tetap tiga, bukan enam');
  assert.equal(semua.data[0].seatStatus, 'WAITING LIST');
});

test('a status the app has never seen is still accepted', async () => {
  // Daftar tertutup akan menolak istilah yang dipakai tim di spreadsheet.
  const { data } = await (await call('POST', '/departures/import', {
    rows: [{ packageName: '6D WINTER HOLIDAY HONGKONG', departDate: '2026-12-19', seatStatus: 'ON REQUEST' }],
  })).json();
  assert.equal(data.imported, 1);

  const semua = await (await call('GET', '/departures')).json();
  assert.ok(semua.data.some((d) => d.seatStatus === 'ON REQUEST'));
});

test('rows missing a trip name or a date are reported, not guessed at', async () => {
  const { data } = await (await call('POST', '/departures/import', {
    rows: [
      { packageName: '', departDate: '2026-12-20' },
      { packageName: 'Paket X', departDate: '' },
    ],
  })).json();
  assert.equal(data.imported, 0);
  assert.equal(data.skipped.length, 2);
});

test('the same date cannot be listed twice for one package', async () => {
  const pkg = (await pool.query(`SELECT id FROM packages LIMIT 1`)).rows[0].id;
  const res = await call('POST', '/departures', { packageId: pkg, departDate: '2026-12-16' });
  assert.equal(res.status, 409, 'dua status seat untuk tanggal yang sama tidak bisa dijawab');
});

test('upcoming hides departures that have already gone', async () => {
  const pkg = (await pool.query(`SELECT id FROM packages LIMIT 1`)).rows[0].id;
  await pool.query(
    `INSERT INTO package_departures (package_id, depart_date, seat_status) VALUES ($1, '2020-01-01', 'FULL')`,
    [pkg]
  );

  const semua = await (await call('GET', '/departures')).json();
  const akanDatang = await (await call('GET', '/departures?upcoming=1')).json();

  assert.ok(semua.data.some((d) => d.departDate === '2020-01-01'), 'riwayat tetap bisa dibaca');
  assert.ok(!akanDatang.data.some((d) => d.departDate === '2020-01-01'));
});

test('deleting a package takes its departures with it', async () => {
  const pkg = (await pool.query(`SELECT id FROM packages LIMIT 1`)).rows[0].id;
  await pool.query('DELETE FROM packages WHERE id = $1', [pkg]);
  const sisa = await pool.query('SELECT count(*)::int AS n FROM package_departures');
  assert.equal(sisa.rows[0].n, 0);
});

test('seats left counts participants, not invoices', async () => {
  await pool.query('DELETE FROM packages');
  const pkg = (await pool.query(`INSERT INTO packages (name) VALUES ('Paket 3 Negara') RETURNING id`)).rows[0].id;
  const dep = (await pool.query(
    `INSERT INTO package_departures (package_id, depart_date, return_date, capacity)
     VALUES ($1, '2026-09-24', '2026-09-30', 40) RETURNING id`,
    [pkg]
  )).rows[0].id;

  // Dua invoice, tapi enam orang. Menghitung invoice akan menjawab 38.
  const b1 = (await pool.query(
    `INSERT INTO bookings (departure_id, customer_name) VALUES ($1, 'DITA') RETURNING id`, [dep]
  )).rows[0].id;
  const b2 = (await pool.query(
    `INSERT INTO bookings (departure_id, customer_name) VALUES ($1, 'BUDI') RETURNING id`, [dep]
  )).rows[0].id;
  for (const id of [b1, b1, b1, b1, b2, b2]) {
    await pool.query(`INSERT INTO booking_participants (booking_id, name) VALUES ($1, 'peserta')`, [id]);
  }

  const { data } = await (await call('GET', '/departures')).json();
  const row = data.find((d) => d.id === dep);
  assert.equal(row.capacity, 40);
  assert.equal(row.booked, 6, 'enam peserta, bukan dua invoice');
  assert.equal(row.seatsLeft, 34);
  assert.equal(row.returnDate, '2026-09-30');
});

test('a departure with no bookings is completely free', async () => {
  const pkg = (await pool.query(`SELECT id FROM packages LIMIT 1`)).rows[0].id;
  const dep = (await pool.query(
    `INSERT INTO package_departures (package_id, depart_date) VALUES ($1, '2027-01-10') RETURNING id`,
    [pkg]
  )).rows[0].id;

  const { data } = await (await call('GET', '/departures')).json();
  const row = data.find((d) => d.id === dep);
  assert.equal(row.booked, 0);
  assert.equal(row.seatsLeft, 40, 'kapasitas default 40');
});

test('a return date before the departure is refused', async () => {
  const pkg = (await pool.query(`SELECT id FROM packages LIMIT 1`)).rows[0].id;
  const res = await call('POST', '/departures', {
    packageId: pkg, departDate: '2027-05-10', returnDate: '2027-05-01',
  });
  assert.equal(res.status, 400);
});

test('overbooking shows a negative figure rather than hiding it', async () => {
  const pkg = (await pool.query(`SELECT id FROM packages LIMIT 1`)).rows[0].id;
  const dep = (await pool.query(
    `INSERT INTO package_departures (package_id, depart_date, capacity) VALUES ($1, '2027-02-01', 2) RETURNING id`,
    [pkg]
  )).rows[0].id;
  const b = (await pool.query(
    `INSERT INTO bookings (departure_id, customer_name) VALUES ($1, 'X') RETURNING id`, [dep]
  )).rows[0].id;
  for (let i = 0; i < 3; i++) {
    await pool.query(`INSERT INTO booking_participants (booking_id, name) VALUES ($1, 'p')`, [b]);
  }

  const { data } = await (await call('GET', '/departures')).json();
  const row = data.find((d) => d.id === dep);
  // Dipotong jadi nol akan menyembunyikan justru keadaan yang paling genting.
  assert.equal(row.seatsLeft, -1);
});
