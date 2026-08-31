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

// Hak akses dibaca langsung dari DB, bukan dari klaim token — supaya perubahan
// hak akses langsung berlaku tanpa user harus login ulang.
async function loadPermissions(user) {
  if (user.isAdmin) return ALL_PERMISSIONS;
  if (!user.role) return [];
  const result = await pool.query(
    `SELECT rp.permission_key, r.is_admin
     FROM roles r
     LEFT JOIN role_permissions rp ON rp.role_key = r.key
     WHERE r.key = $1`,
    [user.role]
  );
  if (result.rows.length === 0) return [];
  if (result.rows[0].is_admin) return ALL_PERMISSIONS;
  return result.rows.map((r) => r.permission_key).filter(isValidPermission);
}

function requireAdmin(req, res, next) {
  if (!req.user?.isAdmin) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

function requirePermission(permission) {
  return async function (req, res, next) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Missing authentication token' });
      }
      const permissions = await loadPermissions(req.user);
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

module.exports = { authenticate, requireAdmin, requirePermission, loadPermissions };
