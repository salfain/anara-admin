const pool = require('../db/pool');

async function list(req, res, next) {
  try {
    const result = await pool.query('SELECT * FROM packages ORDER BY created_at DESC');
    res.json({ data: result.rows });
  } catch (err) {
    next(err);
  }
}

async function getOne(req, res, next) {
  try {
    const result = await pool.query('SELECT * FROM packages WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Package not found' });
    }
    res.json({ data: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const { name, destination, duration, year, dates, price, status, notes } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }
    const result = await pool.query(
      `INSERT INTO packages (name, destination, duration, year, dates, price, status, notes)
       VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7, 'open'), $8)
       RETURNING *`,
      [name, destination || null, duration || null, year || null, dates || null, price || null, status || null, notes || null]
    );
    res.status(201).json({ data: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const existing = await pool.query('SELECT * FROM packages WHERE id = $1', [req.params.id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Package not found' });
    }
    const current = existing.rows[0];
    const { name, destination, duration, year, dates, price, status, notes } = req.body;

    const result = await pool.query(
      `UPDATE packages
       SET name = $1, destination = $2, duration = $3, year = $4, dates = $5, price = $6, status = $7, notes = $8, updated_at = NOW()
       WHERE id = $9
       RETURNING *`,
      [
        name ?? current.name,
        destination ?? current.destination,
        duration ?? current.duration,
        year ?? current.year,
        dates ?? current.dates,
        price ?? current.price,
        status ?? current.status,
        notes ?? current.notes,
        req.params.id,
      ]
    );
    res.json({ data: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const result = await pool.query('DELETE FROM packages WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Package not found' });
    }
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = { list, getOne, create, update, remove };
