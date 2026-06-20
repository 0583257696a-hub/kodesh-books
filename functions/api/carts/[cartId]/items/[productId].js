import { removeCartItem, updateCartItem } from '../../../../_services/cartService.js';
import { jsonResponse, readJson, requireDb } from '../../../../_services/http.js';

export async function onRequestPatch({ request, params, env }) {
  try {
    requireDb(env);
    const payload = await readJson(request);
    const cart = await updateCartItem(env, params.cartId, { ...payload, product_id: params.productId });
    return jsonResponse({ ok: true, cart });
  } catch (error) {
    return jsonResponse({ error: error.message || 'Cart item patch failed' }, { status: 500 });
  }
}

export async function onRequestDelete({ params, env }) {
  try {
    requireDb(env);
    const cart = await removeCartItem(env, params.cartId, params.productId);
    return jsonResponse({ ok: true, cart });
  } catch (error) {
    return jsonResponse({ error: error.message || 'Cart item delete failed' }, { status: 500 });
  }
}

