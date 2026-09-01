const pool = require('../db/pool');

function dateRangeClause(startDate, endDate, column, params) {
  const conditions = [];
  if (startDate) {
    params.push(startDate);
    conditions.push(`${column} >= $${params.length}`);
  }
  if (endDate) {
    params.push(endDate);
    conditions.push(`${column} <= $${params.length}`);
  }
  return conditions;
}

async function summary(req, res, next) {
  try {
    const totalReplies = await pool.query('SELECT COUNT(*) FROM quick_replies');
    const totalUsage = await pool.query('SELECT COALESCE(SUM(usage_count), 0) AS total FROM quick_replies');
    const activeUsers = await pool.query(
      `SELECT COUNT(DISTINCT used_by) FROM usage_log WHERE used_at >= NOW() - INTERVAL '30 days'`
    );
    res.json({
      data: {
        totalReplies: parseInt(totalReplies.rows[0].count, 10),
        totalUsage: parseInt(totalUsage.rows[0].total, 10),
        activeUsers: parseInt(activeUsers.rows[0].count, 10),
      },
    });
  } catch (err) {
    next(err);
  }
}

async function topQuestions(req, res, next) {
  try {
    const { start_date, end_date, limit = 10 } = req.query;
    const params = [];
    const conditions = dateRangeClause(start_date, end_date, 'qr.created_at', params);
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    params.push(Math.min(parseInt(limit, 10) || 10, 50));
    const result = await pool.query(
      `SELECT qr.id, qr.question, qr.usage_count, qr.category
       FROM quick_replies qr
       ${where}
       ORDER BY qr.usage_count DESC
       LIMIT $${params.length}`,
      params
    );
    res.json({ data: result.rows });
  } catch (err) {
    next(err);
  }
}

async function categories(req, res, next) {
  try {
    const { start_date, end_date } = req.query;
    const params = [];
    const conditions = dateRangeClause(start_date, end_date, 'created_at', params);
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await pool.query(
      `SELECT
         COALESCE(category, 'Uncategorized') AS category,
         COUNT(*) AS replies,
         COALESCE(SUM(usage_count), 0) AS total_usage
       FROM quick_replies
       ${where}
       GROUP BY category
       ORDER BY total_usage DESC`,
      params
    );

    const grandTotal = result.rows.reduce((sum, row) => sum + parseInt(row.total_usage, 10), 0);
    const data = result.rows.map((row) => ({
      category: row.category,
      replies: parseInt(row.replies, 10),
      totalUsage: parseInt(row.total_usage, 10),
      percentOfTotal: grandTotal ? Math.round((parseInt(row.total_usage, 10) / grandTotal) * 1000) / 10 : 0,
    }));

    res.json({ data });
  } catch (err) {
    next(err);
  }
}

async function usageTrend(req, res, next) {
  try {
    const { start_date, end_date, granularity = 'day' } = req.query;
    const params = [];
    const conditions = dateRangeClause(start_date, end_date, 'used_at', params);
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const bucket = granularity === 'week' ? 'week' : 'day';

    const result = await pool.query(
      `SELECT DATE_TRUNC('${bucket}', used_at) AS period, COUNT(*) AS count
       FROM usage_log
       ${where}
       GROUP BY period
       ORDER BY period ASC`,
      params
    );

    res.json({
      data: result.rows.map((row) => ({ period: row.period, count: parseInt(row.count, 10) })),
    });
  } catch (err) {
    next(err);
  }
}

async function teamStats(req, res, next) {
  try {
    const { start_date, end_date } = req.query;
    const params = [];
    const conditions = dateRangeClause(start_date, end_date, 'ul.used_at', params);
    const where = conditions.length ? `AND ${conditions.join(' AND ')}` : '';

    const result = await pool.query(
      `SELECT u.id, u.name, u.email, u.role,
              COUNT(ul.id) AS usage_count,
              MAX(ul.used_at) AS last_activity
       FROM users u
       LEFT JOIN usage_log ul ON ul.used_by = u.id ${where}
       GROUP BY u.id
       ORDER BY usage_count DESC`,
      params
    );

    res.json({
      data: result.rows.map((row) => ({
        id: row.id,
        name: row.name,
        email: row.email,
        role: row.role,
        usageCount: parseInt(row.usage_count, 10),
        lastActivity: row.last_activity,
      })),
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Angka penjualan: dari mana lead datang, dan berapa yang jadi.
 *
 * "Closing" berarti status Sudah DP. Lead berstatus Batal dihitung sebagai
 * kalah, sisanya masih berjalan — dipisah supaya tingkat konversi tidak
 * terlihat buruk hanya karena banyak lead yang masih diproses.
 */
async function sales(req, res, next) {
  try {
    const won = `COUNT(*) FILTER (WHERE l.status = 'Sudah DP')`;
    const lost = `COUNT(*) FILTER (WHERE l.status = 'Batal')`;

    // Disaring berdasarkan kapan lead-nya masuk, bukan kapan closing — supaya
    // satu lead selalu masuk periode yang sama di setiap angka. Tanpa rentang,
    // hasilnya sepanjang waktu.
    const params = [];
    const where = [];
    if (req.query.start_date) {
      params.push(req.query.start_date);
      where.push(`l.entry_date >= $${params.length}::date`);
    }
    if (req.query.end_date) {
      params.push(req.query.end_date);
      where.push(`l.entry_date <= $${params.length}::date`);
    }
    const filter = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const [byPackage, byPic, funnel, speed] = await Promise.all([
      pool.query(
        `SELECT COALESCE(p.name, 'Tanpa paket') AS label,
                COUNT(*)::int AS leads, ${won}::int AS won, ${lost}::int AS lost
         FROM leads l LEFT JOIN packages p ON p.id = l.package_id
         ${filter}
         GROUP BY 1 ORDER BY leads DESC LIMIT 10`,
        params
      ),
      pool.query(
        // Nama akun didahulukan supaya "Dita", "dita", dan "Dita " menyatu jadi
        // satu baris. Yang tidak tertaut ke akun tetap tampil apa adanya.
        `SELECT COALESCE(u.name, l.pic_sales, 'Tanpa PIC') AS label,
                COUNT(*)::int AS leads, ${won}::int AS won, ${lost}::int AS lost
         FROM leads l LEFT JOIN users u ON u.id = l.pic_user_id
         ${filter} GROUP BY 1 ORDER BY leads DESC LIMIT 10`,
        params
      ),
      pool.query(
        `SELECT l.status AS label, COUNT(*)::int AS count FROM leads l ${filter} GROUP BY 1`,
        params
      ),
      // won_at baru ada sejak fitur ini, jadi lead lama tidak punya tanggalnya.
      // Yang dihitung hanya yang punya, dan jumlahnya ikut dikirim supaya
      // angkanya bisa dinilai — rata-rata dari dua lead bukan kesimpulan.
      pool.query(
        `SELECT COUNT(*)::int AS sample,
                ROUND(AVG(l.won_at::date - l.entry_date))::int AS avg_days
         FROM leads l ${filter ? `${filter} AND` : 'WHERE'} l.won_at IS NOT NULL`,
        params
      ),
    ]);

    const withRate = (rows) =>
      rows.map((r) => ({
        label: r.label,
        leads: r.leads,
        won: r.won,
        lost: r.lost,
        open: r.leads - r.won - r.lost,
        // Persentase dihitung dari lead yang sudah selesai saja.
        conversion: r.won + r.lost > 0 ? Math.round((r.won / (r.won + r.lost)) * 100) : null,
      }));

    res.json({
      data: {
        byPackage: withRate(byPackage.rows),
        byPic: withRate(byPic.rows),
        funnel: funnel.rows,
        timeToWin: {
          sample: speed.rows[0].sample,
          avgDays: speed.rows[0].avg_days,
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Konversi bulan demi bulan — arahnya, bukan potretnya.
 *
 * Selalu 12 bulan terakhir, tidak ikut rentang di tab Penjualan: menyaring
 * tren ke satu bulan hanya menyisakan satu titik, dan itu bukan tren.
 */
async function salesTrend(req, res, next) {
  try {
    const months = Math.min(Math.max(parseInt(req.query.months, 10) || 12, 3), 24);

    const result = await pool.query(
      `SELECT to_char(date_trunc('month', entry_date), 'YYYY-MM') AS month,
              COUNT(*)::int AS leads,
              COUNT(*) FILTER (WHERE status = 'Sudah DP')::int AS won,
              COUNT(*) FILTER (WHERE status = 'Batal')::int AS lost
       FROM leads
       WHERE entry_date >= date_trunc('month', CURRENT_DATE) - make_interval(months => $1)
       GROUP BY 1 ORDER BY 1`,
      [months - 1]
    );

    const byMonth = new Map(result.rows.map((r) => [r.month, r]));

    // Bulan tanpa lead tetap ditampilkan, kalau tidak sumbu waktunya melompat
    // dan jeda sepi justru tidak terlihat.
    const data = [];
    const cursor = new Date();
    cursor.setDate(1);
    cursor.setMonth(cursor.getMonth() - (months - 1));
    for (let i = 0; i < months; i++) {
      const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`;
      const row = byMonth.get(key);
      const won = row?.won || 0;
      const lost = row?.lost || 0;
      const selesai = won + lost;
      data.push({
        month: key,
        leads: row?.leads || 0,
        won,
        lost,
        // null, bukan 0 — bulan yang belum ada hasilnya bukan bulan yang gagal.
        conversion: selesai > 0 ? Math.round((won / selesai) * 100) : null,
      });
      cursor.setMonth(cursor.getMonth() + 1);
    }

    res.json({ data });
  } catch (err) {
    next(err);
  }
}

module.exports = { summary, topQuestions, categories, usageTrend, teamStats, sales, salesTrend };
