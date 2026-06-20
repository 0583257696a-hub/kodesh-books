import { listOrders } from '../../_services/orderService.js';
import { jsonResponse, requireDb, sameOriginAdminRequest } from '../../_services/http.js';
import { requireAdmin } from '../../_services/adminAuthService.js';

export async function onRequestGet({ request, env }) {
  try {
    requireDb(env);
    if (!sameOriginAdminRequest(request)) {
      return jsonResponse({ error: 'Unauthorized request' }, { status: 401 });
    }
    await requireAdmin(request, env);

    const url = new URL(request.url);
    const orders = await listOrders(env, Number(url.searchParams.get('limit') || 500));
    return jsonResponse({ orders });
  } catch (error) {
    return jsonResponse({ error: error.message || 'Orders fetch failed' }, { status: error.status || 500 });
  }
}
