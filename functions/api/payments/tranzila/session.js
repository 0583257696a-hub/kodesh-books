import { createTranzilaJ5Session } from '../../../_services/tranzilaService.js';
import { jsonResponse, readJson, requireDb, sameOriginAdminRequest } from '../../../_services/http.js';

export async function onRequestPost({ request, env }) {
  try {
    requireDb(env);
    if (!sameOriginAdminRequest(request)) {
      return jsonResponse({ error: 'Unauthorized request' }, { status: 401 });
    }

    const session = await createTranzilaJ5Session(env, await readJson(request));
    return jsonResponse({ ok: true, session });
  } catch (error) {
    return jsonResponse({ error: error.message || 'Tranzila session failed' }, { status: error.status || 400 });
  }
}
