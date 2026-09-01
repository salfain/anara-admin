const pool = require('../db/pool');
const { logActivity } = require('./activityController');

// Ambang "sudah lama tidak disentuh", dalam hari sejak follow-up terakhir
// (atau sejak lead masuk, kalau belum pernah di-follow-up sama sekali).
// Frontend memakai angka yang sama di src/utils/followUp.js — ubah keduanya.
const DUE_AFTER_DAYS = 3;
const OVERDUE_AFTER_DAYS = 7;

// Lead yang sudah DP atau batal tidak perlu dikejar lagi.
const CLOSED_STATUSES = ['Sudah DP', 'Batal'];

// Satu-satunya status yang berarti berhasil.
const WON_STATUS = 'Sudah DP';

// Nama PIC yang diketik dicocokkan ke akun saat disimpan, supaya salah ketik
// tidak beranak jadi "PIC" baru di laporan konversi.
async function resolvePicUserId(picSales, client = pool) {
  if (!picSales || !String(picSales).trim()) return null;
  const result = await client.query(
    'SELECT id FROM users WHERE lower(btrim(name)) = lower(btrim($1)) LIMIT 1',
    [String(picSales)]
  );
  return result.rows[0]?.id || null;
}

function serialize(row) {
  return {
    id: row.id,
    entryDate: row.entry_date,
    whatsapp: row.whatsapp,
    // Kalau sudah tertaut ke akun, nama akun itu yang dipakai — nama akun bisa
    // diperbaiki, teks yang terlanjur diketik tidak.
    picSales: row.pic_user_name || row.pic_sales,
    picUserId: row.pic_user_id,
    status: row.status,
    notes: row.notes,
    followUp1: row.follow_up_1,
    followUp2: row.follow_up_2,
    followUp3: row.follow_up_3,
    country: row.country,
    name: row.name,
    packageId: row.package_id,
    // Ikut dikirim supaya pesan follow-up bisa terisi tanpa request tambahan.
    packageName: row.package_name || null,
    packageDates: row.package_dates || null,
    packagePrice: row.package_price !== undefined && row.package_price !== null
      ? Number(row.package_price)
      : null,
    wonAt: row.won_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function list(req, res, next) {
  try {
    const result = await pool.query(
      `SELECT l.*, p.name AS package_name, p.dates AS package_dates, p.price AS package_price,
              u.name AS pic_user_name
       FROM leads l
       LEFT JOIN packages p ON p.id = l.package_id
       LEFT JOIN users u ON u.id = l.pic_user_id
       ORDER BY l.entry_date DESC, l.id DESC`
    );
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

    const { entryDate, whatsapp, picSales, status, notes, followUp1, followUp2, followUp3, country, name, packageId } = req.body;

    const result = await pool.query(
      `INSERT INTO leads (entry_date, whatsapp, pic_sales, status, notes, follow_up_1, follow_up_2, follow_up_3, country, name, package_id, pic_user_id, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
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
        name || null,
        packageId || null,
        await resolvePicUserId(picSales),
        req.user.id,
      ]
    );

    // Sama seperti update: baca ulang lewat join agar detail paket ikut terbawa.
    const withPackage = await pool.query(
      `SELECT l.*, p.name AS package_name, p.dates AS package_dates, p.price AS package_price,
              u.name AS pic_user_name
       FROM leads l
       LEFT JOIN packages p ON p.id = l.package_id
       LEFT JOIN users u ON u.id = l.pic_user_id
       WHERE l.id = $1`,
      [result.rows[0].id]
    );

    const row = withPackage.rows[0];
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

    const { entryDate, whatsapp, picSales, status, notes, followUp1, followUp2, followUp3, country, name, packageId } = req.body;

    // Dicatat sekali saat pertama kali jadi "Sudah DP", dan dikosongkan lagi
    // kalau statusnya dicabut. Menulis ulang tiap update akan menggeser tanggal
    // closing setiap kali ada yang menyunting catatan.
    const wasWon = existing.rows[0].status === WON_STATUS;
    const isWon = (status || 'Baru') === WON_STATUS;
    const wonAt = isWon ? (wasWon ? existing.rows[0].won_at : new Date()) : null;

    const result = await pool.query(
      `UPDATE leads
       SET entry_date = $1, whatsapp = $2, pic_sales = $3, status = $4, notes = $5,
           follow_up_1 = $6, follow_up_2 = $7, follow_up_3 = $8, country = $9,
           name = $10, package_id = $11, won_at = $12, pic_user_id = $13, updated_at = NOW()
       WHERE id = $14
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
        name || null,
        packageId || null,
        wonAt,
        await resolvePicUserId(picSales),
        req.params.id,
      ]
    );

    // Baca ulang lewat join supaya respons membawa detail paket seperti list().
    const withPackage = await pool.query(
      `SELECT l.*, p.name AS package_name, p.dates AS package_dates, p.price AS package_price,
              u.name AS pic_user_name
       FROM leads l
       LEFT JOIN packages p ON p.id = l.package_id
       LEFT JOIN users u ON u.id = l.pic_user_id
       WHERE l.id = $1`,
      [req.params.id]
    );

    const row = withPackage.rows[0];
    const statusLama = existing.rows[0].status;
    if (statusLama !== row.status) {
      await pool.query(
        `INSERT INTO lead_notes (lead_id, user_id, kind, body) VALUES ($1, $2, 'status', $3)`,
        [row.id, req.user.id, `Status: ${statusLama} → ${row.status}`]
      );
    }
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

    // File Excel menyebut paket dengan namanya, bukan id. Ambil sekali di awal
    // supaya tidak query per baris.
    const pkgRows = await client.query('SELECT id, name FROM packages');
    const packageByName = new Map(pkgRows.rows.map((p) => [p.name.trim().toLowerCase(), p.id]));

    await client.query('BEGIN');
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const error = validatePayload(row);
      if (error) {
        errors.push({ row: i + 1, error });
        continue;
      }
      const { entryDate, whatsapp, picSales, status, notes, followUp1, followUp2, followUp3, country, name, packageName } = row;
      // Nama paket yang tidak dikenali diabaikan saja — lebih baik lead-nya
      // tetap masuk tanpa paket daripada seluruh barisnya ditolak.
      const packageId = packageName
        ? packageByName.get(String(packageName).trim().toLowerCase()) || null
        : null;
      const result = await client.query(
        `INSERT INTO leads (entry_date, whatsapp, pic_sales, status, notes, follow_up_1, follow_up_2, follow_up_3, country, name, package_id, pic_user_id, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
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
          name || null,
          packageId,
          await resolvePicUserId(picSales, client),
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
    const [monthly, byStatus, byPic, followUp] = await Promise.all([
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
      // GREATEST melewati NULL, jadi ini tanggal FU terakhir yang terisi —
      // dan jatuh kembali ke tanggal masuk kalau belum ada FU sama sekali.
      //
      // Dihitung dua kali: antrean seluruh tim, dan antrean orang yang sedang
      // membukanya. "12 perlu di-follow-up" tidak berarti apa-apa bagi satu CS
      // kalau dia tidak tahu mana yang bagiannya.
      pool.query(
        `SELECT
           COUNT(*) FILTER (WHERE gap >= $1) AS due,
           COUNT(*) FILTER (WHERE gap >= $2) AS overdue,
           COUNT(*) FILTER (WHERE gap >= $1 AND punya_saya) AS mine_due,
           COUNT(*) FILTER (WHERE gap >= $2 AND punya_saya) AS mine_overdue,
           COUNT(*) FILTER (WHERE punya_saya) AS mine_total
         FROM (
           SELECT CURRENT_DATE - COALESCE(
             GREATEST(follow_up_1, follow_up_2, follow_up_3), entry_date
           ) AS gap,
           pic_user_id = $4 AS punya_saya
           FROM leads
           WHERE status <> ALL($3::text[])
         ) t`,
        [DUE_AFTER_DAYS, OVERDUE_AFTER_DAYS, CLOSED_STATUSES, req.user.id]
      ),
    ]);

    res.json({
      data: {
        monthly: monthly.rows.map((r) => ({ month: r.month, count: parseInt(r.count, 10) })),
        byStatus: byStatus.rows.map((r) => ({ status: r.status, count: parseInt(r.count, 10) })),
        byPic: byPic.rows.map((r) => ({ picSales: r.pic_sales, count: parseInt(r.count, 10) })),
        followUp: {
          due: parseInt(followUp.rows[0].due, 10),
          overdue: parseInt(followUp.rows[0].overdue, 10),
          mineDue: parseInt(followUp.rows[0].mine_due, 10),
          mineOverdue: parseInt(followUp.rows[0].mine_overdue, 10),
          // Dipakai untuk membedakan "tidak punya lead" dari "punya, semuanya
          // sudah beres" — dua hal yang mustinya tampil berbeda.
          mineTotal: parseInt(followUp.rows[0].mine_total, 10),
          dueAfterDays: DUE_AFTER_DAYS,
          overdueAfterDays: OVERDUE_AFTER_DAYS,
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

function serializeNote(row) {
  return {
    id: row.id,
    kind: row.kind,
    body: row.body,
    author: row.author_name || null,
    createdAt: row.created_at,
  };
}

async function listNotes(req, res, next) {
  try {
    const result = await pool.query(
      `SELECT n.*, u.name AS author_name
       FROM lead_notes n LEFT JOIN users u ON u.id = n.user_id
       WHERE n.lead_id = $1
       ORDER BY n.created_at DESC, n.id DESC`,
      [req.params.id]
    );
    res.json({ data: result.rows.map(serializeNote) });
  } catch (err) {
    next(err);
  }
}

async function addNote(req, res, next) {
  try {
    const body = String(req.body.body || '').trim();
    if (!body) return res.status(400).json({ error: 'Catatan tidak boleh kosong' });

    const lead = await pool.query('SELECT id FROM leads WHERE id = $1', [req.params.id]);
    if (lead.rows.length === 0) return res.status(404).json({ error: 'Lead not found' });

    const result = await pool.query(
      `INSERT INTO lead_notes (lead_id, user_id, kind, body) VALUES ($1, $2, 'note', $3) RETURNING *`,
      [req.params.id, req.user.id, body]
    );
    const withAuthor = await pool.query(
      `SELECT n.*, u.name AS author_name FROM lead_notes n
       LEFT JOIN users u ON u.id = n.user_id WHERE n.id = $1`,
      [result.rows[0].id]
    );
    res.status(201).json({ data: serializeNote(withAuthor.rows[0]) });
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

module.exports = { list, create, update, remove, bulkCreate, summary, listNotes, addNote };
