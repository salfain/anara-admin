import test from 'node:test';
import assert from 'node:assert';
import { susunLaporan } from '../src/utils/dailyReport.js';

const contoh = {
  date: '2026-08-28',
  picName: 'Alvin',
  newLeads: 3,
  byPackage: [
    { label: '3 negara', count: 2 },
    { label: 'Korea', count: 1 },
  ],
  closing: 1,
  followedUp: 22,
};

test('formatnya sama persis dengan yang dipakai di grup', () => {
  const teks = susunLaporan({ data: contoh, janjiTf: '2' });
  assert.equal(
    teks,
    [
      'Daily Report Cs [Alvin]',
      '28/08/26',
      '',
      '\u270D\uFE0FNew Leads : 3',
      '\u2022 3 negara = 2',
      '\u2022 Korea = 1',
      '\u270D\uFE0FJanji TF = 2',
      '\u270D\uFE0FTotal Closing = 1',
      '\u270D\uFE0FTotal Nomor yang di Follow up = 22',
      '\u2014',
      'Noted :',
      '*WAJIB LAPOR JAM 17.00-17.30',
      '*CLOSING DIATAS 17.30 MASUK KE LAPORAN HARI BERIKUTNYA',
    ].join('\n')
  );
});

test('tanggalnya dua digit dan tahunnya dua angka', () => {
  const teks = susunLaporan({ data: { ...contoh, date: '2026-01-05' }, janjiTf: '' });
  assert.ok(teks.includes('05/01/26'));
});

test('Janji TF dibiarkan kosong kalau belum diisi', () => {
  // Menulis 0 akan terbaca sebagai "tidak ada yang janji transfer", padahal
  // yang benar adalah belum dihitung.
  const teks = susunLaporan({ data: contoh, janjiTf: '' });
  assert.ok(teks.includes('Janji TF ='));
  assert.ok(!teks.includes('Janji TF = 0'));
});

test('hari tanpa lead baru tetap menghasilkan laporan', () => {
  const teks = susunLaporan({
    data: { ...contoh, newLeads: 0, byPackage: [], closing: 0, followedUp: 0 },
    janjiTf: '',
  });
  assert.ok(teks.includes('New Leads : 0'));
  assert.ok(teks.includes('Total Closing = 0'));
});
