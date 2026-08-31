/**
 * Nomor di kolom WhatsApp diketik bebas — ada yang "0812...", "+62 812-...",
 * atau "62812...". wa.me hanya menerima digit dengan kode negara di depan.
 *
 * Awalan 0 diasumsikan nomor Indonesia dan diganti 62. Nomor luar negeri yang
 * sudah ditulis dengan kode negaranya diteruskan apa adanya.
 */
export function toWaNumber(raw) {
  const digits = String(raw || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('0')) return `62${digits.slice(1)}`;
  return digits;
}

/**
 * Bisakah pesan dititipkan lewat ?text= di perangkat ini?
 *
 * Di ponsel bisa: tautannya diserahkan ke aplikasi lewat intent, dan emoji
 * sampai utuh. Di Windows tidak: wa.me menyerahkannya ke WhatsApp Desktop
 * lewat protocol handler, dan setiap emoji berubah jadi "�" walaupun
 * percent-encoding-nya benar (%F0%9F%98%8A). Teks yang sama, ditempel dari
 * clipboard, sampai utuh — jadi yang rusak penyerahannya, bukan encoding-nya.
 *
 * Menebak lewat user agent memang rapuh, tapi taruhannya timpang: salah
 * menebak desktop cuma menambah satu kali tempel, sedangkan salah menebak
 * ponsel mengembalikan emoji yang rusak.
 */
export function supportsTextPrefill() {
  if (typeof navigator === 'undefined') return false;
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || '');
}

/** Pesan hanya ikut di URL kalau perangkatnya menyerahkannya dengan utuh. */
export function waLink(number, message) {
  const to = toWaNumber(number);
  if (!to) return null;
  if (message && supportsTextPrefill()) {
    return `https://wa.me/${to}?text=${encodeURIComponent(message)}`;
  }
  return `https://wa.me/${to}`;
}

/**
 * Isi placeholder yang memang kita tahu nilainya. Sisanya — [Nama], [Tanggal],
 * dan kawan-kawan — sengaja dibiarkan supaya CS mengisinya sendiri sebelum
 * kirim, bukan diam-diam ditebak aplikasi.
 */
export function fillPlaceholders(text, { csName, leadName, destination, packageName, packageDates, packagePrice } = {}) {
  let out = String(text || '');
  const sub = (pattern, value) => {
    if (value !== undefined && value !== null && value !== '') out = out.replace(pattern, value);
  };
  // [Nama CS] harus diganti sebelum [Nama], kalau tidak pola yang lebih pendek
  // akan memakan awalannya dan menyisakan " CS]".
  sub(/\[Nama CS\]/gi, csName);
  sub(/\[Nama Paket\]|\[Paket\]/gi, packageName);
  sub(/\[Nama\]/gi, leadName);
  sub(/\[Tanggal Keberangkatan\]/gi, packageDates);
  sub(/\[Harga All-In\]/gi, formatPrice(packagePrice));
  sub(/\[Destinasi\]|\[Negara\]/gi, destination);
  return out;
}

/** Template menulis "Rp[Harga All-In]", jadi yang disisipkan cukup angkanya. */
export function formatPrice(value) {
  if (value === undefined || value === null || value === '') return '';
  const n = Number(value);
  if (Number.isNaN(n)) return '';
  return new Intl.NumberFormat('id-ID').format(n);
}

/** Semua pesan yang bisa dikirim dari satu template, sudah diratakan. */
export function templateSnippets(template) {
  if (template.kind === 'steps') {
    return (template.steps || []).map((text, i) => ({
      id: `${template.id}-s${i}`,
      label: `Langkah ${i + 1}`,
      text,
    }));
  }
  if (template.kind === 'variants') {
    return (template.variants || []).map((v, i) => ({
      id: `${template.id}-v${i}`,
      label: v.label,
      text: v.text,
    }));
  }
  return template.text ? [{ id: `${template.id}-t`, label: 'Pesan', text: template.text }] : [];
}
