import { listProducts } from '../_services/catalogService.js';
import { jsonResponse, requireDb } from '../_services/http.js';

export async function onRequestGet({ request, env }) {
  try {
    requireDb(env);
    const url = new URL(request.url);
    const products = await listProducts(env, {
      category: url.searchParams.get('category') || '',
      q: url.searchParams.get('q') || url.searchParams.get('search') || '',
      featured: url.searchParams.get('featured') || '',
      sale: url.searchParams.get('sale') || '',
      inStock: url.searchParams.get('in_stock') || url.searchParams.get('inStock') || '',
      sort: url.searchParams.get('sort') || 'newest',
      limit: url.searchParams.get('limit') || 500,
    });

    return jsonResponse({ products });
  } catch (error) {
    return jsonResponse({ error: error.message || 'Products fetch failed' }, { status: 500 });
  }
}
