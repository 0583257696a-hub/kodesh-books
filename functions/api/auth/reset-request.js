import { createResetToken } from '../../_services/customerAuthService.js';
import { jsonResponse, readJson, requireDb } from '../../_services/http.js';

export async function onRequestPost({ request, env }) {
  try {
    requireDb(env);
    const payload = await readJson(request);
    await createResetToken(env, payload.email);
    return jsonResponse({ ok: true });
  } catch {
    return jsonResponse({ ok: true });
  }
}
