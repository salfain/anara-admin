import test from 'node:test';
import assert from 'node:assert';
import { sortLeads, compareLeads } from '../src/utils/leadSort.js';

const nama = (rows) => rows.map((r) => r.name);

test('status diurutkan menurut tahapannya, bukan abjad', () => {
  const rows = [
    { name: 'a', status: 'Sudah DP' },
    { name: 'b', status: 'Baru' },
    { name: 'c', status: 'Nego' },
  ];
  // Menurut abjad urutannya jadi Baru, Nego, Sudah DP — kebetulan mirip, jadi
  // yang membuktikan justru Batal, yang secara abjad kedua tapi tahapannya
  // paling akhir.
  const withBatal = [...rows, { name: 'd', status: 'Batal' }];
  assert.deepEqual(nama(sortLeads(withBatal, { field: 'status', dir: 'asc' })), ['b', 'c', 'a', 'd']);
});

test('kolom kosong tetap di bawah walau arahnya dibalik', () => {
  const rows = [
    { name: 'kosong', followUp3: null },
    { name: 'lama', followUp3: '2026-01-05' },
    { name: 'baru', followUp3: '2026-08-20' },
  ];
  // Inti aturannya: lead yang belum pernah di-follow-up bukan "paling awal".
  assert.deepEqual(nama(sortLeads(rows, { field: 'followUp3', dir: 'asc' })), ['lama', 'baru', 'kosong']);
  assert.deepEqual(nama(sortLeads(rows, { field: 'followUp3', dir: 'desc' })), ['baru', 'lama', 'kosong']);
});

test('teks diurutkan tanpa peduli besar-kecil huruf', () => {
  const rows = [{ name: 'budi' }, { name: 'Ani' }, { name: 'Citra' }];
  assert.deepEqual(nama(sortLeads(rows, { field: 'name', dir: 'asc' })), ['Ani', 'budi', 'Citra']);
});

test('tanggal dibandingkan sebagai waktu, bukan panjang teks', () => {
  const a = { entryDate: '2026-09-01' };
  const b = { entryDate: '2026-10-01' };
  assert.ok(compareLeads(a, b, 'entryDate') < 0);
});

test('daftar aslinya tidak ikut berubah', () => {
  const rows = [{ name: 'b' }, { name: 'a' }];
  sortLeads(rows, { field: 'name', dir: 'asc' });
  assert.deepEqual(nama(rows), ['b', 'a']);
});
