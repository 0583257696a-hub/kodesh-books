import { listCategories } from '../_services/catalogService.js';
import { jsonResponse, requireDb } from '../_services/http.js';

export async function onRequestGet({ request, env }) {
  try {
    requireDb(env);
    const url = new URL(request.url);
    const categories = await listCategories(env, {
      includeInactive: url.searchParams.get('include_inactive') || '',
    });

    return jsonResponse({ categories });
  } catch (error) {
    return jsonResponse({ error: error.message || 'Categories fetch failed' }, { status: 500 });
  }
}
