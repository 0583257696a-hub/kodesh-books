import { hashPassword } from './adminAuthService.js';
import { getSettingsMap, nowIso, stringValue } from './http.js';
import { sendEmailVerificationCode } from './emailService.js';

const CUSTOMER_SESSION_COOKIE = 'ok_customer_session';
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;
const PASSWORD_ITERATIONS = 100000;
const EMAIL_VERIFICATION_TTL_MS = 15 * 60 * 1000;
const EMAIL_VERIFICATION_RESEND_COOLDOWN_MS = 60 * 1000;
const encoder = new TextEncoder();

function bytesToBase64Url(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function randomToken(byteLength = 32) {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return bytesToBase64Url(bytes);
}

function randomOtpCode() {
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  const value = new DataView(bytes.buffer).getUint32(0);
  return String(value % 1000000).padStart(6, '0');
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
  return `${CUSTOMER_SESSION_COOKIE}=${encodeURIComponent(value)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAgeSeconds}${secure}`;
}

function expiredCookie(request) {
  return serializeCookie(request, '', 0);
}

async function sha256(value) {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(value));
  return bytesToBase64Url(new Uint8Array(digest));
}

async function hashVerificationCode(customerId, code) {
  return sha256(`${customerId}:${code}`);
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

function publicCustomer(row = {}) {
  return {
    id: row.id,
    email: row.email || '',
    full_name: row.full_name || '',
    phone: row.phone || '',
    role: row.role || 'user',
    city: row.city || '',
    shipping_address: row.shipping_address || '',
    created_date: row.created_at,
    updated_date: row.updated_at,
  };
}

function unauthorized(message = 'Unauthorized') {
  const error = new Error(message);
  error.status = 401;
  throw error;
}

async function findCustomerByEmail(env, email) {
  return env.DB.prepare('SELECT * FROM customers WHERE lower(email) = lower(?) LIMIT 1')
    .bind(stringValue(email))
    .first();
}

async function findCustomerById(env, id) {
  return env.DB.prepare('SELECT * FROM customers WHERE id = ? LIMIT 1')
    .bind(stringValue(id))
    .first();
}

async function findAdminByEmail(env, email) {
  return env.DB.prepare('SELECT * FROM admin_users WHERE lower(email) = lower(?) LIMIT 1')
    .bind(stringValue(email))
    .first();
}

export async function syncCustomerAdminAccess(env, customerOrId) {
  const customer = typeof customerOrId === 'string'
    ? await findCustomerById(env, customerOrId)
    : customerOrId;

  if (!customer?.email) return null;

  const email = stringValue(customer.email).toLowerCase();
  const existingAdmin = await findAdminByEmail(env, email);
  const now = nowIso();

  if (customer.role !== 'admin') {
    if (existingAdmin) {
      await env.DB.prepare('UPDATE admin_users SET active = 0, updated_at = ? WHERE id = ?')
        .bind(now, existingAdmin.id)
        .run();
    }
    return null;
  }

  if (!customer.password_hash || !customer.password_salt) {
    return null;
  }

  if (existingAdmin) {
    await env.DB.prepare(`
      UPDATE admin_users
      SET password_hash = ?,
          password_salt = ?,
          password_iterations = ?,
          full_name = ?,
          active = 1,
          updated_at = ?
      WHERE id = ?
    `).bind(
      customer.password_hash,
      customer.password_salt,
      Number(customer.password_iterations || PASSWORD_ITERATIONS),
      stringValue(customer.full_name) || email.split('@')[0] || 'Admin',
      now,
      existingAdmin.id
    ).run();
    return existingAdmin.id;
  }

  const adminId = crypto.randomUUID();
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
    adminId,
    email,
    customer.password_hash,
    customer.password_salt,
    Number(customer.password_iterations || PASSWORD_ITERATIONS),
    stringValue(customer.full_name) || email.split('@')[0] || 'Admin',
    now,
    now
  ).run();

  return adminId;
}

export async function disableAdminAccessForEmail(env, email) {
  const normalized = stringValue(email).toLowerCase();
  if (!normalized) return;

  await env.DB.prepare('UPDATE admin_users SET active = 0, updated_at = ? WHERE lower(email) = lower(?)')
    .bind(nowIso(), normalized)
    .run();
}

async function createCustomerSession(request, env, customer) {
  const token = randomToken(32);
  const sessionHash = await sha256(token);
  const id = crypto.randomUUID();
  const now = nowIso();
  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000).toISOString();

  await env.DB.prepare(`
    INSERT INTO customer_sessions (id, customer_id, session_hash, user_agent, expires_at, created_at, last_seen_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    customer.id,
    sessionHash,
    request.headers.get('user-agent') || '',
    expiresAt,
    now,
    now
  ).run();

  return { token, cookie: serializeCookie(request, token) };
}

async function verifyPassword(password, customer) {
  if (!customer?.password_hash || !customer?.password_salt) return false;
  const result = await hashPassword(password, customer.password_salt, Number(customer.password_iterations || PASSWORD_ITERATIONS));
  return constantTimeEqual(result.password_hash, customer.password_hash);
}

async function sendCustomerVerificationCode(env, customer) {
  const code = randomOtpCode();
  const now = nowIso();
  const expiresAt = new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS).toISOString();
  const codeHash = await hashVerificationCode(customer.id, code);

  await env.DB.prepare(`
    UPDATE customers
    SET email_verified = 0,
        email_verification_code_hash = ?,
        email_verification_expires_at = ?,
        email_verification_sent_at = ?,
        email_verification_attempts = 0,
        updated_at = ?
    WHERE id = ?
  `).bind(codeHash, expiresAt, now, now, customer.id).run();

  const settings = await getSettingsMap(env).catch(() => ({}));
  const result = await sendEmailVerificationCode(env, customer, code, settings);

  if (result?.failed) {
    const error = new Error(result.error || 'Verification email failed');
    error.status = 503;
    throw error;
  }

  return { sent: true, expires_at: expiresAt };
}

export async function registerCustomer(request, env, payload = {}) {
  const email = stringValue(payload.email).toLowerCase();
  const password = stringValue(payload.password);
  if (!email || !password) unauthorized('Missing email or password');
  if (password.length < 6) {
    const error = new Error('Password must contain at least 6 characters');
    error.status = 400;
    throw error;
  }

  const existing = await findCustomerByEmail(env, email);
  if (existing) {
    if (Number(existing.email_verified || 0) !== 1) {
      const hashed = await hashPassword(password);
      await env.DB.prepare(`
        UPDATE customers
        SET password_hash = ?,
            password_salt = ?,
            password_iterations = ?,
            full_name = COALESCE(NULLIF(?, ''), full_name),
            phone = COALESCE(NULLIF(?, ''), phone),
            updated_at = ?
        WHERE id = ?
      `).bind(
        hashed.password_hash,
        hashed.password_salt,
        hashed.password_iterations,
        stringValue(payload.full_name),
        stringValue(payload.phone),
        nowIso(),
        existing.id
      ).run();
      const customer = await findCustomerByEmail(env, email);
      await sendCustomerVerificationCode(env, customer);
      return { user: publicCustomer(customer), email_verification_required: true };
    }

    const error = new Error('Email already exists');
    error.status = 409;
    throw error;
  }

  const id = crypto.randomUUID();
  const now = nowIso();
  const hashed = await hashPassword(password);
  await env.DB.prepare(`
    INSERT INTO customers (
      id, email, full_name, phone, role, password_hash, password_salt, password_iterations,
      email_verified, created_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
  `).bind(
    id,
    email,
    stringValue(payload.full_name),
    stringValue(payload.phone),
    'user',
    hashed.password_hash,
    hashed.password_salt,
    hashed.password_iterations,
    now,
    now
  ).run();

  const customer = await findCustomerByEmail(env, email);
  await sendCustomerVerificationCode(env, customer);
  return { user: publicCustomer(customer), email_verification_required: true };
}

export async function createCustomerByAdmin(env, payload = {}) {
  const email = stringValue(payload.email).toLowerCase();
  const password = stringValue(payload.password);
  if (!email || !password) unauthorized('Missing email or password');
  if (password.length < 6) {
    const error = new Error('Password must contain at least 6 characters');
    error.status = 400;
    throw error;
  }

  const existing = await findCustomerByEmail(env, email);
  if (existing) {
    const error = new Error('Email already exists');
    error.status = 409;
    throw error;
  }

  const id = crypto.randomUUID();
  const now = nowIso();
  const role = payload.role === 'admin' ? 'admin' : 'user';
  const hashed = await hashPassword(password);

  await env.DB.prepare(`
    INSERT INTO customers (
      id,
      email,
      full_name,
      phone,
      role,
      password_hash,
      password_salt,
      password_iterations,
      email_verified,
      created_at,
      updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
  `).bind(
    id,
    email,
    stringValue(payload.full_name),
    stringValue(payload.phone),
    role,
    hashed.password_hash,
    hashed.password_salt,
    hashed.password_iterations,
    now,
    now
  ).run();

  const customer = await findCustomerByEmail(env, email);
  await syncCustomerAdminAccess(env, customer);
  return { user: publicCustomer(customer) };
}

export async function loginCustomer(request, env, payload = {}) {
  const email = stringValue(payload.email).toLowerCase();
  const password = stringValue(payload.password);
  if (!email || !password) unauthorized('Missing email or password');

  const customer = await findCustomerByEmail(env, email);
  if (!customer || !(await verifyPassword(password, customer))) {
    unauthorized('Invalid credentials');
  }

  if (Number(customer.email_verified || 0) !== 1) {
    await sendCustomerVerificationCode(env, customer);
    const error = new Error('Email verification required');
    error.status = 403;
    throw error;
  }

  const now = nowIso();
  await env.DB.prepare('UPDATE customers SET last_activity_at = ?, updated_at = ? WHERE id = ?')
    .bind(now, now, customer.id)
    .run();

  const session = await createCustomerSession(request, env, customer);
  return { user: publicCustomer(customer), cookie: session.cookie, access_token: session.token };
}

export async function verifyCustomerOtp(request, env, payload = {}) {
  const email = stringValue(payload.email).toLowerCase();
  const code = stringValue(payload.otpCode || payload.otp_code || payload.code);
  if (!email || !code) unauthorized('Missing email or verification code');

  const customer = await findCustomerByEmail(env, email);
  if (!customer) unauthorized('Invalid verification code');

  if (Number(customer.email_verified || 0) === 1) {
    const session = await createCustomerSession(request, env, customer);
    return { user: publicCustomer(customer), cookie: session.cookie, access_token: session.token };
  }

  if (!customer.email_verification_code_hash || !customer.email_verification_expires_at) {
    unauthorized('Invalid verification code');
  }

  if (new Date(customer.email_verification_expires_at).getTime() < Date.now()) {
    unauthorized('Verification code expired');
  }

  if (Number(customer.email_verification_attempts || 0) >= 8) {
    unauthorized('Too many verification attempts');
  }

  const codeHash = await hashVerificationCode(customer.id, code);
  if (!constantTimeEqual(codeHash, customer.email_verification_code_hash)) {
    await env.DB.prepare(`
      UPDATE customers
      SET email_verification_attempts = email_verification_attempts + 1,
          updated_at = ?
      WHERE id = ?
    `).bind(nowIso(), customer.id).run();
    unauthorized('Invalid verification code');
  }

  const now = nowIso();
  await env.DB.prepare(`
    UPDATE customers
    SET email_verified = 1,
        email_verification_code_hash = NULL,
        email_verification_expires_at = NULL,
        email_verification_sent_at = NULL,
        email_verification_attempts = 0,
        updated_at = ?
    WHERE id = ?
  `).bind(now, customer.id).run();

  const verifiedCustomer = await findCustomerByEmail(env, email);
  const session = await createCustomerSession(request, env, verifiedCustomer);
  return { user: publicCustomer(verifiedCustomer), cookie: session.cookie, access_token: session.token };
}

export async function resendCustomerOtp(env, payload = {}) {
  const email = stringValue(payload.email).toLowerCase();
  if (!email) unauthorized('Missing email');

  const customer = await findCustomerByEmail(env, email);
  if (!customer || Number(customer.email_verified || 0) === 1) {
    return { ok: true };
  }

  const lastSentAt = customer.email_verification_sent_at
    ? new Date(customer.email_verification_sent_at).getTime()
    : 0;
  if (lastSentAt && Date.now() - lastSentAt < EMAIL_VERIFICATION_RESEND_COOLDOWN_MS) {
    const error = new Error('Please wait before requesting another code');
    error.status = 429;
    throw error;
  }

  await sendCustomerVerificationCode(env, customer);
  return { ok: true };
}

export async function getCustomerSession(request, env) {
  const token = parseCookies(request)[CUSTOMER_SESSION_COOKIE];
  if (!token) return null;

  const sessionHash = await sha256(token);
  const now = nowIso();
  const row = await env.DB.prepare(`
    SELECT
      customer_sessions.id AS session_id,
      customer_sessions.expires_at,
      customers.*
    FROM customer_sessions
    INNER JOIN customers ON customers.id = customer_sessions.customer_id
    WHERE customer_sessions.session_hash = ?
      AND customer_sessions.expires_at > ?
    LIMIT 1
  `).bind(sessionHash, now).first();

  if (!row) return null;

  await env.DB.prepare('UPDATE customer_sessions SET last_seen_at = ? WHERE id = ?')
    .bind(now, row.session_id)
    .run();

  return { session_id: row.session_id, user: publicCustomer(row) };
}

export async function logoutCustomer(request, env) {
  const token = parseCookies(request)[CUSTOMER_SESSION_COOKIE];
  if (token) {
    const sessionHash = await sha256(token);
    await env.DB.prepare('DELETE FROM customer_sessions WHERE session_hash = ?').bind(sessionHash).run();
  }
  return { cookie: expiredCookie(request) };
}

export async function createResetToken(env, email) {
  const customer = await findCustomerByEmail(env, email);
  if (!customer) return null;
  const token = randomToken(24);
  const tokenHash = await sha256(token);
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  await env.DB.prepare('UPDATE customers SET reset_token_hash = ?, reset_token_expires_at = ?, updated_at = ? WHERE id = ?')
    .bind(tokenHash, expiresAt, nowIso(), customer.id)
    .run();
  return token;
}

export async function resetCustomerPassword(env, payload = {}) {
  const resetToken = stringValue(payload.resetToken);
  const newPassword = stringValue(payload.newPassword);
  if (!resetToken || !newPassword) {
    const error = new Error('Missing reset token or password');
    error.status = 400;
    throw error;
  }
  const tokenHash = await sha256(resetToken);
  const customer = await env.DB.prepare(`
    SELECT * FROM customers
    WHERE reset_token_hash = ?
      AND reset_token_expires_at > ?
    LIMIT 1
  `).bind(tokenHash, nowIso()).first();
  if (!customer) unauthorized('Invalid reset token');

  const hashed = await hashPassword(newPassword);
  await env.DB.prepare(`
    UPDATE customers
    SET password_hash = ?, password_salt = ?, password_iterations = ?,
        reset_token_hash = NULL, reset_token_expires_at = NULL, updated_at = ?
    WHERE id = ?
  `).bind(hashed.password_hash, hashed.password_salt, hashed.password_iterations, nowIso(), customer.id).run();

  return { ok: true };
}
