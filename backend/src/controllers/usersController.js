const bcrypt = require('bcryptjs');
const pool = require('../db/pool');
const { logActivity } = require('./activityController');

function sanitizeUser(user) {
  const { password_hash, is_admin, role_label, ...rest } = user;
  return { ...rest, isAdmin: Boolean(is_admin), roleLabel: role_label || rest.role };
}

async function findUserWithRole(id) {
  const result = await pool.query(
    `SELECT u.*, r.is_admin, r.label AS role_label FROM users u LEFT JOIN roles r ON r.key = u.role WHERE u.id = $1`,
    [id]
  );
  return result.rows[0];
}

async function findRole(role) {
  const result = await pool.query('SELECT * FROM roles WHERE key = $1', [role]);
  return result.rows[0];
}

async function list(req, res, next) {
  try {
    const { search, page = 1, limit = 10 } = req.query;
    const params = [];
    const conditions = [];

    if (search) {
      params.push(`%${search.toLowerCase()}%`);
      conditions.push(`(LOWER(u.email) LIKE $${params.length} OR LOWER(u.name) LIKE $${params.length})`);
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 100);
    const offset = (pageNum - 1) * limitNum;

    const countResult = await pool.query(`SELECT COUNT(*) FROM users u ${where}`, params);
    const total = parseInt(countResult.rows[0].count, 10);

    params.push(limitNum, offset);
    const result = await pool.query(
      `SELECT u.*, r.is_admin, r.label AS role_label FROM users u
       LEFT JOIN roles r ON r.key = u.role
       ${where}
       ORDER BY u.created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
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

async function listSimple(req, res, next) {
  try {
    const result = await pool.query(
      `SELECT id, name, role FROM users WHERE status = 'active' ORDER BY name ASC`
    );
    res.json({ data: result.rows });
  } catch (err) {
    next(err);
  }
}

async function invite(req, res, next) {
  try {
    const { email, name, role = 'cs', password } = req.body;
    if (!email || !name) {
      return res.status(400).json({ error: 'Email and name are required' });
    }
    const targetRole = await findRole(role);
    if (!targetRole) {
      return res.status(400).json({ error: 'Role tidak valid' });
    }
    // Hanya admin sungguhan yang boleh menaikkan orang ke role ber-akses Admin —
    // tanpa ini, siapa pun dengan hak akses "Kelola user" bisa mengangkat admin baru.
    if (targetRole.is_admin && !req.user.isAdmin) {
      return res.status(403).json({ error: 'Hanya Admin yang bisa memberikan role dengan akses Admin' });
    }
    if (!password || password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const inserted = await pool.query(
      `INSERT INTO users (email, password_hash, name, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [email, passwordHash, name, role]
    );

    const user = await findUserWithRole(inserted.rows[0].id);
    await logActivity(req.user.id, 'invite', 'user', user.id, `mengundang user baru "${user.email}"`);

    res.status(201).json({ data: sanitizeUser(user) });
  } catch (err) {
    next(err);
  }
}

async function updateRole(req, res, next) {
  try {
    const { role } = req.body;
    // Mencegah self-escalation: kalau boleh mengubah role sendiri, siapa pun dengan
    // hak akses "Kelola user" bisa mengangkat dirinya jadi Admin.
    if (String(req.params.id) === String(req.user.id)) {
      return res.status(400).json({ error: 'Tidak bisa mengubah role sendiri' });
    }
    const targetRole = await findRole(role);
    if (!targetRole) {
      return res.status(400).json({ error: 'Role tidak valid' });
    }
    // Hanya admin sungguhan yang boleh menaikkan orang ke role ber-akses Admin —
    // tanpa ini, siapa pun dengan hak akses "Kelola user" bisa mengangkat admin baru.
    if (targetRole.is_admin && !req.user.isAdmin) {
      return res.status(403).json({ error: 'Hanya Admin yang bisa memberikan role dengan akses Admin' });
    }

    const updated = await pool.query(
      'UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2 RETURNING id, email',
      [role, req.params.id]
    );
    if (updated.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = await findUserWithRole(updated.rows[0].id);
    await logActivity(req.user.id, 'update_role', 'user', user.id, `mengubah role "${user.email}" menjadi ${role}`);

    res.json({ data: sanitizeUser(user) });
  } catch (err) {
    next(err);
  }
}

async function approve(req, res, next) {
  try {
    const updated = await pool.query(
      `UPDATE users SET status = 'active', updated_at = NOW() WHERE id = $1 RETURNING id`,
      [req.params.id]
    );
    if (updated.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const user = await findUserWithRole(updated.rows[0].id);
    await logActivity(req.user.id, 'approve', 'user', user.id, `menyetujui akun "${user.email}"`);
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

module.exports = { list, listSimple, invite, updateRole, approve, remove, activity };
