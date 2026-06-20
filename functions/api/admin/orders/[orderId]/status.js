import { updateOrderStatus } from '../../../../_services/orderService.js';
import { jsonResponse, readJson, requireDb, sameOriginAdminRequest } from '../../../../_services/http.js';
import { requireAdmin } from '../../../../_services/adminAuthService.js';

export async function onRequestPatch({ request, params, env }) {
  try {
    requireDb(env);
    if (!sameOriginAdminRequest(request)) {
      return jsonResponse({ error: 'Unauthorized request' }, { status: 401 });
    }
    await requireAdmin(request, env);

    const payload = await readJson(request);
    const order = await updateOrderStatus(env, params.orderId, payload);
    return jsonResponse({ ok: true, order });
  } catch (error) {
    return jsonResponse({ error: error.message || 'Order status update failed' }, { status: error.status || 400 });
  }
}

export async function onRequestPost(context) {
  return onRequestPatch(context);
}
