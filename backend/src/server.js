require('dotenv').config();
const app = require('./app');
const pool = require('./db/pool');

const PORT = process.env.PORT || 4000;

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
    // Kalau database belum siap, biarkan — error koneksi akan muncul sendiri.
  }
}

app.listen(PORT, () => {
  console.log(`Anara Quick Replies API running on port ${PORT}`);
  checkEncoding();
});
