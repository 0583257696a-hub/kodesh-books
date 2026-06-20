import { buildPrintableOrderHtml, getOrder } from '../../../../_services/orderService.js';
import { getSettingsMap, requireDb, sameOriginAdminRequest } from '../../../../_services/http.js';
import { requireAdmin } from '../../../../_services/adminAuthService.js';

export async function onRequestGet({ request, params, env }) {
  try {
    requireDb(env);
    if (!sameOriginAdminRequest(request)) {
      return new Response('Unauthorized request', { status: 401 });
    }
    await requireAdmin(request, env);

    const order = await getOrder(env, params.orderId);
    if (!order) {
      return new Response('Order not found', { status: 404 });
    }

    const settings = await getSettingsMap(env);
    return new Response(buildPrintableOrderHtml(order, settings), {
      headers: {
        'content-type': 'text/html; charset=utf-8',
      },
    });
  } catch (error) {
    return new Response(error.message || 'Order print failed', { status: error.status || 500 });
  }
}
