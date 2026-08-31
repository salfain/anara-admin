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
 * Tautan ke chat-nya saja, TANPA parameter ?text=.
 *
 * Pesannya sengaja tidak dititipkan lewat URL: emoji rusak jadi "�" di sisi
 * WhatsApp meski percent-encoding-nya benar (%F0%9F%98%8A). Terbukti dengan
 * membandingkan — teks yang sama, ditempel dari clipboard, sampai utuh.
 * Template follow-up penuh emoji, jadi jalur itu tidak bisa dipakai.
 * Pesannya disalin ke clipboard, lalu ditempel di kotak chat.
 */
export function waLink(number) {
  const to = toWaNumber(number);
  if (!to) return null;
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
