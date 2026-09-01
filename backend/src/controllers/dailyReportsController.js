const pool = require('../db/pool');
const { logActivity } = require('./activityController');

function serialize(row) {
  return {
    id: row.id,
    reportDate: row.report_date,
    userId: row.user_id,
    picName: row.pic_name || null,
    newLeads: row.new_leads,
    janjiTf: row.janji_tf,
    totalClosing: row.total_closing,
    totalFollowup: row.total_followup,
    breakdown: row.breakdown,
    notes: row.notes,
  };
}

/**
 * Laporan tersimpan, terbaru di depan.
 *
 * Disaring per bulan supaya halaman tidak memuat seluruh riwayat sejak awal.
 */
async function list(req, res, next) {
  try {
    const params = [];
    const where = [];

    if (req.query.month) {
      params.push(`${req.query.month}-01`);
      where.push(`date_trunc('month', r.report_date) = date_trunc('month', $${params.length}::date)`);
    }
    if (req.query.userId) {
      params.push(req.query.userId);
      where.push(`r.user_id = $${params.length}`);
    }

    const result = await pool.query(
      `SELECT r.*, u.name AS pic_name
       FROM daily_reports r
       JOIN users u ON u.id = r.user_id
       ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
       ORDER BY r.report_date DESC, u.name ASC`,
      params
    );
    res.json({ data: result.rows.map(serialize) });
  } catch (err) {
    next(err);
  }
}

function angka(v, bawaan = 0) {
  if (v === '' || v === null || v === undefined) return bawaan;
  const n = Number(v);
  return Number.isFinite(n) ? n : bawaan;
}

/**
 * Membuat atau memperbarui laporan satu orang untuk satu tanggal.
 *
 * Memakai upsert, bukan menolak yang sudah ada, karena admin memang akan
 * membuka laporan kemarin dan membetulkan angkanya.
 */
async function save(req, res, next) {
  try {
    const { reportDate, userId } = req.body;
    if (!reportDate) return res.status(400).json({ error: 'Tanggal laporan wajib diisi' });
    if (!userId) return res.status(400).json({ error: 'CS wajib dipilih' });

    const result = await pool.query(
      `INSERT INTO daily_reports
         (report_date, user_id, new_leads, janji_tf, total_closing, total_followup, breakdown, notes, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (report_date, user_id) DO UPDATE SET
         new_leads = EXCLUDED.new_leads,
         janji_tf = EXCLUDED.janji_tf,
         total_closing = EXCLUDED.total_closing,
         total_followup = EXCLUDED.total_followup,
         breakdown = EXCLUDED.breakdown,
         notes = EXCLUDED.notes,
         updated_at = NOW()
       RETURNING *`,
      [
        reportDate,
        userId,
        angka(req.body.newLeads),
        // Sengaja boleh null: kosong berarti belum dihitung, bukan nol.
        req.body.janjiTf === '' || req.body.janjiTf === null || req.body.janjiTf === undefined
          ? null
          : angka(req.body.janjiTf),
        angka(req.body.totalClosing),
        angka(req.body.totalFollowup),
        req.body.breakdown || null,
        req.body.notes || null,
        req.user.id,
      ]
    );

    const withName = await pool.query(
      `SELECT r.*, u.name AS pic_name FROM daily_reports r
       JOIN users u ON u.id = r.user_id WHERE r.id = $1`,
      [result.rows[0].id]
    );
    await logActivity(req.user.id, 'update', 'daily_report', result.rows[0].id, `laporan harian ${reportDate}`);
    res.json({ data: serialize(withName.rows[0]) });
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const result = await pool.query('DELETE FROM daily_reports WHERE id = $1 RETURNING report_date', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Laporan tidak ditemukan' });
    await logActivity(req.user.id, 'delete', 'daily_report', req.params.id, `hapus laporan ${result.rows[0].report_date}`);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = { list, save, remove };
