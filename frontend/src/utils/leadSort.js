// Pengurutan tabel lead.

const DATE_FIELDS = new Set(['entryDate', 'followUp1', 'followUp2', 'followUp3']);

// Status punya urutan alami dari lead baru sampai selesai. Mengurutkannya
// menurut abjad ("Baru, Batal, Nego, Proses, Sudah DP") tidak berarti apa-apa.
export const STATUS_ORDER = ['Baru', 'Proses', 'Nego', 'Sudah DP', 'Batal'];

export function compareLeads(a, b, field) {
  if (field === 'status') {
    return STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status);
  }
  const av = a[field];
  const bv = b[field];
  if (!av && !bv) return 0;
  if (!av) return 1;
  if (!bv) return -1;
  // Tanggal sudah berformat YYYY-MM-DD, jadi urutan teks = urutan waktu.
  if (DATE_FIELDS.has(field)) return String(av).localeCompare(String(bv));
  return String(av).localeCompare(String(bv), 'id', { sensitivity: 'base' });
}

/**
 * Baris yang kolomnya kosong selalu di bawah, ke arah mana pun diurutkan.
 * Kalau ikut dibalik, mengurutkan FU 3 dari terbaru justru menaruh lead yang
 * belum pernah di-follow-up di paling atas — persis kebalikan dari yang dicari.
 */
export function sortLeads(leads, { field, dir }) {
  if (!field) return leads;
  const arah = dir === 'asc' ? 1 : -1;
  return [...leads].sort((a, b) => {
    const hasil = compareLeads(a, b, field);
    const adaYangKosong = field !== 'status' && (!a[field] || !b[field]);
    return adaYangKosong ? hasil : hasil * arah;
  });
}
