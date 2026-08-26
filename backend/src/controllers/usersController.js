const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const pool = require('../db/pool');
const { logActivity } = require('./activityController');

function sanitizeUser(user) {
  const { password_hash, ...rest } = user;
  return rest;
}

async function list(req, res, next) {
  try {
    const { search, page = 1, limit = 10 } = req.query;
    const params = [];
    const conditions = [];

    if (search) {
      params.push(`%${search.toLowerCase()}%`);
      conditions.push(`(LOWER(email) LIKE $${params.length} OR LOWER(name) LIKE $${params.length})`);
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 100);
    const offset = (pageNum - 1) * limitNum;

    const countResult = await pool.query(`SELECT COUNT(*) FROM users ${where}`, params);
    const total = parseInt(countResult.rows[0].count, 10);

    params.push(limitNum, offset);
    const result = await pool.query(
      `SELECT * FROM users ${where} ORDER BY created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    res.json({
      data: result.rows.map(sanitizeUser),
      pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
    });
  } catch (err) {
    next(err);
  }
}

async function invite(req, res, next) {
  try {
    const { email, name, role = 'cs' } = req.body;
    if (!email || !name) {
      return res.status(400).json({ error: 'Email and name are required' });
    }
    if (!['cs', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Role must be cs or admin' });
    }

    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Temporary password; user resets it on first login (Phase 2: email invite flow).
    const tempPassword = crypto.randomBytes(9).toString('base64');
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    const result = await pool.query(
      `INSERT INTO users (email, password_hash, name, role)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [email, passwordHash, name, role]
    );

    const user = result.rows[0];
    await logActivity(req.user.id, 'invite', 'user', user.id, `mengundang user baru "${user.email}"`);

    res.status(201).json({ data: sanitizeUser(user), tempPassword });
  } catch (err) {
    next(err);
  }
}

async function updateRole(req, res, next) {
  try {
    const { role } = req.body;
    if (!['cs', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Role must be cs or admin' });
    }

    const result = await pool.query(
      'UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [role, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];
    await logActivity(req.user.id, 'update_role', 'user', user.id, `mengubah role "${user.email}" menjadi ${role}`);

    res.json({ data: sanitizeUser(user) });
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    if (parseInt(req.params.id, 10) === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }
    const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    await logActivity(req.user.id, 'delete', 'user', result.rows[0].id, `menghapus user "${result.rows[0].email}"`);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

async function activity(req, res, next) {
  try {
    const { start_date, end_date, page = 1, limit = 20 } = req.query;
    const params = [req.params.id];
    const conditions = ['user_id = $1'];

    if (start_date) {
      params.push(start_date);
      conditions.push(`created_at >= $${params.length}`);
    }
    if (end_date) {
      params.push(end_date);
      conditions.push(`created_at <= $${params.length}`);
    }

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
    const offset = (pageNum - 1) * limitNum;

    params.push(limitNum, offset);
    const result = await pool.query(
      `SELECT * FROM activity_log WHERE ${conditions.join(' AND ')}
       ORDER BY created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    res.json({ data: result.rows });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, invite, updateRole, remove, activity };
