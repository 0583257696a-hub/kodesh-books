import { registerCustomer } from '../../_services/customerAuthService.js';
import { jsonResponse, readJson, requireDb } from '../../_services/http.js';

export async function onRequestPost({ request, env }) {
  try {
    requireDb(env);
    const result = await registerCustomer(request, env, await readJson(request));
    const init = result.cookie ? { headers: { 'set-cookie': result.cookie } } : {};
    return jsonResponse({
      ok: true,
      user: result.user,
      access_token: result.access_token || '',
      email_verification_required: Boolean(result.email_verification_required),
    }, init);
  } catch (error) {
    return jsonResponse({ error: error.message || 'Registration failed' }, { status: error.status || 400 });
  }
}
