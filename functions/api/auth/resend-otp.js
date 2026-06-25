import { resendCustomerOtp } from '../../_services/customerAuthService.js';
import { jsonResponse, readJson, requireDb } from '../../_services/http.js';

export async function onRequestPost({ request, env }) {
  try {
    requireDb(env);
    await resendCustomerOtp(env, await readJson(request));
    return jsonResponse({ ok: true });
  } catch (error) {
    return jsonResponse({ error: error.message || 'Verification email resend failed' }, { status: error.status || 400 });
  }
}
