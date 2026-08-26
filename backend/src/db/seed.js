require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool = require('./pool');
const followupSeedData = require('./followupSeedData');

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const adminPasswordHash = await bcrypt.hash('Admin12345', 10);
    const adminRes = await client.query(
      `INSERT INTO users (email, password_hash, name, role)
       VALUES ($1, $2, $3, 'admin')
       ON CONFLICT (email) DO NOTHING
       RETURNING id`,
      ['admin@anara.com', adminPasswordHash, 'Admin Anara']
    );

    await client.query(
      `INSERT INTO categories (name)
       VALUES ('Harga'), ('Jadwal'), ('Visa'), ('Pembayaran'), ('Pembatalan')
       ON CONFLICT (name) DO NOTHING`
    );

    const packagesRes = await client.query(
      `INSERT INTO packages (name, destination, duration, year, dates, price, status)
       VALUES
        ('Paket Hongkong 5D4N', 'Hongkong', 5, 2026, 'Sep - Des 2026', 8500000, 'open'),
        ('Paket Korea 6D5N', 'Korea', 6, 2026, 'Okt - Des 2026', 12500000, 'open'),
        ('Paket Vietnam 4D3N', 'Vietnam', 4, 2026, 'Sep - Nov 2026', 6200000, 'promo'),
        ('Paket Eropa 9D7N', 'Eropa', 9, 2026, 'Nov 2026', 32000000, 'open')
       ON CONFLICT DO NOTHING
       RETURNING id, name`
    );

    const pkgByName = {};
    for (const row of packagesRes.rows) pkgByName[row.name] = row.id;

    const adminId = adminRes.rows[0]
      ? adminRes.rows[0].id
      : (await client.query('SELECT id FROM users WHERE email = $1', ['admin@anara.com'])).rows[0].id;

    await client.query(
      `INSERT INTO quick_replies (question, answer, package_id, category, tags, usage_count, created_by)
       VALUES
        ($1, $2, $3, 'Harga', 'hongkong,harga', 87, $7),
        ($4, $5, $6, 'Visa', 'korea,visa', 64, $7)
       ON CONFLICT DO NOTHING`,
      [
        'Berapa harga paket wisata Hongkong?',
        'Halo Kak! Untuk paket Hongkong 5D4N kami ada mulai dari Rp 8.500.000/pax (quad) sudah termasuk tiket pesawat PP, hotel bintang 3, dan tour guide.',
        pkgByName['Paket Hongkong 5D4N'] || null,
        'Apakah paket Korea sudah termasuk visa?',
        'Untuk paket Korea, visa TIDAK termasuk dalam harga paket ya Kak. Kami bisa bantu urus visa dengan biaya tambahan Rp 950.000/orang.',
        pkgByName['Paket Korea 6D5N'] || null,
        adminId,
      ]
    );

    const followupCount = await client.query('SELECT COUNT(*) FROM followup_templates');
    if (parseInt(followupCount.rows[0].count, 10) === 0) {
      for (let i = 0; i < followupSeedData.length; i++) {
        const t = followupSeedData[i];
        await client.query(
          `INSERT INTO followup_templates (no, code, when_label, title, use_when, tag, kind, text, steps, variants, sort_order, created_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
          [
            t.no, t.code, t.when || null, t.title, t.useWhen || null, t.tag || null, t.kind,
            t.kind === 'text' ? t.text : null,
            t.kind === 'steps' ? JSON.stringify(t.steps) : null,
            t.kind === 'variants' ? JSON.stringify(t.variants) : null,
            i,
            adminId,
          ]
        );
      }
    }

    await client.query('COMMIT');
    console.log('Seed completed. Admin login: admin@anara.com / Admin12345');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Seed failed:', err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
