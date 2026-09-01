const pool = require('../db/pool');
const { logActivity } = require('./activityController');

function serialize(row) {
  return {
    id: row.id,
    packageId: row.package_id,
    packageName: row.package_name || null,
    destination: row.destination || null,
    departDate: row.depart_date,
    seatStatus: row.seat_status,
    notes: row.notes,
  };
}

/**
 * Semua keberangkatan, terbaru di depan.
 *
 * `upcoming=1` menyembunyikan yang sudah lewat — itu tampilan yang dipakai CS
 * sehari-hari saat ditanya "masih ada seat?". Tanpa filter, semuanya tampil,
 * karena riwayat tetap perlu dibaca saat menyusun jadwal tahun berikutnya.
 */
async function list(req, res, next) {
  try {
    const where = [];
    const params = [];

    if (req.query.upcoming === '1') {
      where.push('d.depart_date >= CURRENT_DATE');
    }
    if (req.query.packageId) {
      params.push(req.query.packageId);
      where.push(`d.package_id = $${params.length}`);
    }

    const result = await pool.query(
      `SELECT d.*, p.name AS package_name, p.destination
       FROM package_departures d
       JOIN packages p ON p.id = d.package_id
       ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
       ORDER BY d.depart_date ASC, p.name ASC`,
      params
    );
    res.json({ data: result.rows.map(serialize) });
  } catch (err) {
    next(err);
  }
}

function validate(body) {
  if (!body.departDate) return 'Tanggal keberangkatan wajib diisi';
  if (!body.packageId) return 'Paket wajib dipilih';
  return null;
}

async function create(req, res, next) {
  try {
    const error = validate(req.body);
    if (error) return res.status(400).json({ error });

    const { packageId, departDate, seatStatus, notes } = req.body;
    const result = await pool.query(
      `INSERT INTO package_departures (package_id, depart_date, seat_status, notes)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [packageId, departDate, (seatStatus || 'AVAILABLE').trim(), notes || null]
    );
    await logActivity(req.user.id, 'create', 'departure', result.rows[0].id, `menambah keberangkatan ${departDate}`);
    res.status(201).json({ data: serialize(result.rows[0]) });
  } catch (err) {
    // Tanggal yang sama untuk paket yang sama sudah pasti keliru — dua baris
    // dengan status seat berbeda tidak bisa dijawab mana yang benar.
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Tanggal itu sudah terdaftar untuk paket ini' });
    }
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const { departDate, seatStatus, notes } = req.body;
    const result = await pool.query(
      `UPDATE package_departures
       SET depart_date = COALESCE($1, depart_date),
           seat_status = COALESCE($2, seat_status),
           notes = $3,
           updated_at = NOW()
       WHERE id = $4 RETURNING *`,
      [departDate || null, seatStatus ? seatStatus.trim() : null, notes || null, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Keberangkatan tidak ditemukan' });
    res.json({ data: serialize(result.rows[0]) });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Tanggal itu sudah terdaftar untuk paket ini' });
    }
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const result = await pool.query('DELETE FROM package_departures WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Keberangkatan tidak ditemukan' });
    await logActivity(req.user.id, 'delete', 'departure', req.params.id, 'menghapus keberangkatan');
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

/**
 * Import massal dari spreadsheet: baris berisi nama trip, tanggal, status seat.
 *
 * Paket dicocokkan menurut nama; yang belum ada dibuat, karena menolak seluruh
 * baris hanya karena paketnya belum terdaftar akan membuat import gagal total
 * di pemakaian pertama. Tanggal yang sudah ada diperbarui statusnya, bukan
 * digandakan — import ulang setelah spreadsheet berubah harus aman.
 */
async function bulkImport(req, res, next) {
  const client = await pool.connect();
  try {
    const rows = Array.isArray(req.body.rows) ? req.body.rows : [];
    if (rows.length === 0) return res.status(400).json({ error: 'Tidak ada baris untuk diimport' });

    await client.query('BEGIN');

    const pkgRows = await client.query('SELECT id, name FROM packages');
    const byName = new Map(pkgRows.rows.map((p) => [p.name.trim().toLowerCase(), p.id]));

    let imported = 0;
    let updated = 0;
    let created = 0;
    const skipped = [];

    for (let i = 0; i < rows.length; i++) {
      const { packageName, departDate, seatStatus } = rows[i];
      if (!packageName || !departDate) {
        skipped.push({ row: i + 1, reason: 'Nama trip atau tanggal kosong' });
        continue;
      }
      const key = String(packageName).trim().toLowerCase();
      let packageId = byName.get(key);
      if (!packageId) {
        const baru = await client.query('INSERT INTO packages (name) VALUES ($1) RETURNING id', [
          String(packageName).trim(),
        ]);
        packageId = baru.rows[0].id;
        byName.set(key, packageId);
        created++;
      }

      const hasil = await client.query(
        `INSERT INTO package_departures (package_id, depart_date, seat_status)
         VALUES ($1, $2, $3)
         ON CONFLICT (package_id, depart_date)
         DO UPDATE SET seat_status = EXCLUDED.seat_status, updated_at = NOW()
         RETURNING (xmax = 0) AS baru`,
        [packageId, departDate, (seatStatus || 'AVAILABLE').trim()]
      );
      hasil.rows[0].baru ? imported++ : updated++;
    }

    await client.query('COMMIT');
    await logActivity(req.user.id, 'import', 'departure', null, `import ${imported + updated} keberangkatan`);
    res.json({ data: { imported, updated, packagesCreated: created, skipped } });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    next(err);
  } finally {
    client.release();
  }
}

module.exports = { list, create, update, remove, bulkImport };
