import { createOrder } from '../_services/orderService.js';
import { jsonResponse, readJson, requireDb } from '../_services/http.js';

export async function onRequestPost({ request, env }) {
  try {
    requireDb(env);
    const payload = await readJson(request);
    const order = await createOrder(env, payload);
    return jsonResponse({ ok: true, order });
  } catch (error) {
    return jsonResponse({ error: error.message || 'Order create failed' }, { status: 400 });
  }
}

