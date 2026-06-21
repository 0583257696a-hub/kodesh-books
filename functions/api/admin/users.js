import { createCustomerByAdmin } from '../../_services/customerAuthService.js';
import { jsonResponse, readJson, requireDb, sameOriginAdminRequest } from '../../_services/http.js';

export async function onRequestPost({ request, env }) {
  try {
    requireDb(env);
    if (!sameOriginAdminRequest(request)) {
      return jsonResponse({ error: 'Unauthorized request' }, { status: 401 });
    }

    const result = await createCustomerByAdmin(env, await readJson(request));
    return jsonResponse({ ok: true, user: result.user });
  } catch (error) {
    return jsonResponse({ error: error.message || 'User create failed' }, { status: error.status || 400 });
  }
}
