const pool = require('../db/pool');

function serialize(row) {
  return { id: row.id, label: row.label, sortOrder: row.sort_order };
}

async function list(req, res, next) {
  try {
    const result = await pool.query(
      'SELECT * FROM report_categories ORDER BY sort_order ASC, label ASC'
    );
    res.json({ data: result.rows.map(serialize) });
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const label = String(req.body.label || '').trim();
    if (!label) return res.status(400).json({ error: 'Nama kolom wajib diisi' });

    const urutan = await pool.query('SELECT COALESCE(MAX(sort_order), 0) + 1 AS n FROM report_categories');
    const result = await pool.query(
      'INSERT INTO report_categories (label, sort_order) VALUES ($1, $2) RETURNING *',
      [label, urutan.rows[0].n]
    );
    res.status(201).json({ data: serialize(result.rows[0]) });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Kolom dengan nama itu sudah ada' });
    }
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const result = await pool.query('DELETE FROM report_categories WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Kolom tidak ditemukan' });
    // Angka yang terlanjur tersimpan di laporan sengaja tidak ikut dihapus.
    // Laporan yang sudah dikirim ke grup tidak boleh berubah isinya.
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = { list, create, remove };
