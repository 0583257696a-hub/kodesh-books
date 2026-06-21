import { resetCustomerPassword } from '../../_services/customerAuthService.js';
import { jsonResponse, readJson, requireDb } from '../../_services/http.js';

export async function onRequestPost({ request, env }) {
  try {
    requireDb(env);
    await resetCustomerPassword(env, await readJson(request));
    return jsonResponse({ ok: true });
  } catch (error) {
    return jsonResponse({ error: error.message || 'Password reset failed' }, { status: error.status || 400 });
  }
}
