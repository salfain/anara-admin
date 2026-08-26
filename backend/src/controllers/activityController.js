const pool = require('../db/pool');

async function logActivity(userId, action, entityType, entityId, description) {
  await pool.query(
    `INSERT INTO activity_log (user_id, action, entity_type, entity_id, description)
     VALUES ($1, $2, $3, $4, $5)`,
    [userId, action, entityType, entityId, description]
  );
}

module.exports = { logActivity };
