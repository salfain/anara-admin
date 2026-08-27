const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const pool = require('../db/pool');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

function signToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role, isAdmin: Boolean(user.is_admin) },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

function sanitizeUser(user) {
  const { password_hash, is_admin, role_label, ...rest } = user;
  return { ...rest, isAdmin: Boolean(is_admin), roleLabel: role_label || rest.role };
}

async function findUserWithRole(where, params) {
  const result = await pool.query(
    `SELECT u.*, r.is_admin, r.label AS role_label FROM users u LEFT JOIN roles r ON r.key = u.role WHERE ${where}`,
    params
  );
  return result.rows[0];
}

async function signup(req, res, next) {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password, and name are required' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, name, role, status)
       VALUES ($1, $2, $3, 'cs', 'pending')
       RETURNING *`,
      [email, passwordHash, name]
    );

    const user = result.rows[0];
    res.status(201).json({
      pending: true,
      message: 'Akun berhasil dibuat. Menunggu persetujuan admin sebelum bisa login.',
      user: sanitizeUser(user),
    });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await findUserWithRole('u.email = $1', [email]);
    if (!user || !user.password_hash) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (user.status === 'pending') {
      return res.status(403).json({ error: 'Akun Anda masih menunggu persetujuan admin.' });
    }

    const token = signToken(user);
    res.json({ token, user: sanitizeUser(user) });
  } catch (err) {
    next(err);
  }
}

async function googleAuth(req, res, next) {
  try {
    const { idToken } = req.body;
    if (!idToken) {
      return res.status(400).json({ error: 'idToken is required' });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const { sub: googleId, email, name } = payload;

    let user = await findUserWithRole('u.google_id = $1 OR u.email = $2', [googleId, email]);

    if (!user) {
      await pool.query(
        `INSERT INTO users (email, name, google_id, role, status)
         VALUES ($1, $2, $3, 'cs', 'pending')`,
        [email, name, googleId]
      );
      user = await findUserWithRole('u.email = $1', [email]);
    } else if (!user.google_id) {
      await pool.query(
        'UPDATE users SET google_id = $1, updated_at = NOW() WHERE id = $2',
        [googleId, user.id]
      );
      user = await findUserWithRole('u.id = $1', [user.id]);
    }

    if (user.status === 'pending') {
      return res.status(403).json({ error: 'Akun Anda masih menunggu persetujuan admin.', pending: true });
    }

    const token = signToken(user);
    res.json({ token, user: sanitizeUser(user) });
  } catch (err) {
    next(err);
  }
}

async function me(req, res, next) {
  try {
    const user = await findUserWithRole('u.id = $1', [req.user.id]);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ user: sanitizeUser(user) });
  } catch (err) {
    next(err);
  }
}

async function refresh(req, res, next) {
  try {
    const user = await findUserWithRole('u.id = $1', [req.user.id]);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    const token = signToken(user);
    res.json({ token });
  } catch (err) {
    next(err);
  }
}

async function logout(req, res) {
  // Stateless JWT: client discards the token. Nothing to invalidate server-side.
  res.json({ message: 'Logged out' });
}

module.exports = { signup, login, googleAuth, me, refresh, logout };
