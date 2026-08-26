const pool = require('../db/pool');
const { logActivity } = require('./activityController');

function serialize(row) {
  return {
    id: row.id,
    no: row.no,
    code: row.code,
    when: row.when_label,
    title: row.title,
    useWhen: row.use_when,
    tag: row.tag,
    kind: row.kind,
    text: row.text,
    steps: row.steps,
    variants: row.variants,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function list(req, res, next) {
  try {
    const result = await pool.query(
      'SELECT * FROM followup_templates ORDER BY sort_order ASC, id ASC'
    );
    res.json({ data: result.rows.map(serialize) });
  } catch (err) {
    next(err);
  }
}

function validatePayload(body) {
  const { no, code, title, kind } = body;
  if (!no || !code || !title) {
    return 'No, code, and title are required';
  }
  if (!['text', 'steps', 'variants'].includes(kind)) {
    return 'Kind must be text, steps, or variants';
  }
  if (kind === 'text' && (!body.text || !body.text.trim())) {
    return 'Text is required for a text template';
  }
  if (kind === 'steps' && (!Array.isArray(body.steps) || body.steps.filter((s) => s && s.trim()).length === 0)) {
    return 'At least one step is required';
  }
  if (kind === 'variants' && (!Array.isArray(body.variants) || body.variants.filter((v) => v?.label && v?.text).length === 0)) {
    return 'At least one variant (label + text) is required';
  }
  return null;
}

async function create(req, res, next) {
  try {
    const error = validatePayload(req.body);
    if (error) return res.status(400).json({ error });

    const { no, code, when, title, useWhen, tag, kind, text, steps, variants } = req.body;

    const maxSort = await pool.query('SELECT COALESCE(MAX(sort_order), -1) AS max FROM followup_templates');
    const sortOrder = parseInt(maxSort.rows[0].max, 10) + 1;

    const result = await pool.query(
      `INSERT INTO followup_templates (no, code, when_label, title, use_when, tag, kind, text, steps, variants, sort_order, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [
        no, code, when || null, title, useWhen || null, tag || null, kind,
        kind === 'text' ? text : null,
        kind === 'steps' ? JSON.stringify(steps.filter((s) => s && s.trim())) : null,
        kind === 'variants' ? JSON.stringify(variants.filter((v) => v?.label && v?.text)) : null,
        sortOrder,
        req.user.id,
      ]
    );

    const row = result.rows[0];
    await logActivity(req.user.id, 'create', 'followup_template', row.id, `membuat template follow-up "${row.title}"`);

    res.status(201).json({ data: serialize(row) });
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const existing = await pool.query('SELECT * FROM followup_templates WHERE id = $1', [req.params.id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }

    const error = validatePayload(req.body);
    if (error) return res.status(400).json({ error });

    const { no, code, when, title, useWhen, tag, kind, text, steps, variants } = req.body;

    const result = await pool.query(
      `UPDATE followup_templates
       SET no = $1, code = $2, when_label = $3, title = $4, use_when = $5, tag = $6, kind = $7,
           text = $8, steps = $9, variants = $10, updated_at = NOW()
       WHERE id = $11
       RETURNING *`,
      [
        no, code, when || null, title, useWhen || null, tag || null, kind,
        kind === 'text' ? text : null,
        kind === 'steps' ? JSON.stringify(steps.filter((s) => s && s.trim())) : null,
        kind === 'variants' ? JSON.stringify(variants.filter((v) => v?.label && v?.text)) : null,
        req.params.id,
      ]
    );

    const row = result.rows[0];
    await logActivity(req.user.id, 'update', 'followup_template', row.id, `mengedit template follow-up "${row.title}"`);

    res.json({ data: serialize(row) });
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const result = await pool.query('DELETE FROM followup_templates WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }
    const row = result.rows[0];
    await logActivity(req.user.id, 'delete', 'followup_template', row.id, `menghapus template follow-up "${row.title}"`);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = { list, create, update, remove };
