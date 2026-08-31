// End-to-end checks for who may do what. These run against a real PostgreSQL
// because the rules live in SQL as much as in JavaScript: the migration's
// backfill, and the per-request lookup that resolves a role's grants.
//
//   docker run -d --name anara-test-pg -e POSTGRES_PASSWORD=test \
//     -e POSTGRES_DB=anara_test -p 55433:5432 postgres:16-alpine
//   TEST_DATABASE_URL=postgresql://postgres:test@localhost:55433/anara_test \
//     npm test
//
// Without TEST_DATABASE_URL the suite skips rather than fails, so it stays out
// of the way when there is no database around.

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const TEST_DB = process.env.TEST_DATABASE_URL;

if (!TEST_DB) {
  test('permission suite', { skip: 'set TEST_DATABASE_URL to run' }, () => {});
  return;
}

process.env.DATABASE_URL = TEST_DB;
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const pool = require('../src/db/pool');
const app = require('../src/app');

const USERS = {
  boss: { id: 1, email: 'boss@test.id', role: 'admin' },
  cs: { id: 2, email: 'cs@test.id', role: 'cs' },
  // Holds the two admin-panel permissions without the admin flag itself —
  // the combination every escalation guard exists for.
  mkt: { id: 3, email: 'mkt@test.id', role: 'marketing' },
};

let base;
let server;

function token({ id, email, role }, overrides = {}) {
  return jwt.sign({ sub: id, email, role, isAdmin: role === 'admin', ...overrides }, process.env.JWT_SECRET);
}

async function call(tok, method, url, body) {
  return fetch(base + url, {
    method,
    headers: { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
}

test.before(async () => {
  const schema = fs.readFileSync(path.join(__dirname, '../src/db/schema.sql'), 'utf8');
  await pool.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
  await pool.query(schema);

  await pool.query(
    `INSERT INTO roles (key, label, is_admin, is_builtin) VALUES ('marketing', 'Marketing', FALSE, FALSE)`
  );
  await pool.query(
    `INSERT INTO role_permissions (role_key, permission_key) VALUES
       ('marketing', 'admin.users'), ('marketing', 'admin.roles'), ('marketing', 'admin.permissions')`
  );

  const hash = await bcrypt.hash('password123', 4);
  for (const u of Object.values(USERS)) {
    await pool.query(
      `INSERT INTO users (id, email, password_hash, name, role, status)
       VALUES ($1, $2, $3, $4, $5, 'active')`,
      [u.id, u.email, hash, u.email.split('@')[0], u.role]
    );
  }

  server = app.listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}/api`;
});

test.after(async () => {
  await new Promise((r) => server.close(r));
  await pool.end();
});

test('migration backfills roles that predate the permission system', async () => {
  // 'marketing' was created above with only its three admin grants, so the
  // backfill must leave it alone rather than topping it up to the defaults.
  const { rows } = await pool.query(
    `SELECT count(*)::int AS n FROM role_permissions WHERE role_key = 'cs'`
  );
  assert.equal(rows[0].n, 6, 'CS should get the default grant on a fresh database');
});

test('migration does not overwrite a role an admin has already tuned', async () => {
  await pool.query(`DELETE FROM role_permissions WHERE role_key = 'cs' AND permission_key = 'leads.manage'`);
  const schema = fs.readFileSync(path.join(__dirname, '../src/db/schema.sql'), 'utf8');
  await pool.query(schema);
  const { rows } = await pool.query(
    `SELECT count(*)::int AS n FROM role_permissions WHERE role_key = 'cs'`
  );
  assert.equal(rows[0].n, 5, 'a re-run must not restore the removed permission');
});

test('feature routes follow the role, not the login', async () => {
  assert.equal((await call(token(USERS.boss), 'GET', '/users')).status, 200);
  assert.equal((await call(token(USERS.cs), 'GET', '/users')).status, 403);
  assert.equal((await call(token(USERS.cs), 'GET', '/leads')).status, 200);
  assert.equal((await call(token(USERS.cs), 'GET', '/analytics/summary')).status, 403);
  assert.equal((await call(token(USERS.cs), 'DELETE', '/quick-replies/1')).status, 403);
});

test('a token claiming admin is ignored once the role says otherwise', async () => {
  // What a demoted admin still holds until their week-long token expires.
  const stale = token(USERS.cs, { role: 'admin', isAdmin: true });
  assert.equal((await call(stale, 'GET', '/users')).status, 403);
});

test('permission changes apply without a new token', async () => {
  const cs = token(USERS.cs);
  assert.equal((await call(cs, 'GET', '/analytics/summary')).status, 403);

  await call(token(USERS.boss), 'PUT', '/roles/cs/permissions', {
    permissions: ['leads.view', 'analytics.view'],
  });

  assert.equal((await call(cs, 'GET', '/analytics/summary')).status, 200);
  const me = await (await call(cs, 'GET', '/auth/me')).json();
  assert.deepEqual(me.user.permissions.sort(), ['analytics.view', 'leads.view']);
});

test('managing users does not let you hand yourself admin', async () => {
  const mkt = token(USERS.mkt);
  assert.equal((await call(mkt, 'PUT', '/users/3/role', { role: 'admin' })).status, 400);
  assert.equal((await call(mkt, 'PUT', '/users/2/role', { role: 'admin' })).status, 403);
  assert.equal(
    (await call(mkt, 'POST', '/users', { email: 'x@t.id', name: 'X', role: 'admin', password: 'password123' })).status,
    403
  );
});

test('managing roles does not let you mint an admin role', async () => {
  const mkt = token(USERS.mkt);
  assert.equal((await call(mkt, 'POST', '/roles', { label: 'Sneaky', isAdmin: true })).status, 403);
  assert.equal((await call(token(USERS.boss), 'POST', '/roles', { label: 'Owner', isAdmin: true })).status, 201);
});

test('managing permissions does not let you widen your own role', async () => {
  const mkt = token(USERS.mkt);
  assert.equal(
    (await call(mkt, 'PUT', '/roles/marketing/permissions', { permissions: ['analytics.view'] })).status,
    400
  );
  // Another role is fair game — that is the point of the permission.
  assert.equal(
    (await call(mkt, 'PUT', '/roles/cs/permissions', { permissions: ['leads.view'] })).status,
    200
  );
});
