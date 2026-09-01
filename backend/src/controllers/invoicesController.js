const pool = require('../db/pool');
const { logActivity } = require('./activityController');

// Nilai uang dibaca sebagai string oleh node-pg supaya NUMERIC tidak kehilangan
// ketelitian. Diubah ke Number hanya saat dikirim, karena jumlahnya masih jauh
// di bawah batas aman JavaScript.
const uang = (v) => (v === null || v === undefined ? 0 : Number(v));

function serializeItem(row) {
  return {
    id: row.id,
    code: row.code,
    description: row.description,
    qty: uang(row.qty),
    unitPrice: uang(row.unit_price),
    amount: uang(row.qty) * uang(row.unit_price),
    sortOrder: row.sort_order,
  };
}

function serializePayment(row) {
  return {
    id: row.id,
    paidOn: row.paid_on,
    amount: uang(row.amount),
    note: row.note,
    sortOrder: row.sort_order,
  };
}

function serialize(row, items = [], payments = []) {
  const subtotal = items.reduce((a, i) => a + i.amount, 0);
  const dibayar = payments.reduce((a, p) => a + p.amount, 0);
  return {
    id: row.id,
    invoiceNo: row.invoice_no,
    customerName: row.customer_name,
    customerAddress: row.customer_address,
    customerPhone: row.customer_phone,
    departureLabel: row.departure_label,
    invoiceDate: row.invoice_date,
    ticketPaymentDate: row.ticket_payment_date,
    repaymentDate: row.repayment_date,
    revision: row.revision,
    csName: row.cs_name,
    notes: row.notes,
    items,
    payments,
    subtotal,
    paid: dibayar,
    // Dihitung, tidak disimpan. Sisa tagihan yang tersimpan terpisah pasti
    // suatu saat berbeda dengan penjumlahan barisnya.
    outstanding: subtotal - dibayar,
  };
}

async function muat(id) {
  const [inv, items, payments] = await Promise.all([
    pool.query('SELECT * FROM invoices WHERE id = $1', [id]),
    pool.query('SELECT * FROM invoice_items WHERE invoice_id = $1 ORDER BY sort_order ASC, id ASC', [id]),
    pool.query('SELECT * FROM invoice_payments WHERE invoice_id = $1 ORDER BY sort_order ASC, id ASC', [id]),
  ]);
  if (inv.rows.length === 0) return null;
  return serialize(inv.rows[0], items.rows.map(serializeItem), payments.rows.map(serializePayment));
}

/** Daftar invoice, tanpa baris rinciannya supaya halamannya ringan. */
async function list(req, res, next) {
  try {
    const params = [];
    const where = [];
    if (req.query.search) {
      params.push(`%${String(req.query.search).toLowerCase()}%`);
      where.push(`(lower(invoice_no) LIKE $${params.length} OR lower(customer_name) LIKE $${params.length})`);
    }

    const result = await pool.query(
      `SELECT i.*,
              COALESCE(t.subtotal, 0) AS subtotal,
              COALESCE(b.dibayar, 0) AS dibayar
       FROM invoices i
       LEFT JOIN (
         SELECT invoice_id, SUM(qty * unit_price) AS subtotal FROM invoice_items GROUP BY invoice_id
       ) t ON t.invoice_id = i.id
       LEFT JOIN (
         SELECT invoice_id, SUM(amount) AS dibayar FROM invoice_payments GROUP BY invoice_id
       ) b ON b.invoice_id = i.id
       ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
       ORDER BY i.invoice_date DESC NULLS LAST, i.id DESC
       LIMIT 200`,
      params
    );

    res.json({
      data: result.rows.map((r) => ({
        id: r.id,
        invoiceNo: r.invoice_no,
        customerName: r.customer_name,
        departureLabel: r.departure_label,
        invoiceDate: r.invoice_date,
        csName: r.cs_name,
        subtotal: uang(r.subtotal),
        paid: uang(r.dibayar),
        outstanding: uang(r.subtotal) - uang(r.dibayar),
      })),
    });
  } catch (err) {
    next(err);
  }
}

async function getOne(req, res, next) {
  try {
    const data = await muat(req.params.id);
    if (!data) return res.status(404).json({ error: 'Invoice tidak ditemukan' });
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

const KOLOM = {
  customerName: 'customer_name',
  customerAddress: 'customer_address',
  customerPhone: 'customer_phone',
  departureLabel: 'departure_label',
  invoiceDate: 'invoice_date',
  ticketPaymentDate: 'ticket_payment_date',
  repaymentDate: 'repayment_date',
  revision: 'revision',
  csName: 'cs_name',
  notes: 'notes',
};

async function create(req, res, next) {
  try {
    const invoiceNo = String(req.body.invoiceNo || '').trim();
    const customerName = String(req.body.customerName || '').trim();
    if (!invoiceNo) return res.status(400).json({ error: 'Nomor invoice wajib diisi' });
    if (!customerName) return res.status(400).json({ error: 'Nama customer wajib diisi' });

    const result = await pool.query(
      `INSERT INTO invoices (invoice_no, customer_name, customer_address, customer_phone,
         departure_label, invoice_date, ticket_payment_date, repayment_date, revision, cs_name, notes, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING id`,
      [
        invoiceNo, customerName,
        req.body.customerAddress || null, req.body.customerPhone || null,
        req.body.departureLabel || null, req.body.invoiceDate || null,
        req.body.ticketPaymentDate || null, req.body.repaymentDate || null,
        req.body.revision || null, req.body.csName || null, req.body.notes || null,
        req.user.id,
      ]
    );
    await logActivity(req.user.id, 'create', 'invoice', result.rows[0].id, `membuat invoice ${invoiceNo}`);
    res.status(201).json({ data: await muat(result.rows[0].id) });
  } catch (err) {
    // Nomor invoice ganda hampir pasti salah ketik, dan dua invoice bernomor
    // sama tidak bisa dijawab mana yang berlaku.
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Nomor invoice itu sudah dipakai' });
    }
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const entries = Object.entries(req.body).filter(([k]) => KOLOM[k]);
    if (entries.length === 0) return res.status(400).json({ error: 'Tidak ada kolom yang bisa diubah' });

    const sets = entries.map(([k], i) => `${KOLOM[k]} = $${i + 1}`);
    const values = entries.map(([, v]) => (v === '' ? null : v));

    const result = await pool.query(
      `UPDATE invoices SET ${sets.join(', ')}, updated_at = NOW() WHERE id = $${values.length + 1} RETURNING id`,
      [...values, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Invoice tidak ditemukan' });
    res.json({ data: await muat(req.params.id) });
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const result = await pool.query('DELETE FROM invoices WHERE id = $1 RETURNING invoice_no', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Invoice tidak ditemukan' });
    await logActivity(req.user.id, 'delete', 'invoice', req.params.id, `hapus invoice ${result.rows[0].invoice_no}`);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

/**
 * Baris rincian dan pembayaran diganti seluruhnya, bukan disunting satu-satu.
 *
 * Keduanya dibaca dan diubah sebagai satu kesatuan saat menyusun invoice, dan
 * jumlah barisnya sedikit. Mengganti seluruhnya membuat urutan dan penghapusan
 * baris jadi sederhana, tanpa perlu melacak baris mana yang hilang.
 */
async function replaceItems(req, res, next) {
  const client = await pool.connect();
  try {
    const rows = Array.isArray(req.body.items) ? req.body.items : [];
    await client.query('BEGIN');
    await client.query('DELETE FROM invoice_items WHERE invoice_id = $1', [req.params.id]);
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      await client.query(
        `INSERT INTO invoice_items (invoice_id, code, description, qty, unit_price, sort_order)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [req.params.id, r.code || null, r.description || null, Number(r.qty) || 0, Number(r.unitPrice) || 0, i]
      );
    }
    await client.query('COMMIT');
    res.json({ data: await muat(req.params.id) });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    next(err);
  } finally {
    client.release();
  }
}

async function replacePayments(req, res, next) {
  const client = await pool.connect();
  try {
    const rows = Array.isArray(req.body.payments) ? req.body.payments : [];
    await client.query('BEGIN');
    await client.query('DELETE FROM invoice_payments WHERE invoice_id = $1', [req.params.id]);
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      await client.query(
        `INSERT INTO invoice_payments (invoice_id, paid_on, amount, note, sort_order)
         VALUES ($1,$2,$3,$4,$5)`,
        [req.params.id, r.paidOn || null, Number(r.amount) || 0, r.note || null, i]
      );
    }
    await client.query('COMMIT');
    res.json({ data: await muat(req.params.id) });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    next(err);
  } finally {
    client.release();
  }
}

module.exports = { list, getOne, create, update, remove, replaceItems, replacePayments };
