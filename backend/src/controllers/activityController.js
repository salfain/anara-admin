const pool = require('../db/pool');

async function logActivity(userId, action, entityType, entityId, description) {
  await pool.query(
    `INSERT INTO activity_log (user_id, action, entity_type, entity_id, description)
     VALUES ($1, $2, $3, $4, $5)`,
    [userId, action, entityType, entityId, description]
  );
}

async function listAll(req, res, next) {
  try {
    const { start_date, end_date, action, page = 1, limit = 20 } = req.query;
    const params = [];
    const conditions = [];

    if (start_date) {
      params.push(start_date);
      conditions.push(`a.created_at >= $${params.length}`);
    }
    if (end_date) {
      params.push(end_date);
      conditions.push(`a.created_at <= $${params.length}`);
    }
    if (action) {
      params.push(action);
      conditions.push(`a.action = $${params.length}`);
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
    const offset = (pageNum - 1) * limitNum;

    const countResult = await pool.query(`SELECT COUNT(*) FROM activity_log a ${where}`, params);
    const total = parseInt(countResult.rows[0].count, 10);

    params.push(limitNum, offset);
    const result = await pool.query(
      `SELECT a.*, u.name AS user_name, u.email AS user_email
       FROM activity_log a
       LEFT JOIN users u ON u.id = a.user_id
       ${where}
       ORDER BY a.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    res.json({
      data: result.rows,
      pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { logActivity, listAll };
