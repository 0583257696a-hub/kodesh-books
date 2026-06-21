import { logoutCustomer } from '../../_services/customerAuthService.js';
import { jsonResponse, requireDb } from '../../_services/http.js';

export async function onRequestPost({ request, env }) {
  try {
    requireDb(env);
    const result = await logoutCustomer(request, env);
    return jsonResponse({ ok: true }, {
      headers: { 'set-cookie': result.cookie },
    });
  } catch (error) {
    return jsonResponse({ error: error.message || 'Logout failed' }, { status: error.status || 500 });
  }
}
