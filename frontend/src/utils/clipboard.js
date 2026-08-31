/**
 * Menyalin teks, termasuk di halaman yang diakses lewat http://.
 *
 * navigator.clipboard hanya ada di secure context — HTTPS atau localhost.
 * Aplikasi ini dilayani lewat HTTP biasa, jadi di sana API itu `undefined`
 * dan setiap tombol Salin gagal diam-diam. document.execCommand('copy') sudah
 * usang tapi masih jalan di semua browser dan tidak butuh secure context,
 * jadi dipakai sebagai cadangan.
 *
 * Jalur cadangannya sinkron, supaya masih terhitung bagian dari klik yang
 * sedang berjalan — browser menolak penyalinan yang tidak dipicu pengguna.
 */
function legacyCopy(text) {
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    // Di luar layar, tapi tetap fokusable — dan `fixed` mencegah halaman
    // melompat saat elemennya dipilih.
    ta.style.position = 'fixed';
    ta.style.top = '-1000px';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    ta.setSelectionRange(0, ta.value.length);
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

/** @returns {Promise<boolean>} berhasil atau tidak — pemanggil yang memberi tahu pengguna. */
export function copyText(text) {
  if (navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard
      .writeText(text)
      .then(() => true)
      .catch(() => legacyCopy(text));
  }
  return Promise.resolve(legacyCopy(text));
}

export default copyText;
