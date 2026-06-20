import { listProducts } from '../_services/catalogService.js';
import { jsonResponse, requireDb } from '../_services/http.js';

export async function onRequestGet({ request, env }) {
  try {
    requireDb(env);
    const url = new URL(request.url);
    const products = await listProducts(env, {
      q: url.searchParams.get('q') || '',
      category: url.searchParams.get('category') || '',
      limit: url.searchParams.get('limit') || 100,
    });

    return jsonResponse({ products });
  } catch (error) {
    return jsonResponse({ error: error.message || 'Search failed' }, { status: 500 });
  }
}
