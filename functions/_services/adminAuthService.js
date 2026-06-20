import { nowIso, stringValue } from './http.js';

const ADMIN_SESSION_COOKIE = 'ok_admin_session';
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;
const PASSWORD_ITERATIONS = 210000;
const encoder = new TextEncoder();

function bytesToBase64Url(bytes) {
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function randomToken(byteLength = 32) {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return bytesToBase64Url(bytes);
}

function parseCookies(request) {
  const header = request.headers.get('cookie') || '';
  return header.split(';').reduce((acc, part) => {
    const index = part.indexOf('=');
    if (index === -1) return acc;
    const key = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();
    if (key) acc[key] = decodeURIComponent(value);
    return acc;
  }, {});
}

function serializeCookie(request, value, maxAgeSeconds = SESSION_TTL_SECONDS) {
  const url = new URL(request.url);
  const secure = url.protocol === 'https:' ? '; Secure' : '';
  return `${ADMIN_SESSION_COOKIE}=${encodeURIComponent(value)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAgeSeconds}${secure}`;
}

function expiredCookie(request) {
  return serializeCookie(request, '', 0);
}

function publicAdminUser(row) {
  return {
    id: row.id,
    email: row.email,
    full_name: row.full_name || '',
    role: row.role || 'admin',
  };
}

function unauthorized(message = 'Unauthorized') {
  const error = new Error(message);
  error.status = 401;
  return error;
}

function constantTimeEqual(a, b) {
  const left = String(a || '');
  const right = String(b || '');
  let diff = left.length ^ right.length;
  const maxLength = Math.max(left.length, right.length);

  for (let index = 0; index < maxLength; index += 1) {
    diff |= (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0);
  }

  return diff === 0;
}

async function sha256(value) {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(value));
  return bytesToBase64Url(new Uint8Array(digest));
}

export async function hashPassword(password, salt = randomToken(18), iterations = PASSWORD_ITERATIONS) {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      hash: 'SHA-256',
      salt: encoder.encode(salt),
      iterations,
    },
    key,
    256
  );

  return {
    password_hash: bytesToBase64Url(new Uint8Array(bits)),
    password_salt: salt,
    password_iterations: iterations,
  };
}

async function verifyPassword(password, user) {
  const result = await hashPassword(password, user.password_salt, Number(user.password_iterations || PASSWORD_ITERATIONS));
  return constantTimeEqual(result.password_hash, user.password_hash);
}

export async function ensureBootstrapAdmin(env) {
  const countRow = await env.DB.prepare('SELECT COUNT(*) AS count FROM admin_users').first();
  if (Number(countRow?.count || 0) > 0) return null;

  const email = stringValue(env.BOOTSTRAP_ADMIN_EMAIL).toLowerCase();
  const password = stringValue(env.BOOTSTRAP_ADMIN_PASSWORD);

  if (!email || !password) {
    const error = new Error('Bootstrap admin is not configured');
    error.status = 503;
    throw error;
  }

  const id = crypto.randomUUID();
  const now = nowIso();
  const hashed = await hashPassword(password);

  await env.DB.prepare(`
    INSERT INTO admin_users (
      id,
      email,
      password_hash,
      password_salt,
      password_iterations,
      full_name,
      role,
      active,
      created_at,
      updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, 'admin', 1, ?, ?)
  `).bind(
    id,
    email,
    hashed.password_hash,
    hashed.password_salt,
    hashed.password_iterations,
    email.split('@')[0] || 'Admin',
    now,
    now
  ).run();

  return id;
}

async function findAdminByEmail(env, email) {
  return env.DB.prepare('SELECT * FROM admin_users WHERE email = ? LIMIT 1')
    .bind(stringValue(email).toLowerCase())
    .first();
}

export async function createAdminSession(request, env, adminUser) {
  const token = randomToken(32);
  const sessionHash = await sha256(token);
  const id = crypto.randomUUID();
  const now = nowIso();
  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000).toISOString();

  await env.DB.prepare(`
    INSERT INTO sessions (id, admin_user_id, session_hash, user_agent, expires_at, created_at, last_seen_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    adminUser.id,
    sessionHash,
    request.headers.get('user-agent') || '',
    expiresAt,
    now,
    now
  ).run();

  return {
    token,
    cookie: serializeCookie(request, token),
  };
}

export async function loginAdmin(request, env, payload = {}) {
  await ensureBootstrapAdmin(env);

  const email = stringValue(payload.email).toLowerCase();
  const password = stringValue(payload.password);
  if (!email || !password) {
    throw unauthorized('Missing email or password');
  }

  const adminUser = await findAdminByEmail(env, email);
  if (!adminUser || adminUser.active === 0) {
    throw unauthorized('Invalid credentials');
  }

  const valid = await verifyPassword(password, adminUser);
  if (!valid) {
    throw unauthorized('Invalid credentials');
  }

  const now = nowIso();
  await env.DB.prepare('UPDATE admin_users SET last_login_at = ?, updated_at = ? WHERE id = ?')
    .bind(now, now, adminUser.id)
    .run();

  const session = await createAdminSession(request, env, adminUser);
  return {
    user: publicAdminUser(adminUser),
    cookie: session.cookie,
  };
}

export async function getAdminSession(request, env) {
  const token = parseCookies(request)[ADMIN_SESSION_COOKIE];
  if (!token) return null;

  const sessionHash = await sha256(token);
  const now = nowIso();
  const row = await env.DB.prepare(`
    SELECT
      sessions.id AS session_id,
      sessions.expires_at,
      admin_users.id,
      admin_users.email,
      admin_users.full_name,
      admin_users.role,
      admin_users.active
    FROM sessions
    INNER JOIN admin_users ON admin_users.id = sessions.admin_user_id
    WHERE sessions.session_hash = ?
      AND sessions.expires_at > ?
      AND admin_users.active = 1
    LIMIT 1
  `).bind(sessionHash, now).first();

  if (!row) return null;

  await env.DB.prepare('UPDATE sessions SET last_seen_at = ? WHERE id = ?')
    .bind(now, row.session_id)
    .run();

  return {
    session_id: row.session_id,
    user: publicAdminUser(row),
  };
}

export async function requireAdmin(request, env) {
  const session = await getAdminSession(request, env);
  if (!session) {
    throw unauthorized('Admin authentication required');
  }
  return session;
}

export async function logoutAdmin(request, env) {
  const token = parseCookies(request)[ADMIN_SESSION_COOKIE];
  if (token) {
    const sessionHash = await sha256(token);
    await env.DB.prepare('DELETE FROM sessions WHERE session_hash = ?').bind(sessionHash).run();
  }

  return {
    cookie: expiredCookie(request),
  };
}
