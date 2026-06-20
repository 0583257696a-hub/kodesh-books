import { loginAdmin } from '../../../_services/adminAuthService.js';
import { jsonResponse, readJson, requireDb } from '../../../_services/http.js';

export async function onRequestPost({ request, env }) {
  try {
    requireDb(env);
    const payload = await readJson(request);
    const result = await loginAdmin(request, env, payload);

    return jsonResponse({ ok: true, user: result.user }, {
      headers: {
        'set-cookie': result.cookie,
      },
    });
  } catch (error) {
    return jsonResponse(
      { error: error.status === 401 ? 'Invalid credentials' : (error.message || 'Admin login failed') },
      { status: error.status || 400 }
    );
  }
}
