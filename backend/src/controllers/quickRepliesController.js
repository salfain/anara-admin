const pool = require('../db/pool');
const { logActivity } = require('./activityController');

async function stats(req, res, next) {
  try {
    const totalReplies = await pool.query('SELECT COUNT(*) FROM quick_replies');
    const totalUsage = await pool.query('SELECT COALESCE(SUM(usage_count), 0) AS total FROM quick_replies');
    const totalUsers = await pool.query('SELECT COUNT(*) FROM users');
    const topCategory = await pool.query(
      `SELECT category FROM quick_replies WHERE category IS NOT NULL
       GROUP BY category ORDER BY SUM(usage_count) DESC LIMIT 1`
    );
    const topReplies = await pool.query(
      `SELECT qr.*, p.name AS package_name
       FROM quick_replies qr
       LEFT JOIN packages p ON p.id = qr.package_id
       ORDER BY qr.usage_count DESC
       LIMIT 5`
    );

    res.json({
      data: {
        totalReplies: parseInt(totalReplies.rows[0].count, 10),
        totalUsage: parseInt(totalUsage.rows[0].total, 10),
        totalUsers: parseInt(totalUsers.rows[0].count, 10),
        topCategory: topCategory.rows[0]?.category || '-',
        topReplies: topReplies.rows,
      },
    });
  } catch (err) {
    next(err);
  }
}

async function list(req, res, next) {
  try {
    const {
      search,
      category,
      package_id,
      tags,
      sort = 'most_used',
      page = 1,
      limit = 50,
    } = req.query;

    const conditions = [];
    const params = [];

    if (search) {
      params.push(`%${search.toLowerCase()}%`);
      conditions.push(`(LOWER(qr.question) LIKE $${params.length} OR LOWER(qr.answer) LIKE $${params.length} OR LOWER(qr.tags) LIKE $${params.length})`);
    }
    if (category) {
      params.push(category);
      conditions.push(`qr.category = $${params.length}`);
    }
    if (package_id) {
      params.push(package_id);
      conditions.push(`qr.package_id = $${params.length}`);
    }
    if (tags) {
      params.push(`%${tags.toLowerCase()}%`);
      conditions.push(`LOWER(qr.tags) LIKE $${params.length}`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const sortMap = {
      most_used: 'qr.usage_count DESC',
      recent: 'qr.created_at DESC',
      alphabetical: 'qr.question ASC',
    };
    const orderBy = sortMap[sort] || sortMap.most_used;

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 100);
    const offset = (pageNum - 1) * limitNum;

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM quick_replies qr ${where}`,
      params
    );
    const total = parseInt(countResult.rows[0].count, 10);

    params.push(limitNum, offset);
    const dataResult = await pool.query(
      `SELECT qr.*, p.name AS package_name
       FROM quick_replies qr
       LEFT JOIN packages p ON p.id = qr.package_id
       ${where}
       ORDER BY ${orderBy}
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    res.json({
      data: dataResult.rows,
      pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
    });
  } catch (err) {
    next(err);
  }
}

async function getOne(req, res, next) {
  try {
    const result = await pool.query(
      `SELECT qr.*, p.name AS package_name
       FROM quick_replies qr
       LEFT JOIN packages p ON p.id = qr.package_id
       WHERE qr.id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Quick reply not found' });
    }
    res.json({ data: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const { question, answer, package_id, category, tags } = req.body;

    if (!question || question.trim().length < 10) {
      return res.status(400).json({ error: 'Question must be at least 10 characters' });
    }
    if (!answer || answer.trim().length < 50) {
      return res.status(400).json({ error: 'Answer must be at least 50 characters' });
    }

    const result = await pool.query(
      `INSERT INTO quick_replies (question, answer, package_id, category, tags, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [question.trim(), answer.trim(), package_id || null, category || null, tags || null, req.user.id]
    );

    const reply = result.rows[0];
    await logActivity(req.user.id, 'create', 'quick_reply', reply.id, `membuat reply baru "${reply.question}"`);

    res.status(201).json({ data: reply });
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const { question, answer, package_id, category, tags } = req.body;

    const existing = await pool.query('SELECT * FROM quick_replies WHERE id = $1', [req.params.id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Quick reply not found' });
    }

    if (question && question.trim().length < 10) {
      return res.status(400).json({ error: 'Question must be at least 10 characters' });
    }
    if (answer && answer.trim().length < 50) {
      return res.status(400).json({ error: 'Answer must be at least 50 characters' });
    }

    const current = existing.rows[0];
    const result = await pool.query(
      `UPDATE quick_replies
       SET question = $1, answer = $2, package_id = $3, category = $4, tags = $5, updated_at = NOW()
       WHERE id = $6
       RETURNING *`,
      [
        question ? question.trim() : current.question,
        answer ? answer.trim() : current.answer,
        package_id !== undefined ? package_id : current.package_id,
        category !== undefined ? category : current.category,
        tags !== undefined ? tags : current.tags,
        req.params.id,
      ]
    );

    const reply = result.rows[0];
    await logActivity(req.user.id, 'update', 'quick_reply', reply.id, `mengedit reply "${reply.question}"`);

    res.json({ data: reply });
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const result = await pool.query('DELETE FROM quick_replies WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Quick reply not found' });
    }
    const reply = result.rows[0];
    await logActivity(req.user.id, 'delete', 'quick_reply', reply.id, `menghapus reply "${reply.question}"`);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

async function trackUsage(req, res, next) {
  try {
    const replyResult = await pool.query(
      `UPDATE quick_replies SET usage_count = usage_count + 1, updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [req.params.id]
    );
    if (replyResult.rows.length === 0) {
      return res.status(404).json({ error: 'Quick reply not found' });
    }

    await pool.query(
      'INSERT INTO usage_log (reply_id, used_by) VALUES ($1, $2)',
      [req.params.id, req.user.id]
    );

    res.json({ data: replyResult.rows[0] });
  } catch (err) {
    next(err);
  }
}

module.exports = { stats, list, getOne, create, update, remove, trackUsage };
