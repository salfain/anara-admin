function notFound(req, res) {
  res.status(404).json({ error: 'Route not found' });
}

/**
 * Pesan untuk pengguna, detail untuk log.
 *
 * Sebelumnya err.message ikut dikirim ke klien apa adanya, termasuk untuk
 * error tak terduga — saat migrasi terlewat, yang sampai ke browser adalah
 * "column l.pic_user_id does not exist". Itu membocorkan bentuk database ke
 * siapa pun yang bisa memicu error, dan tetap tidak berguna bagi yang membaca.
 *
 * Error yang memang disengaja (punya .status, mis. 400 dari validasi) tetap
 * dikirim utuh — itu memang ditulis untuk dibaca pengguna.
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const status = err.status || 500;

  if (status >= 500) {
    // Metode dan path ikut dicatat, karena pesan generik di sisi klien tidak
    // lagi bisa dipakai untuk menelusuri.
    console.error(`[${req.method} ${req.originalUrl}]`, err);
    return res.status(status).json({ error: 'Terjadi kesalahan di server. Coba lagi sebentar lagi.' });
  }

  console.warn(`[${req.method} ${req.originalUrl}] ${status}: ${err.message}`);
  res.status(status).json({ error: err.message || 'Permintaan tidak valid' });
}

module.exports = { notFound, errorHandler };
