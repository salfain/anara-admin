const pool = require('../db/pool');
const { loadAccount } = require('../middleware/auth');
const {
  PERMISSION_GROUPS,
  ALL_PERMISSIONS,
  DEFAULT_PERMISSIONS,
  isValidPermission,
} = require('../config/permissions');

function serialize(row, permissions) {
  return {
    key: row.key,
    label: row.label,
    isAdmin: row.is_admin,
    isBuiltin: row.is_builtin,
    // Role admin punya semua hak akses secara implisit — tidak bisa dikurangi.
    permissions: row.is_admin ? ALL_PERMISSIONS : permissions || [],
    userCount: row.user_count !== undefined ? parseInt(row.user_count, 10) : undefined,
  };
}

async function permissionsByRole(roleKeys) {
  const map = {};
  roleKeys.forEach((k) => { map[k] = []; });
  if (roleKeys.length === 0) return map;
  const result = await pool.query(
    'SELECT role_key, permission_key FROM role_permissions WHERE role_key = ANY($1)',
    [roleKeys]
  );
  result.rows.forEach((r) => {
    if (!map[r.role_key]) map[r.role_key] = [];
    if (isValidPermission(r.permission_key)) map[r.role_key].push(r.permission_key);
  });
  return map;
}

// Dipakai auth: daftar hak akses efektif untuk satu role.
async function effectivePermissions(roleKey, isAdmin) {
  if (isAdmin) return ALL_PERMISSIONS;
  if (!roleKey) return [];
  const map = await permissionsByRole([roleKey]);
  return map[roleKey] || [];
}

async function catalog(req, res) {
  res.json({ data: PERMISSION_GROUPS });
}

async function list(req, res, next) {
  try {
    const result = await pool.query(
      `SELECT r.*, COUNT(u.id) AS user_count
       FROM roles r
       LEFT JOIN users u ON u.role = r.key
       GROUP BY r.key
       ORDER BY r.is_builtin DESC, r.label ASC`
    );
    const map = await permissionsByRole(result.rows.map((r) => r.key));
    res.json({ data: result.rows.map((row) => serialize(row, map[row.key])) });
  } catch (err) {
    next(err);
  }
}

function slugify(label) {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 30);
}

function normalizePermissions(input) {
  if (!Array.isArray(input)) return null;
  return [...new Set(input.filter(isValidPermission))];
}

async function create(req, res, next) {
  try {
    const { label, isAdmin, permissions } = req.body;
    if (!label || !label.trim()) {
      return res.status(400).json({ error: 'Nama role wajib diisi' });
    }
    // Membuat role ber-akses Admin sama saja dengan mengangkat admin baru,
    // jadi hak akses "Kelola role" saja tidak cukup.
    if (isAdmin && !(await loadAccount(req.user.id)).isAdmin) {
      return res.status(403).json({ error: 'Hanya Admin yang bisa membuat role dengan akses Admin' });
    }
    const key = slugify(label);
    if (!key) {
      return res.status(400).json({ error: 'Nama role tidak valid' });
    }
    const existing = await pool.query('SELECT key FROM roles WHERE key = $1', [key]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Role dengan nama tersebut sudah ada' });
    }
    const result = await pool.query(
      'INSERT INTO roles (key, label, is_admin, is_builtin) VALUES ($1, $2, $3, FALSE) RETURNING *',
      [key, label.trim(), Boolean(isAdmin)]
    );

    const granted = normalizePermissions(permissions) || DEFAULT_PERMISSIONS;
    if (!isAdmin && granted.length > 0) {
      await pool.query(
        `INSERT INTO role_permissions (role_key, permission_key)
         SELECT $1, p FROM unnest($2::text[]) AS p
         ON CONFLICT DO NOTHING`,
        [key, granted]
      );
    }

    res.status(201).json({ data: serialize(result.rows[0], granted) });
  } catch (err) {
    next(err);
  }
}

async function updatePermissions(req, res, next) {
  const client = await pool.connect();
  try {
    const roleRes = await client.query('SELECT * FROM roles WHERE key = $1', [req.params.key]);
    if (roleRes.rows.length === 0) {
      return res.status(404).json({ error: 'Role tidak ditemukan' });
    }
    const role = roleRes.rows[0];
    // Mengubah hak akses role sendiri = bisa memberi diri sendiri akses apa pun.
    const account = await loadAccount(req.user.id);
    if (role.key === account.role && !account.isAdmin) {
      return res.status(400).json({ error: 'Tidak bisa mengubah hak akses role kamu sendiri' });
    }
    if (role.is_admin) {
      return res.status(400).json({ error: 'Role dengan akses Admin selalu punya semua hak akses' });
    }

    const granted = normalizePermissions(req.body.permissions);
    if (!granted) {
      return res.status(400).json({ error: 'permissions harus berupa array' });
    }

    await client.query('BEGIN');
    await client.query('DELETE FROM role_permissions WHERE role_key = $1', [role.key]);
    if (granted.length > 0) {
      await client.query(
        `INSERT INTO role_permissions (role_key, permission_key)
         SELECT $1, p FROM unnest($2::text[]) AS p`,
        [role.key, granted]
      );
    }
    await client.query('COMMIT');

    res.json({ data: serialize(role, granted) });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    next(err);
  } finally {
    client.release();
  }
}

async function remove(req, res, next) {
  try {
    const existing = await pool.query('SELECT * FROM roles WHERE key = $1', [req.params.key]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Role tidak ditemukan' });
    }
    if (existing.rows[0].is_builtin) {
      return res.status(400).json({ error: 'Role bawaan (CS/Admin) tidak bisa dihapus' });
    }
    const inUse = await pool.query('SELECT COUNT(*) FROM users WHERE role = $1', [req.params.key]);
    if (parseInt(inUse.rows[0].count, 10) > 0) {
      return res.status(400).json({ error: 'Role masih dipakai oleh user, pindahkan usernya dulu' });
    }
    await pool.query('DELETE FROM roles WHERE key = $1', [req.params.key]);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = { list, create, remove, catalog, updatePermissions, effectivePermissions };
