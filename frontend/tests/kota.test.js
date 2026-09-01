import test from 'node:test';
import assert from 'node:assert';
import { KOTA, opsiKota } from '../src/utils/kota.js';

test('daftar kotanya lengkap sesuai rute yang dilayani', () => {
  assert.equal(KOTA.length, 12);
  for (const kota of ['Jakarta', 'Makassar', 'Lombok', 'Aceh']) {
    assert.ok(KOTA.includes(kota), `${kota} harus ada`);
  }
});

test('pilihan selalu diawali opsi kosong', () => {
  // Peserta yang kotanya belum ditentukan harus bisa dikosongkan lagi.
  assert.equal(opsiKota('')[0], '');
  assert.equal(opsiKota(null)[0], '');
});

test('kota yang sudah tersimpan tapi di luar daftar tetap dipertahankan', () => {
  // Data lama memakai ejaan lain. Kalau hilang dari pilihan, menyunting kolom
  // lain di baris itu akan diam-diam menghapusnya.
  const opsi = opsiKota('Banjarmasin');
  assert.ok(opsi.includes('Banjarmasin'));
  assert.equal(opsi[1], 'Banjarmasin', 'muncul paling atas supaya terlihat');
});

test('ejaan berbeda tidak digandakan', () => {
  // "JAKARTA" dan "Jakarta" orang yang sama; jangan tampil dua kali.
  const opsi = opsiKota('JAKARTA');
  assert.equal(opsi.filter((k) => k.toLowerCase() === 'jakarta').length, 1);
});
