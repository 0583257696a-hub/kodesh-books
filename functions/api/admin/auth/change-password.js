import { changeAdminPassword } from '../../../_services/adminAuthService.js';
import { jsonResponse, readJson, requireDb } from '../../../_services/http.js';

export async function onRequestPost({ request, env }) {
  try {
    requireDb(env);
    const payload = await readJson(request);
    const result = await changeAdminPassword(request, env, payload);
    return jsonResponse({ ok: true, user: result.user });
  } catch (error) {
    return jsonResponse(
      { error: error.status === 401 ? 'Invalid current password' : (error.message || 'Admin password update failed') },
      { status: error.status || 400 }
    );
  }
}
