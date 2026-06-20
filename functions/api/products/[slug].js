import { getProductBySlug } from '../../_services/catalogService.js';
import { jsonResponse, requireDb } from '../../_services/http.js';

export async function onRequestGet({ params, env }) {
  try {
    requireDb(env);
    const product = await getProductBySlug(env, params.slug);
    if (!product) {
      return jsonResponse({ error: 'Product not found' }, { status: 404 });
    }

    return jsonResponse({ product });
  } catch (error) {
    return jsonResponse({ error: error.message || 'Product fetch failed' }, { status: 500 });
  }
}
