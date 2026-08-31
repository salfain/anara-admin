require('dotenv').config();
const pool = require('./pool');
const seedTemplates = require('./followupSeedData');

/**
 * Mencari teks yang karakternya sudah rusak, dan bisa memperbaikinya.
 *
 *   npm run check:text        -> laporan saja
 *   npm run check:text -- --fix  -> tulis ulang template dari berkas seed
 *
 * Dua bentuk kerusakan yang dicari:
 *
 * U+FFFD (�) muncul saat byte didekode dengan encoding yang salah dan sudah
 * tidak bisa dipulihkan dari teks itu sendiri — informasinya benar-benar
 * hilang, jadi satu-satunya jalan adalah menulis ulang dari sumber.
 *
 * Mojibake (Ã°Å¸â€¦) muncul saat byte UTF-8 dibaca sebagai Latin-1. Ini masih
 * bisa dibalik, tapi kalau sumbernya ada di berkas seed, menulis ulang tetap
 * lebih aman daripada menebak.
 */

const REPLACEMENT = '�';
const MOJIBAKE = /[ÃÂ][-¿‘-„†-…]/;

function inspect(label, value) {
  if (typeof value !== 'string' || !value) return null;
  if (value.includes(REPLACEMENT)) return { label, kind: 'karakter hilang (U+FFFD)', value };
  if (MOJIBAKE.test(value)) return { label, kind: 'mojibake (UTF-8 dibaca Latin-1)', value };
  return null;
}

function snippet(value) {
  const at = value.indexOf(REPLACEMENT);
  const from = at >= 0 ? Math.max(0, at - 30) : 0;
  return value.slice(from, from + 70).replace(/\n/g, ' ');
}

async function main() {
  const fix = process.argv.includes('--fix');

  const { rows: enc } = await pool.query('SHOW server_encoding');
  console.log(`Encoding database: ${enc[0].server_encoding}`);
  if (enc[0].server_encoding !== 'UTF8') {
    console.log('  ^ Ini penyebabnya. Emoji tidak bisa disimpan utuh di encoding ini.');
    console.log('    Perbaiki dengan membuat ulang database sebagai UTF8, lalu restore datanya.');
  }

  const findings = [];

  const templates = await pool.query('SELECT id, code, title, text, steps, variants FROM followup_templates');
  for (const t of templates.rows) {
    const parts = [['text', t.text], ['title', t.title]];
    (t.steps || []).forEach((s, i) => parts.push([`steps[${i}]`, s]));
    (t.variants || []).forEach((v, i) => parts.push([`variants[${i}]`, v.text]));
    for (const [field, value] of parts) {
      const bad = inspect(`template ${t.code} · ${field}`, value);
      if (bad) findings.push({ ...bad, templateId: t.id, code: t.code });
    }
  }

  const replies = await pool.query('SELECT id, question, answer FROM quick_replies');
  for (const r of replies.rows) {
    for (const [field, value] of [['question', r.question], ['answer', r.answer]]) {
      const bad = inspect(`quick reply #${r.id} · ${field}`, value);
      if (bad) findings.push(bad);
    }
  }

  if (findings.length === 0) {
    console.log('\nTidak ada teks yang rusak. Emoji dan karakter khusus tersimpan utuh.');
    console.log('Kalau emoji tetap hilang saat dikirim, masalahnya bukan di data.');
    await pool.end();
    return;
  }

  console.log(`\n${findings.length} teks rusak ditemukan:\n`);
  for (const f of findings) {
    console.log(`  ${f.label}`);
    console.log(`    ${f.kind}`);
    console.log(`    ...${snippet(f.value)}...`);
  }

  if (!fix) {
    console.log('\nJalankan lagi dengan --fix untuk menulis ulang template dari berkas seed.');
    console.log('Quick reply tidak bisa diperbaiki otomatis — isinya tidak ada di berkas seed.');
    await pool.end();
    return;
  }

  const seedByCode = new Map(seedTemplates.map((t) => [t.code, t]));
  const codes = [...new Set(findings.filter((f) => f.code).map((f) => f.code))];
  let repaired = 0;

  for (const code of codes) {
    const seed = seedByCode.get(code);
    if (!seed) {
      console.log(`\n! Template ${code} tidak ada di berkas seed — biarkan, perbaiki manual.`);
      continue;
    }
    await pool.query(
      `UPDATE followup_templates
       SET title = $1, use_when = $2, text = $3, steps = $4, variants = $5, updated_at = NOW()
       WHERE code = $6`,
      [
        seed.title,
        seed.useWhen || null,
        seed.text || null,
        seed.steps ? JSON.stringify(seed.steps) : null,
        seed.variants ? JSON.stringify(seed.variants) : null,
        code,
      ]
    );
    repaired++;
    console.log(`  diperbaiki: ${code}`);
  }

  console.log(`\n${repaired} template ditulis ulang dari berkas seed.`);
  console.log('Jalankan lagi tanpa --fix untuk memastikan sudah bersih.');
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
