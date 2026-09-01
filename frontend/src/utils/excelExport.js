// Ekspor tabel ke Excel.
//
// xlsx berukuran besar, jadi dimuat saat tombolnya ditekan, bukan saat halaman
// dibuka. Pola yang sama sudah dipakai ekspor Leads.

/**
 * @param {string} namaSheet
 * @param {string[]} header
 * @param {Array<Array<string|number>>} baris
 * @param {number[]} [lebar] lebar kolom, dalam karakter
 */
export async function buatExcel(namaSheet, header, baris, lebar) {
  const XLSX = await import('xlsx');
  const ws = XLSX.utils.aoa_to_sheet([header, ...baris]);
  if (lebar) ws['!cols'] = lebar.map((wch) => ({ wch }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, namaSheet);
  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
}

export function unduhExcel(namaFile, buffer) {
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = namaFile;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Membangun berkas lalu langsung mengunduhnya. */
export async function eksporExcel({ namaFile, namaSheet, header, baris, lebar }) {
  unduhExcel(namaFile, await buatExcel(namaSheet, header, baris, lebar));
}

export function tanggalOnly(v) {
  return v ? String(v).slice(0, 10) : '';
}
