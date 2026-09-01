const pool = require('../db/pool');
const { logActivity } = require('./activityController');

// Kolom yang boleh disunting per peserta, dipetakan ke nama kolomnya di
// database. Daftar tertutup: badan permintaan tidak boleh menentukan kolom
// mana yang ditulis.
const PARTICIPANT_FIELDS = {
  name: 'name',
  origin: 'origin',
  destination: 'destination',
  paidDp: 'paid_dp',
  paidTicket: 'paid_ticket',
  paidSettlement: 'paid_settlement',
  bookedOutbound: 'booked_outbound',
  bookedReturn: 'booked_return',
  ticketOutbound: 'ticket_outbound',
  ticketReturn: 'ticket_return',
  airlineOutbound: 'airline_outbound',
  airlineReturn: 'airline_return',
  codeOutbound: 'code_outbound',
  codeReturn: 'code_return',
};

function serializeParticipant(row) {
  return {
    id: row.id,
    bookingId: row.booking_id,
    name: row.name,
    origin: row.origin,
    destination: row.destination,
    paidDp: row.paid_dp,
    paidTicket: row.paid_ticket,
    paidSettlement: row.paid_settlement,
    bookedOutbound: row.booked_outbound,
    bookedReturn: row.booked_return,
    ticketOutbound: row.ticket_outbound,
    ticketReturn: row.ticket_return,
    airlineOutbound: row.airline_outbound,
    airlineReturn: row.airline_return,
    codeOutbound: row.code_outbound,
    codeReturn: row.code_return,
    sortOrder: row.sort_order,
  };
}

function serializeBooking(row, participants) {
  return {
    id: row.id,
    departureId: row.departure_id,
    departDate: row.depart_date || null,
    packageName: row.package_name || null,
    leadId: row.lead_id,
    invoiceNo: row.invoice_no,
    customerName: row.customer_name,
    notes: row.notes,
    participants: participants || [],
  };
}

/**
 * Booking beserta pesertanya, disaring per keberangkatan.
 *
 * Di spreadsheet, satu keberangkatan berarti satu tab. Di sini jadi satu
 * parameter, jadi menambah keberangkatan tidak berarti menambah halaman.
 */
async function list(req, res, next) {
  try {
    const params = [];
    const where = [];
    if (req.query.departureId) {
      params.push(req.query.departureId);
      where.push(`b.departure_id = $${params.length}`);
    }

    const bookings = await pool.query(
      `SELECT b.*, d.depart_date, p.name AS package_name
       FROM bookings b
       LEFT JOIN package_departures d ON d.id = b.departure_id
       LEFT JOIN packages p ON p.id = d.package_id
       ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
       ORDER BY b.created_at ASC, b.id ASC`,
      params
    );

    if (bookings.rows.length === 0) return res.json({ data: [] });

    const ids = bookings.rows.map((b) => b.id);
    const peserta = await pool.query(
      `SELECT * FROM booking_participants WHERE booking_id = ANY($1)
       ORDER BY sort_order ASC, id ASC`,
      [ids]
    );

    const byBooking = new Map(ids.map((id) => [id, []]));
    peserta.rows.forEach((p) => byBooking.get(p.booking_id).push(serializeParticipant(p)));

    res.json({ data: bookings.rows.map((b) => serializeBooking(b, byBooking.get(b.id))) });
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const { departureId, invoiceNo, customerName, leadId, notes } = req.body;
    if (!customerName || !String(customerName).trim()) {
      return res.status(400).json({ error: 'Nama customer wajib diisi' });
    }

    const result = await pool.query(
      `INSERT INTO bookings (departure_id, lead_id, invoice_no, customer_name, notes, created_by)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [departureId || null, leadId || null, invoiceNo || null, String(customerName).trim(), notes || null, req.user.id]
    );
    await logActivity(req.user.id, 'create', 'booking', result.rows[0].id, `membuat booking "${customerName}"`);
    res.status(201).json({ data: serializeBooking(result.rows[0], []) });
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const { departureId, invoiceNo, customerName, notes } = req.body;
    const result = await pool.query(
      `UPDATE bookings
       SET departure_id = COALESCE($1, departure_id),
           invoice_no = $2,
           customer_name = COALESCE($3, customer_name),
           notes = $4,
           updated_at = NOW()
       WHERE id = $5 RETURNING *`,
      [departureId || null, invoiceNo || null, customerName ? String(customerName).trim() : null, notes || null, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Booking tidak ditemukan' });
    res.json({ data: serializeBooking(result.rows[0], []) });
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const result = await pool.query('DELETE FROM bookings WHERE id = $1 RETURNING customer_name', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Booking tidak ditemukan' });
    await logActivity(req.user.id, 'delete', 'booking', req.params.id, `menghapus booking "${result.rows[0].customer_name}"`);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

async function addParticipant(req, res, next) {
  try {
    const name = String(req.body.name || '').trim();
    if (!name) return res.status(400).json({ error: 'Nama peserta wajib diisi' });

    const booking = await pool.query('SELECT id FROM bookings WHERE id = $1', [req.params.id]);
    if (booking.rows.length === 0) return res.status(404).json({ error: 'Booking tidak ditemukan' });

    // Urutan mengikuti yang sudah ada, supaya peserta baru masuk ke bawah.
    const urutan = await pool.query(
      'SELECT COALESCE(MAX(sort_order), 0) + 1 AS berikutnya FROM booking_participants WHERE booking_id = $1',
      [req.params.id]
    );

    const result = await pool.query(
      `INSERT INTO booking_participants (booking_id, name, origin, destination, sort_order)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [req.params.id, name, req.body.origin || null, req.body.destination || null, urutan.rows[0].berikutnya]
    );
    res.status(201).json({ data: serializeParticipant(result.rows[0]) });
  } catch (err) {
    next(err);
  }
}

/**
 * Sunting satu kolom peserta.
 *
 * Sengaja per kolom: tabelnya dipakai seperti spreadsheet, satu centang pada
 * satu waktu. Mengirim seluruh baris akan membuat dua orang yang mencentang
 * kolom berbeda saling menimpa.
 */
async function updateParticipant(req, res, next) {
  try {
    const entries = Object.entries(req.body).filter(([key]) => PARTICIPANT_FIELDS[key]);
    if (entries.length === 0) {
      return res.status(400).json({ error: 'Tidak ada kolom yang bisa diubah' });
    }

    const sets = entries.map(([key], i) => `${PARTICIPANT_FIELDS[key]} = $${i + 1}`);
    const values = entries.map(([, value]) => (value === '' ? null : value));

    const result = await pool.query(
      `UPDATE booking_participants SET ${sets.join(', ')}, updated_at = NOW()
       WHERE id = $${values.length + 1} RETURNING *`,
      [...values, req.params.participantId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Peserta tidak ditemukan' });
    res.json({ data: serializeParticipant(result.rows[0]) });
  } catch (err) {
    next(err);
  }
}

async function removeParticipant(req, res, next) {
  try {
    const result = await pool.query(
      'DELETE FROM booking_participants WHERE id = $1 RETURNING id',
      [req.params.participantId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Peserta tidak ditemukan' });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

/**
 * Berapa peserta yang belum bayar, untuk lencana di navigasi.
 *
 * Hanya keberangkatan yang belum lewat: menagih DP untuk trip yang sudah
 * berangkat bukan pekerjaan hari ini, dan angkanya akan terus menumpuk sampai
 * lencananya diabaikan.
 */
async function summary(req, res, next) {
  try {
    const { rows } = await pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE NOT bp.paid_dp)::int AS unpaid_dp,
         COUNT(*) FILTER (WHERE NOT bp.paid_ticket)::int AS unpaid_ticket,
         COUNT(*) FILTER (WHERE NOT bp.paid_settlement)::int AS unsettled,
         COUNT(*)::int AS total
       FROM booking_participants bp
       JOIN bookings b ON b.id = bp.booking_id
       JOIN package_departures d ON d.id = b.departure_id
       WHERE d.depart_date >= CURRENT_DATE`
    );

    const r = rows[0];
    res.json({
      data: {
        unpaidDp: r.unpaid_dp,
        unpaidTicket: r.unpaid_ticket,
        unsettled: r.unsettled,
        total: r.total,
        // Satu orang bisa menunggak DP dan tiket sekaligus; yang dipakai untuk
        // lencana adalah jumlah ORANG, bukan jumlah tunggakan.
        needsAttention: Math.max(r.unpaid_dp, r.unpaid_ticket),
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, summary, create, update, remove, addParticipant, updateParticipant, removeParticipant };
