require('dotenv').config();
const fs = require('fs');
const path = require('path');
const app = require('./app');
const pool = require('./db/pool');

const PORT = process.env.PORT || 4000;

// Nilai contoh yang ikut ter-commit di .env.example. Kalau ini yang dipakai di
// server sungguhan, siapa pun yang membaca repo bisa menandatangani token
// admin palsu — password tidak perlu ditebak sama sekali.
const CONTOH_SECRET = 'change_this_to_a_long_random_secret';

/**
 * Menolak jalan dengan kunci penandatanganan yang lemah.
 *
 * Kegagalan seperti ini tidak terlihat dari luar: aplikasinya jalan normal,
 * semua fitur bekerja, dan tidak ada yang menandakan bahwa siapa pun bisa
 * memalsukan sesi admin. Karena itu diperiksa saat start, bukan dibiarkan
 * menunggu ada yang sadar.
 */
function checkJwtSecret() {
  const secret = process.env.JWT_SECRET || '';
  const masalah =
    !secret ? 'JWT_SECRET belum diisi.'
    : secret === CONTOH_SECRET ? 'JWT_SECRET masih memakai nilai contoh dari .env.example, yang ada di dalam repo.'
    : secret.length < 32 ? `JWT_SECRET hanya ${secret.length} karakter — terlalu pendek untuk dipakai.`
    : null;

  if (!masalah) return;

  console.error(`\n[FATAL] ${masalah}`);
  console.error('Dengan kunci ini, token admin bisa dipalsukan tanpa perlu password.');
  console.error('\nBuat kunci baru dengan perintah ini, lalu simpan di .env:');
  console.error('  node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'base64url\'))"');
  console.error('\nSemua sesi yang sedang berjalan akan berakhir — semua orang perlu login ulang.\n');
  process.exit(1);
}

// Template follow-up penuh emoji. Di database non-UTF8 karakter seperti itu
// rusak diam-diam saat disimpan, dan baru ketahuan setelah pesannya terkirim
// ke customer. Lebih baik berisik sekarang.
async function checkEncoding() {
  try {
    const { rows } = await pool.query('SHOW server_encoding');
    const encoding = rows[0].server_encoding;
    if (encoding !== 'UTF8') {
      console.warn(
        `\n[PERINGATAN] Encoding database adalah ${encoding}, bukan UTF8.\n` +
        `Emoji dan karakter non-ASCII pada template follow-up bisa rusak.\n` +
        `Perbaiki dengan membuat ulang database ber-encoding UTF8, lalu restore datanya.\n`
      );
    }
  } catch {
    // Kalau database belum siap, error koneksi akan muncul dari migrasi.
  }
}

/**
 * Menyamakan skema database dengan schema.sql sebelum melayani permintaan.
 *
 * Sebelumnya ini langkah manual, dan sekali terlewat aplikasinya langsung rusak
 * dengan pesan yang tidak menjelaskan apa-apa ("Gagal memuat data lead") —
 * penyebabnya kolom baru yang belum ada. Berkas skemanya ditulis idempoten
 * (IF NOT EXISTS, seed yang berpenjaga), jadi aman dijalankan tiap start.
 *
 * Berhenti kalau gagal, bukan tetap jalan: server yang menyala dengan skema
 * yang salah hanya memindahkan kegagalan ke tempat yang lebih sulit dibaca.
 */
async function migrate() {
  if (process.env.AUTO_MIGRATE === 'false') {
    console.log('AUTO_MIGRATE=false — melewati migrasi otomatis.');
    return;
  }
  const schema = fs.readFileSync(path.join(__dirname, 'db', 'schema.sql'), 'utf8');
  await pool.query(schema);
  console.log('Skema database sudah sesuai.');
}

checkJwtSecret();

migrate()
  .then(async () => {
    await checkEncoding();
    app.listen(PORT, () => {
      console.log(`Anara Quick Replies API running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('\n[FATAL] Migrasi database gagal, server tidak dijalankan.');
    // Kegagalan koneksi datang sebagai AggregateError yang message-nya kosong,
    // jadi kode dan error di dalamnya ikut dicetak.
    const detail = err.message || err.errors?.[0]?.message || String(err);
    console.error(err.code ? `${err.code}: ${detail}` : detail);
    console.error('\nPeriksa DATABASE_URL dan hak akses usernya, lalu jalankan ulang.\n');
    process.exit(1);
  });
