import { syncCart, updateCartItem } from '../../../_services/cartService.js';
import { jsonResponse, readJson, requireDb } from '../../../_services/http.js';

export async function onRequestPut({ request, params, env }) {
  try {
    requireDb(env);
    const payload = await readJson(request);
    const cart = await syncCart(env, { ...payload, cart_id: params.cartId });
    return jsonResponse({ ok: true, cart });
  } catch (error) {
    return jsonResponse({ error: error.message || 'Cart items update failed' }, { status: 500 });
  }
}

export async function onRequestPost({ request, params, env }) {
  try {
    requireDb(env);
    const payload = await readJson(request);
    const cart = await updateCartItem(env, params.cartId, payload);
    return jsonResponse({ ok: true, cart });
  } catch (error) {
    return jsonResponse({ error: error.message || 'Cart item update failed' }, { status: 500 });
  }
}

