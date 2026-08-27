const pool = require('../db/pool');
const { logActivity } = require('./activityController');

function serialize(row) {
  return {
    id: row.id,
    entryDate: row.entry_date,
    whatsapp: row.whatsapp,
    picSales: row.pic_sales,
    status: row.status,
    notes: row.notes,
    followUp1: row.follow_up_1,
    followUp2: row.follow_up_2,
    followUp3: row.follow_up_3,
    country: row.country,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function list(req, res, next) {
  try {
    const result = await pool.query('SELECT * FROM leads ORDER BY entry_date DESC, id DESC');
    res.json({ data: result.rows.map(serialize) });
  } catch (err) {
    next(err);
  }
}

function validatePayload(body) {
  if (!body.whatsapp || !body.whatsapp.trim()) {
    return 'Nomor WhatsApp wajib diisi';
  }
  if (!body.entryDate) {
    return 'Tanggal masuk wajib diisi';
  }
  return null;
}

async function create(req, res, next) {
  try {
    const error = validatePayload(req.body);
    if (error) return res.status(400).json({ error });

    const { entryDate, whatsapp, picSales, status, notes, followUp1, followUp2, followUp3, country } = req.body;

    const result = await pool.query(
      `INSERT INTO leads (entry_date, whatsapp, pic_sales, status, notes, follow_up_1, follow_up_2, follow_up_3, country, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        entryDate,
        whatsapp.trim(),
        picSales || null,
        status || 'Baru',
        notes || null,
        followUp1 || null,
        followUp2 || null,
        followUp3 || null,
        country || null,
        req.user.id,
      ]
    );

    const row = result.rows[0];
    await logActivity(req.user.id, 'create', 'lead', row.id, `menambahkan lead "${row.whatsapp}"`);

    res.status(201).json({ data: serialize(row) });
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const existing = await pool.query('SELECT * FROM leads WHERE id = $1', [req.params.id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    const error = validatePayload(req.body);
    if (error) return res.status(400).json({ error });

    const { entryDate, whatsapp, picSales, status, notes, followUp1, followUp2, followUp3, country } = req.body;

    const result = await pool.query(
      `UPDATE leads
       SET entry_date = $1, whatsapp = $2, pic_sales = $3, status = $4, notes = $5,
           follow_up_1 = $6, follow_up_2 = $7, follow_up_3 = $8, country = $9, updated_at = NOW()
       WHERE id = $10
       RETURNING *`,
      [
        entryDate,
        whatsapp.trim(),
        picSales || null,
        status || 'Baru',
        notes || null,
        followUp1 || null,
        followUp2 || null,
        followUp3 || null,
        country || null,
        req.params.id,
      ]
    );

    const row = result.rows[0];
    await logActivity(req.user.id, 'update', 'lead', row.id, `mengedit lead "${row.whatsapp}"`);

    res.json({ data: serialize(row) });
  } catch (err) {
    next(err);
  }
}

async function bulkCreate(req, res, next) {
  const client = await pool.connect();
  try {
    const rows = Array.isArray(req.body.rows) ? req.body.rows : [];
    if (rows.length === 0) {
      return res.status(400).json({ error: 'Tidak ada baris untuk diimport' });
    }

    let imported = 0;
    const errors = [];

    await client.query('BEGIN');
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const error = validatePayload(row);
      if (error) {
        errors.push({ row: i + 1, error });
        continue;
      }
      const { entryDate, whatsapp, picSales, status, notes, followUp1, followUp2, followUp3, country } = row;
      const result = await client.query(
        `INSERT INTO leads (entry_date, whatsapp, pic_sales, status, notes, follow_up_1, follow_up_2, follow_up_3, country, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING id`,
        [
          entryDate,
          whatsapp.trim(),
          picSales || null,
          status || 'Baru',
          notes || null,
          followUp1 || null,
          followUp2 || null,
          followUp3 || null,
          country || null,
          req.user.id,
        ]
      );
      if (result.rows.length) imported++;
    }
    await client.query('COMMIT');

    if (imported > 0) {
      await logActivity(req.user.id, 'import', 'lead', null, `mengimport ${imported} lead`);
    }

    res.status(201).json({ data: { imported, skipped: errors.length, errors } });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
}

async function summary(req, res, next) {
  try {
    const [monthly, byStatus, byPic] = await Promise.all([
      pool.query(
        `SELECT to_char(date_trunc('month', entry_date), 'YYYY-MM') AS month, COUNT(*) AS count
         FROM leads
         WHERE entry_date >= date_trunc('month', NOW()) - INTERVAL '5 months'
         GROUP BY 1 ORDER BY 1 ASC`
      ),
      pool.query(`SELECT status, COUNT(*) AS count FROM leads GROUP BY status ORDER BY status ASC`),
      pool.query(
        `SELECT COALESCE(pic_sales, 'Tanpa PIC') AS pic_sales, COUNT(*) AS count
         FROM leads GROUP BY pic_sales ORDER BY count DESC LIMIT 8`
      ),
    ]);

    res.json({
      data: {
        monthly: monthly.rows.map((r) => ({ month: r.month, count: parseInt(r.count, 10) })),
        byStatus: byStatus.rows.map((r) => ({ status: r.status, count: parseInt(r.count, 10) })),
        byPic: byPic.rows.map((r) => ({ picSales: r.pic_sales, count: parseInt(r.count, 10) })),
      },
    });
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const result = await pool.query('DELETE FROM leads WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Lead not found' });
    }
    const row = result.rows[0];
    await logActivity(req.user.id, 'delete', 'lead', row.id, `menghapus lead "${row.whatsapp}"`);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = { list, create, update, remove, bulkCreate, summary };
