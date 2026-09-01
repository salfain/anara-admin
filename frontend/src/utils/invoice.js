// Data tetap yang tercetak di setiap invoice.
//
// Ditulis di kode, bukan disimpan di database: alamat dan rekening perusahaan
// berubah sangat jarang, dan menaruhnya di pengaturan berarti satu halaman lagi
// yang harus diisi sebelum invoice pertama bisa dibuat.
export const PERUSAHAAN = {
  nama: 'ANARA EXPLORE',
  alamat: [
    'Jl. Boulevard Raya, Boston Square',
    'RK. 2/25, Kota Wisata Cibubur, Kec. Gn. Putri Bogor',
    'Jawa Barat Kode Pos. 16968',
  ],
  telepon: '(+62)812-8323-7188',
  email: 'anara.explore@gmail.com',
};

export const REKENING = [
  'BRI : 151001000144567',
  'A.n PT. NANDINI ANARA DHESA LOKA',
];

export const CATATAN_BAWAAN = [
  'WAJIB MEMBACA INVOICE !',
  '- Segera konfirmasi jika ada kesalahan atau kekeliruan',
  '- Jika tidak ada konfirmasi apapun dinyatakan setuju/sudah benar!',
  '- Konfirmasi selambat-lambatnya 1 jam setelah invoice kami kirimkan',
  '———',
  '- Dp 500.000',
  '- Tiket Low Season 3 Juta dan Tiket High Season 4 Juta (Jakarta, Pekanbaru, Medan, Padang)',
  '- Tiket Low Season 3,5 Juta dan Tiket High Season 4,75 Juta (Makassar, Surabaya, Jogja, Aceh, Bali)',
  '- Pembayaran sampai ke tahap Tiket paling lambat H - 50 Keberangkatan untuk mendapatkan harga tiket normal. Apabila pembayaran telat dilakukan melewati tanggal yang telah ditentukan maka kenaikan tiket diluar tanggung jawab kami',
  '- jika customer cancel maka uang tidak dapat di kembalikan dan tidak dapat di gantikan oleh orang lain',
].join('\n');

/** "Rp7,596,000" seperti di invoice cetak: koma sebagai pemisah ribuan. */
export function rupiah(n) {
  const angka = Number(n) || 0;
  const bulat = Math.round(angka * 100) / 100;
  return `Rp${bulat.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
}

/** "31 August 2026", mengikuti format tanggal di invoice cetak. */
export function tanggalPanjang(v) {
  if (!v) return '';
  return new Date(v).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

/** "09/11/2026" untuk tanggal pembayaran. */
export function tanggalPendek(v) {
  if (!v) return '';
  const d = new Date(v);
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
}
