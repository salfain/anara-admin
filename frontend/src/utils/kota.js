// Kota keberangkatan dan kepulangan yang dilayani.
//
// Start dan finish bisa berbeda: ada peserta yang berangkat dari Jakarta dan
// pulang ke Makassar, jadi keduanya dipilih terpisah.
export const KOTA = [
  'Jakarta',
  'Pekanbaru',
  'Medan',
  'Padang',
  'Surabaya',
  'Aceh',
  'Balikpapan',
  'Palembang',
  'Bali',
  'Lombok',
  'Jogja',
  'Makassar',
];

/**
 * Pilihan untuk satu sel, dengan nilai yang sudah tersimpan ikut dipertahankan.
 *
 * Data lama memakai ejaan lain ("MAKASAR", "JAKARTA") dan kota yang belum ada
 * di daftar. Kalau tidak ikut dimasukkan, menyunting kolom lain di baris itu
 * akan diam-diam menghapus isinya.
 */
export function opsiKota(nilaiSekarang) {
  const ada = KOTA.some((k) => k.toLowerCase() === String(nilaiSekarang || '').toLowerCase());
  const tambahan = nilaiSekarang && !ada ? [nilaiSekarang] : [];
  return ['', ...tambahan, ...KOTA];
}

export default KOTA;
