import { getOrder } from '../../_services/orderService.js';
import { jsonResponse, requireDb } from '../../_services/http.js';

export async function onRequestGet({ params, env }) {
  try {
    requireDb(env);
    const order = await getOrder(env, params.orderId);
    if (!order) {
      return jsonResponse({ error: 'Order not found' }, { status: 404 });
    }

    return jsonResponse({ order });
  } catch (error) {
    return jsonResponse({ error: error.message || 'Order fetch failed' }, { status: 500 });
  }
}

