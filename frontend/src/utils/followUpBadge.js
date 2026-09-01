/**
 * Angka mana yang pantas ditampilkan sebagai lencana follow-up.
 *
 * Yang pegang lead melihat antreannya sendiri — itu yang bisa dia kerjakan.
 * Yang tidak pegang lead sama sekali (manajer, admin) melihat angka tim, kalau
 * tidak lencananya justru hilang bagi orang yang perlu mengawasi.
 *
 * Sengaja fungsi biasa, bukan selector zustand: v5 membandingkan hasil selector
 * dengan Object.is, jadi mengembalikan objek baru tiap render memicu render
 * tanpa henti. Komponen memilih angkanya satu per satu, lalu memanggil ini.
 */
export function badgeCounts({ due = 0, overdue = 0, mineDue = 0, mineOverdue = 0, mineTotal = 0 } = {}) {
  return mineTotal > 0
    ? { due: mineDue, overdue: mineOverdue, personal: true }
    : { due, overdue, personal: false };
}

export default badgeCounts;
