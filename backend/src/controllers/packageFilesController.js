const fs = require('fs');
const path = require('path');
const pool = require('../db/pool');
const { uploadDir } = require('../middleware/upload');
const { logActivity } = require('./activityController');

async function list(req, res, next) {
  try {
    const result = await pool.query('SELECT * FROM package_files ORDER BY created_at DESC');
    res.json({ data: result.rows });
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'File is required' });
    }

    const result = await pool.query(
      `INSERT INTO package_files (name, file_name, file_path, mime_type, size, uploaded_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [name.trim(), req.file.originalname, req.file.filename, req.file.mimetype, req.file.size, req.user.id]
    );

    const file = result.rows[0];
    await logActivity(req.user.id, 'upload', 'package_file', file.id, `mengupload file "${file.name}"`);

    res.status(201).json({ data: file });
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const result = await pool.query('DELETE FROM package_files WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'File not found' });
    }
    const file = result.rows[0];
    const diskPath = path.join(uploadDir, file.file_path);
    fs.unlink(diskPath, () => {});
    await logActivity(req.user.id, 'delete', 'package_file', file.id, `menghapus file "${file.name}"`);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

async function download(req, res, next) {
  try {
    const result = await pool.query('SELECT * FROM package_files WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'File not found' });
    }
    const file = result.rows[0];
    const diskPath = path.join(uploadDir, file.file_path);
    if (!fs.existsSync(diskPath)) {
      return res.status(404).json({ error: 'File missing on disk' });
    }
    res.download(diskPath, file.file_name);
  } catch (err) {
    next(err);
  }
}

module.exports = { list, create, remove, download };
