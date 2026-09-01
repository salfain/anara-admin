import test from 'node:test';
import assert from 'node:assert';
import { badgeCounts } from '../src/utils/followUpBadge.js';

test('yang pegang lead melihat antreannya sendiri', () => {
  const b = badgeCounts({ due: 12, overdue: 4, mineDue: 3, mineOverdue: 1, mineTotal: 5 });
  assert.deepEqual(b, { due: 3, overdue: 1, personal: true });
});

test('yang tidak pegang lead melihat angka tim', () => {
  // Manajer yang tidak jadi PIC siapa pun tetap harus melihat antrean tim,
  // kalau tidak lencananya hilang justru bagi yang perlu mengawasi.
  const b = badgeCounts({ due: 12, overdue: 4, mineDue: 0, mineOverdue: 0, mineTotal: 0 });
  assert.deepEqual(b, { due: 12, overdue: 4, personal: false });
});

test('punya lead tapi semuanya beres berarti tidak ada lencana', () => {
  // Bedanya dengan kasus di atas: ini "sudah selesai", bukan "bukan urusanku",
  // jadi angka tim tidak boleh menggantikannya.
  const b = badgeCounts({ due: 12, overdue: 4, mineDue: 0, mineOverdue: 0, mineTotal: 7 });
  assert.deepEqual(b, { due: 0, overdue: 0, personal: true });
});

test('tanpa data sama sekali tidak meledak', () => {
  assert.deepEqual(badgeCounts(), { due: 0, overdue: 0, personal: false });
  assert.deepEqual(badgeCounts({}), { due: 0, overdue: 0, personal: false });
});
