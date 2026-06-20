import { logAnalyticsEvent } from '../_services/analyticsService.js';
import { jsonResponse, readJson, requireDb } from '../_services/http.js';

export async function onRequestPost({ request, env }) {
  try {
    requireDb(env);
    const payload = await readJson(request);
    const event = await logAnalyticsEvent(env, payload);
    return jsonResponse({ ok: true, event });
  } catch (error) {
    return jsonResponse({ error: error.message || 'Analytics event failed' }, { status: 400 });
  }
}

