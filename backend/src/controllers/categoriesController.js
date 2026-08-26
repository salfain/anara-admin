const pool = require('../db/pool');

async function list(req, res, next) {
  try {
    const result = await pool.query(
      `SELECT c.id, c.name, c.created_at, COUNT(qr.id) AS reply_count
       FROM categories c
       LEFT JOIN quick_replies qr ON qr.category = c.name
       GROUP BY c.id
       ORDER BY c.name ASC`
    );
    res.json({ data: result.rows.map((r) => ({ ...r, reply_count: parseInt(r.reply_count, 10) })) });
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Category name is required' });
    }
    const existing = await pool.query('SELECT id FROM categories WHERE name = $1', [name.trim()]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Category already exists' });
    }
    const result = await pool.query('INSERT INTO categories (name) VALUES ($1) RETURNING *', [name.trim()]);
    res.status(201).json({ data: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const result = await pool.query('DELETE FROM categories WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = { list, create, remove };
