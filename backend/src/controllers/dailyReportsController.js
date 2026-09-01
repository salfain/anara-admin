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
    // { "Korea": 2, "3 negara": 1 } - angka per paket, bukan teks yang diketik.
    breakdownCounts: row.breakdown_counts || {},
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

/** Hanya menerima objek berisi angka positif, dan membuang nilai nol. */
function bersihkanRincian(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return {};
  const keluar = {};
  for (const [label, nilai] of Object.entries(input)) {
    const n = Number(nilai);
    // Paket yang nol tidak perlu disimpan; ketiadaannya sudah berarti nol.
    if (Number.isFinite(n) && n > 0) keluar[String(label).trim()] = Math.trunc(n);
  }
  return keluar;
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

    // Dijaga di server juga: tanpa ini, permintaan langsung ke API masih bisa
    // membuat laporan atas nama admin.
    const pemilik = await pool.query(`SELECT role FROM users WHERE id = $1`, [userId]);
    if (pemilik.rows.length === 0) return res.status(404).json({ error: 'User tidak ditemukan' });
    if (pemilik.rows[0].role !== 'cs') {
      return res.status(400).json({ error: 'Laporan harian hanya untuk CS' });
    }

    const rincian = bersihkanRincian(req.body.breakdownCounts);

    const result = await pool.query(
      `INSERT INTO daily_reports
         (report_date, user_id, new_leads, janji_tf, total_closing, total_followup, breakdown_counts, notes, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (report_date, user_id) DO UPDATE SET
         new_leads = EXCLUDED.new_leads,
         janji_tf = EXCLUDED.janji_tf,
         total_closing = EXCLUDED.total_closing,
         total_followup = EXCLUDED.total_followup,
         breakdown_counts = EXCLUDED.breakdown_counts,
         notes = EXCLUDED.notes,
         updated_at = NOW()
       RETURNING *`,
      [
        reportDate,
        userId,
        // New Leads selalu jumlah rinciannya, supaya keduanya tidak mungkin
        // berbeda. Yang diisi admin cuma angka per paket.
        Object.values(rincian).reduce((a, b) => a + b, 0),
        // Sengaja boleh null: kosong berarti belum dihitung, bukan nol.
        req.body.janjiTf === '' || req.body.janjiTf === null || req.body.janjiTf === undefined
          ? null
          : angka(req.body.janjiTf),
        angka(req.body.totalClosing),
        angka(req.body.totalFollowup),
        JSON.stringify(rincian),
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

/**
 * Satu hari penuh: semua CS aktif sekaligus, lengkap dengan angka hitungan.
 *
 * Sebelumnya admin harus membuat baris satu per satu untuk tiap CS tiap hari.
 * Barisnya sekarang selalu ada, karena orangnya memang selalu ada. Yang
 * membedakan hanya sudah disimpan atau belum.
 *
 * Nilai hitungan tetap dikirim walau laporannya sudah tersimpan, supaya
 * selisihnya terlihat kalau angka yang dicatat berbeda dengan data lead.
 */
async function day(req, res, next) {
  try {
    const tanggal = req.query.date || new Date().toISOString().slice(0, 10);

    const [users, tersimpan, baru, closing, difollowup, perPaket, paketAktif] = await Promise.all([
      // Laporan harian adalah laporan CS. Admin dan role lain tidak punya
      // barisnya, jadi tidak muncul di sini.
      pool.query(`SELECT id, name FROM users WHERE status = 'active' AND role = 'cs' ORDER BY name ASC`),
      pool.query(`SELECT * FROM daily_reports WHERE report_date = $1::date`, [tanggal]),
      pool.query(
        `SELECT pic_user_id AS uid, COUNT(*)::int AS n FROM leads
         WHERE entry_date = $1::date AND pic_user_id IS NOT NULL GROUP BY 1`,
        [tanggal]
      ),
      pool.query(
        `SELECT pic_user_id AS uid, COUNT(*)::int AS n FROM leads
         WHERE won_at::date = $1::date AND pic_user_id IS NOT NULL GROUP BY 1`,
        [tanggal]
      ),
      pool.query(
        `SELECT pic_user_id AS uid, COUNT(*)::int AS n FROM leads
         WHERE $1::date IN (follow_up_1, follow_up_2, follow_up_3)
           AND pic_user_id IS NOT NULL GROUP BY 1`,
        [tanggal]
      ),
      pool.query(
        `SELECT l.pic_user_id AS uid, COALESCE(p.name, l.country, 'Belum ditentukan') AS label,
                COUNT(*)::int AS n
         FROM leads l LEFT JOIN packages p ON p.id = l.package_id
         WHERE l.entry_date = $1::date AND l.pic_user_id IS NOT NULL
         GROUP BY 1, 2 ORDER BY n DESC`,
        [tanggal]
      ),
      // Kolom rincian: daftar tujuan yang diatur tim, bukan diturunkan dari
      // nama paket yang panjang-panjang.
      pool.query('SELECT label FROM report_categories ORDER BY sort_order ASC, label ASC'),
    ]);

    const angkaPer = (rows) => new Map(rows.map((r) => [r.uid, r.n]));
    const nBaru = angkaPer(baru.rows);
    const nClosing = angkaPer(closing.rows);
    const nFollowup = angkaPer(difollowup.rows);
    const simpanPer = new Map(tersimpan.rows.map((r) => [r.user_id, r]));

    // Angka hitungan dikelompokkan menurut nama paket atau destinasi, sedangkan
    // kolomnya pakai label tim. Yang namanya sama dicocokkan; sisanya dibiarkan
    // kosong daripada ditebak dan salah taruh.
    const labelKolom = new Map(
      paketAktif.rows.map((p) => [p.label.trim().toLowerCase(), p.label])
    );
    const rincianPer = new Map();
    for (const r of perPaket.rows) {
      const cocok = labelKolom.get(String(r.label).trim().toLowerCase());
      if (!cocok) continue;
      if (!rincianPer.has(r.uid)) rincianPer.set(r.uid, {});
      rincianPer.get(r.uid)[cocok] = r.n;
    }

    const data = users.rows.map((u) => {
      const row = simpanPer.get(u.id);
      const hitung = {
        newLeads: nBaru.get(u.id) || 0,
        totalClosing: nClosing.get(u.id) || 0,
        totalFollowup: nFollowup.get(u.id) || 0,
        breakdownCounts: rincianPer.get(u.id) || {},
      };
      return {
        userId: u.id,
        picName: u.name,
        saved: row ? serialize(row) : null,
        computed: hitung,
      };
    });

    // Paket yang muncul di data hari itu atau di laporan tersimpan ikut jadi
    // kolom walau keberangkatannya sudah lewat, supaya angka yang sudah
    // tercatat tidak hilang dari tampilan.
    // Urutan daftar dipertahankan; label yang terlanjur punya angka tapi sudah
    // dihapus dari daftar tetap ditampilkan di belakang, supaya data yang
    // sudah tercatat tidak hilang dari layar.
    const kolom = paketAktif.rows.map((p) => p.label);
    const tambahan = new Set();
    for (const row of data) {
      Object.keys(row.saved?.breakdownCounts || {}).forEach((k) => {
        if (!kolom.includes(k)) tambahan.add(k);
      });
    }

    res.json({ data: { date: tanggal, packages: [...kolom, ...tambahan], rows: data } });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, save, remove, day };
