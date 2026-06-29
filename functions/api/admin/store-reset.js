import { resetStoreActivity } from '../../_services/adminResetService.js';
import { jsonResponse, readJson, requireDb, sameOriginAdminRequest } from '../../_services/http.js';

const CONFIRMATION_TEXT = 'איפוס חנות';

export async function onRequestPost({ request, env }) {
  try {
    requireDb(env);

    if (!sameOriginAdminRequest(request)) {
      return jsonResponse({ error: 'Unauthorized request' }, { status: 401 });
    }

    const payload = await readJson(request);
    if (String(payload.confirmation || '').trim() !== CONFIRMATION_TEXT) {
      return jsonResponse({ error: `יש להקליד בדיוק: ${CONFIRMATION_TEXT}` }, { status: 400 });
    }

    const result = await resetStoreActivity(env);
    return jsonResponse({ ok: true, result });
  } catch (error) {
    return jsonResponse({ error: error.message || 'Store reset failed' }, { status: 500 });
  }
}
