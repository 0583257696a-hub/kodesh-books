export function jsonResponse(data, init = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      ...(init.headers || {}),
    },
  });
}

export async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

export function requireDb(env) {
  if (!env?.DB) {
    throw new Error('Missing DB D1 binding');
  }
}

export function sameOriginAdminRequest(request) {
  const url = new URL(request.url);
  const origin = request.headers.get('origin');
  const fetchSite = request.headers.get('sec-fetch-site');

  if (origin && origin !== url.origin) return false;
  if (fetchSite && !['same-origin', 'same-site', 'none'].includes(fetchSite)) return false;

  return true;
}

export function numberValue(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function stringValue(value) {
  return String(value || '').trim();
}

export function boolSetting(value, fallback = false) {
  if (value === undefined || value === null || value === '') return fallback;
  return ['true', '1', 'yes', 'on', 'כן', 'פעיל'].includes(String(value).trim().toLowerCase());
}

export async function getSettingsMap(env) {
  const rows = await env.DB.prepare('SELECT key, value FROM site_settings').all();
  return Object.fromEntries((rows.results || []).map((row) => [row.key, row.value]));
}

export function parseJson(value, fallback) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

export function nowIso() {
  return new Date().toISOString();
}

