import { loginCustomer } from '../../_services/customerAuthService.js';
import { jsonResponse, readJson, requireDb } from '../../_services/http.js';

export async function onRequestPost({ request, env }) {
  try {
    requireDb(env);
    const result = await loginCustomer(request, env, await readJson(request));
    return jsonResponse({ ok: true, user: result.user, access_token: result.access_token }, {
      headers: { 'set-cookie': result.cookie },
    });
  } catch (error) {
    return jsonResponse({ error: error.message || 'Login failed' }, { status: error.status || 401 });
  }
}
