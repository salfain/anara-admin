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

    const [byPackage, byPic, funnel, speed] = await Promise.all([
      pool.query(
        `SELECT COALESCE(p.name, 'Tanpa paket') AS label,
                COUNT(*)::int AS leads, ${won}::int AS won, ${lost}::int AS lost
         FROM leads l LEFT JOIN packages p ON p.id = l.package_id
         GROUP BY 1 ORDER BY leads DESC LIMIT 10`
      ),
      pool.query(
        `SELECT COALESCE(l.pic_sales, 'Tanpa PIC') AS label,
                COUNT(*)::int AS leads, ${won}::int AS won, ${lost}::int AS lost
         FROM leads l GROUP BY 1 ORDER BY leads DESC LIMIT 10`
      ),
      pool.query(`SELECT status AS label, COUNT(*)::int AS count FROM leads GROUP BY 1`),
      // won_at baru ada sejak fitur ini, jadi lead lama tidak punya tanggalnya.
      // Yang dihitung hanya yang punya, dan jumlahnya ikut dikirim supaya
      // angkanya bisa dinilai — rata-rata dari dua lead bukan kesimpulan.
      pool.query(
        `SELECT COUNT(*)::int AS sample,
                ROUND(AVG(won_at::date - entry_date))::int AS avg_days
         FROM leads WHERE won_at IS NOT NULL`
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

module.exports = { summary, topQuestions, categories, usageTrend, teamStats, sales };
