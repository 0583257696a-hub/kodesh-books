import { logoutAdmin } from '../../../_services/adminAuthService.js';
import { jsonResponse, requireDb } from '../../../_services/http.js';

export async function onRequestPost({ request, env }) {
  try {
    requireDb(env);
    const result = await logoutAdmin(request, env);
    return jsonResponse({ ok: true }, {
      headers: {
        'set-cookie': result.cookie,
      },
    });
  } catch (error) {
    return jsonResponse({ error: error.message || 'Admin logout failed' }, { status: 400 });
  }
}
