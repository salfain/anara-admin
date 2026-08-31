const jwt = require('jsonwebtoken');
const pool = require('../db/pool');
const { ALL_PERMISSIONS, isValidPermission } = require('../config/permissions');

function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Missing authentication token' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: payload.sub, email: payload.email, role: payload.role, isAdmin: Boolean(payload.isAdmin) };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// Everything is resolved from the user id, never from the token's `role` and
// `isAdmin` claims. Those are frozen at login and the token lives for days, so
// trusting them would let a demoted admin keep full access until it expired.
async function loadPermissions(userId) {
  const result = await pool.query(
    `SELECT r.is_admin, rp.permission_key
     FROM users u
     JOIN roles r ON r.key = u.role
     LEFT JOIN role_permissions rp ON rp.role_key = r.key
     WHERE u.id = $1`,
    [userId]
  );
  if (result.rows.length === 0) return [];
  if (result.rows[0].is_admin) return ALL_PERMISSIONS;
  return result.rows.map((r) => r.permission_key).filter(isValidPermission);
}

// The role and admin flag as they stand right now, for the guards that decide
// who may hand out admin access. Same reasoning as loadPermissions: the token's
// copy of these can be days out of date.
async function loadAccount(userId) {
  const result = await pool.query(
    `SELECT u.role, r.is_admin FROM users u
     LEFT JOIN roles r ON r.key = u.role
     WHERE u.id = $1`,
    [userId]
  );
  const row = result.rows[0];
  return { role: row?.role || null, isAdmin: Boolean(row?.is_admin) };
}

function requirePermission(permission) {
  return async function (req, res, next) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Missing authentication token' });
      }
      const permissions = await loadPermissions(req.user.id);
      req.user.permissions = permissions;
      if (!permissions.includes(permission)) {
        return res.status(403).json({ error: 'Kamu tidak punya hak akses untuk aksi ini' });
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}

module.exports = { authenticate, requirePermission, loadPermissions, loadAccount };
