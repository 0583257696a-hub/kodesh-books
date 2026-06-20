import { getCart, syncCart } from '../../_services/cartService.js';
import { jsonResponse, readJson, requireDb } from '../../_services/http.js';

export async function onRequestGet({ params, env }) {
  try {
    requireDb(env);
    const cart = await getCart(env, params.cartId);
    if (!cart) {
      return jsonResponse({ error: 'Cart not found' }, { status: 404 });
    }

    return jsonResponse({ cart });
  } catch (error) {
    return jsonResponse({ error: error.message || 'Cart fetch failed' }, { status: 500 });
  }
}

export async function onRequestPut({ request, params, env }) {
  try {
    requireDb(env);
    const payload = await readJson(request);
    const cart = await syncCart(env, { ...payload, cart_id: params.cartId });
    return jsonResponse({ ok: true, cart });
  } catch (error) {
    return jsonResponse({ error: error.message || 'Cart update failed' }, { status: 500 });
  }
}

export async function onRequestDelete({ params, env }) {
  try {
    requireDb(env);
    await syncCart(env, { cart_id: params.cartId, items: [], status: 'expired' });
    return jsonResponse({ ok: true });
  } catch (error) {
    return jsonResponse({ error: error.message || 'Cart clear failed' }, { status: 500 });
  }
}

