/**
 * Membatasi percobaan login yang gagal per akun.
 *
 * Tanpa ini, /auth/login menerima tebakan password tanpa batas. bcrypt memang
 * lambat, tapi lambat bukan berarti aman — dibiarkan berjalan semalaman, itu
 * tetap ribuan tebakan.
 *
 * Dihitung per email, bukan per IP. Aplikasinya berada di belakang reverse
 * proxy, jadi semua permintaan tampak datang dari alamat yang sama; membatasi
 * per IP akan mengunci seluruh tim begitu satu orang salah ketik berkali-kali.
 * Konsekuensinya penyerang yang mencoba banyak email berbeda tidak tertahan —
 * yang dijaga di sini adalah menebak password satu akun.
 *
 * Catatannya disimpan di memori proses: hilang saat restart, dan tidak
 * dibagikan kalau nanti backend-nya lebih dari satu. Untuk satu instance ini
 * sudah memadai, dan tidak menambah dependensi.
 */

const MAX_ATTEMPTS = 10;
const WINDOW_MS = 15 * 60 * 1000;

const attempts = new Map(); // email -> { count, firstAt }

function keyOf(req) {
  return String(req.body?.email || '').trim().toLowerCase();
}

function limitLogin(req, res, next) {
  const key = keyOf(req);
  if (!key) return next();

  const entry = attempts.get(key);
  if (entry && Date.now() - entry.firstAt > WINDOW_MS) {
    attempts.delete(key);
  } else if (entry && entry.count >= MAX_ATTEMPTS) {
    const menit = Math.ceil((WINDOW_MS - (Date.now() - entry.firstAt)) / 60000);
    return res.status(429).json({
      error: `Terlalu banyak percobaan login. Coba lagi dalam ${menit} menit.`,
    });
  }
  next();
}

function recordFailedLogin(email) {
  const key = String(email || '').trim().toLowerCase();
  if (!key) return;
  const entry = attempts.get(key);
  if (entry && Date.now() - entry.firstAt <= WINDOW_MS) {
    entry.count += 1;
  } else {
    attempts.set(key, { count: 1, firstAt: Date.now() });
  }
}

function clearLoginAttempts(email) {
  attempts.delete(String(email || '').trim().toLowerCase());
}

module.exports = { limitLogin, recordFailedLogin, clearLoginAttempts, MAX_ATTEMPTS };
