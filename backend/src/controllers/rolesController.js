const pool = require('../db/pool');

function serialize(row) {
  return {
    key: row.key,
    label: row.label,
    isAdmin: row.is_admin,
    isBuiltin: row.is_builtin,
    userCount: row.user_count !== undefined ? parseInt(row.user_count, 10) : undefined,
  };
}

async function list(req, res, next) {
  try {
    const result = await pool.query(
      `SELECT r.*, COUNT(u.id) AS user_count
       FROM roles r
       LEFT JOIN users u ON u.role = r.key
       GROUP BY r.key
       ORDER BY r.is_builtin DESC, r.label ASC`
    );
    res.json({ data: result.rows.map(serialize) });
  } catch (err) {
    next(err);
  }
}

function slugify(label) {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 30);
}

async function create(req, res, next) {
  try {
    const { label, isAdmin } = req.body;
    if (!label || !label.trim()) {
      return res.status(400).json({ error: 'Nama role wajib diisi' });
    }
    const key = slugify(label);
    if (!key) {
      return res.status(400).json({ error: 'Nama role tidak valid' });
    }
    const existing = await pool.query('SELECT key FROM roles WHERE key = $1', [key]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Role dengan nama tersebut sudah ada' });
    }
    const result = await pool.query(
      'INSERT INTO roles (key, label, is_admin, is_builtin) VALUES ($1, $2, $3, FALSE) RETURNING *',
      [key, label.trim(), Boolean(isAdmin)]
    );
    res.status(201).json({ data: serialize(result.rows[0]) });
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const existing = await pool.query('SELECT * FROM roles WHERE key = $1', [req.params.key]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Role tidak ditemukan' });
    }
    if (existing.rows[0].is_builtin) {
      return res.status(400).json({ error: 'Role bawaan (CS/Admin) tidak bisa dihapus' });
    }
    const inUse = await pool.query('SELECT COUNT(*) FROM users WHERE role = $1', [req.params.key]);
    if (parseInt(inUse.rows[0].count, 10) > 0) {
      return res.status(400).json({ error: 'Role masih dipakai oleh user, pindahkan usernya dulu' });
    }
    await pool.query('DELETE FROM roles WHERE key = $1', [req.params.key]);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = { list, create, remove };
