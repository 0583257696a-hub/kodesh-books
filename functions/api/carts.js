import { getCart, syncCart } from '../_services/cartService.js';
import { jsonResponse, readJson, requireDb } from '../_services/http.js';

export async function onRequestGet({ request, env }) {
  try {
    requireDb(env);
    const url = new URL(request.url);
    const cartId = url.searchParams.get('id') || url.searchParams.get('cart_id');
    if (!cartId) {
      return jsonResponse({ error: 'Missing cart id' }, { status: 400 });
    }

    const cart = await getCart(env, cartId);
    if (!cart) {
      return jsonResponse({ error: 'Cart not found' }, { status: 404 });
    }

    return jsonResponse({ cart });
  } catch (error) {
    return jsonResponse({ error: error.message || 'Cart fetch failed' }, { status: 500 });
  }
}

export async function onRequestPost({ request, env }) {
  try {
    requireDb(env);
    const payload = await readJson(request);
    const cart = await syncCart(env, payload);
    return jsonResponse({ ok: true, cart });
  } catch (error) {
    return jsonResponse({ error: error.message || 'Cart sync failed' }, { status: 500 });
  }
}

