// Logika di balik pengingat follow-up dan tombol kirim WhatsApp. Semuanya
// fungsi murni, jadi bisa diuji tanpa merender apa pun.
//
//   cd frontend && npm test

import test from 'node:test';
import assert from 'node:assert';

import { toWaNumber, waLink, fillPlaceholders, templateSnippets } from '../src/utils/whatsapp.js';
import { withFollowUpToday, willShiftFollowUps, followUpState } from '../src/utils/followUp.js';

const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
};

test('nomor yang diketik bebas dirapikan untuk wa.me', () => {
  assert.equal(toWaNumber('08123456789'), '628123456789');
  assert.equal(toWaNumber('+62 812-3456-789'), '628123456789');
  assert.equal(toWaNumber('628123456789'), '628123456789');
  // Nomor luar negeri yang sudah membawa kode negaranya jangan diutak-atik.
  assert.equal(toWaNumber('821012345678'), '821012345678');
  assert.equal(toWaNumber('  -- '), '');
});

test('tautan hanya dibuat kalau nomornya masuk akal', () => {
  assert.equal(waLink('abc', 'hai'), null);
  assert.equal(waLink('08123', 'Halo Kak'), 'https://wa.me/628123?text=Halo%20Kak');
});

test('hanya placeholder yang nilainya kita tahu yang diisi', () => {
  const filled = fillPlaceholders('Saya [Nama CS], halo [Nama]', { csName: 'Dita' });
  assert.equal(filled, 'Saya Dita, halo [Nama]');
});

test('tiap langkah dan varian jadi pesan tersendiri', () => {
  assert.deepEqual(
    templateSnippets({ id: 1, kind: 'steps', steps: ['a', 'b'] }).map((s) => s.label),
    ['Langkah 1', 'Langkah 2']
  );
  assert.deepEqual(
    templateSnippets({ id: 2, kind: 'variants', variants: [{ label: 'Halus', text: 'x' }] }).map((s) => s.label),
    ['Halus']
  );
  assert.equal(templateSnippets({ id: 3, kind: 'text', text: 'hai' }).length, 1);
});

test('follow-up dicatat di slot kosong berikutnya', () => {
  assert.equal(withFollowUpToday({}, '2026-09-01').followUp1, '2026-09-01');
  assert.equal(withFollowUpToday({ followUp1: '2026-08-01' }, '2026-09-01').followUp2, '2026-09-01');
});

test('kalau ketiga slot penuh, yang tertua yang keluar', () => {
  const full = { followUp1: '2026-06-01', followUp2: '2026-07-01', followUp3: '2026-08-01' };
  assert.equal(willShiftFollowUps(full), true);
  const after = withFollowUpToday(full, '2026-09-01');
  assert.deepEqual(
    [after.followUp1, after.followUp2, after.followUp3],
    ['2026-07-01', '2026-08-01', '2026-09-01']
  );
});

test('ambang pengingat: dua hari aman, tiga hari tidak', () => {
  assert.equal(followUpState({ status: 'Baru', entryDate: daysAgo(2) }), 'ok');
  assert.equal(followUpState({ status: 'Baru', entryDate: daysAgo(3) }), 'due');
  assert.equal(followUpState({ status: 'Nego', entryDate: daysAgo(30), followUp1: daysAgo(9) }), 'overdue');
});

test('lead yang sudah selesai tidak pernah dikejar', () => {
  assert.equal(followUpState({ status: 'Sudah DP', entryDate: daysAgo(99) }), 'closed');
  assert.equal(followUpState({ status: 'Batal', entryDate: daysAgo(99) }), 'closed');
});

test('mencatat follow-up mengeluarkan lead dari daftar pengingat', () => {
  // Inti dari fitur ini: kalau mencatat tidak menenangkan pengingatnya, angka
  // di Dashboard jadi bohong dan orang berhenti mempercayainya.
  const stale = { status: 'Nego', entryDate: daysAgo(30), followUp1: daysAgo(9) };
  assert.equal(followUpState(stale), 'overdue');
  assert.equal(followUpState({ ...stale, ...withFollowUpToday(stale, daysAgo(0)) }), 'ok');
});

test('pesan follow-up terisi dari data lead dan paketnya', () => {
  const template =
    'Kak [Nama], kuota paket [Paket] keberangkatan [Tanggal Keberangkatan] tinggal terbatas ' +
    '(all-in Rp[Harga All-In]).\n\n[Nama CS] — Anara Explore';

  const filled = fillPlaceholders(template, {
    csName: 'Dita',
    leadName: 'Ibu Sari',
    packageName: 'Korea Autumn 2026',
    packageDates: '12-19 Okt 2026',
    packagePrice: 18500000,
  });

  assert.match(filled, /Kak Ibu Sari/);
  assert.match(filled, /paket Korea Autumn 2026/);
  assert.match(filled, /keberangkatan 12-19 Okt 2026/);
  assert.match(filled, /Rp18\.500\.000/);
  assert.match(filled, /Dita — Anara Explore/);
  assert.doesNotMatch(filled, /\[/, 'tidak boleh ada placeholder tersisa');
});

test('[Nama CS] diganti sebelum [Nama], bukan sesudahnya', () => {
  // Pola yang lebih pendek akan memakan awalannya dan menyisakan " CS]".
  const filled = fillPlaceholders('[Nama CS] menyapa [Nama]', { csName: 'Dita', leadName: 'Sari' });
  assert.equal(filled, 'Dita menyapa Sari');
});

test('placeholder yang datanya belum ada tetap dibiarkan utuh', () => {
  const filled = fillPlaceholders('Kak [Nama], paket [Paket]', { csName: 'Dita' });
  assert.equal(filled, 'Kak [Nama], paket [Paket]');
});
