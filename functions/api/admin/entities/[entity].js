import { createEntity, filterEntity, listEntity } from '../../../_services/entityService.js';
import { jsonResponse, readJson, requireDb, sameOriginAdminRequest } from '../../../_services/http.js';

function readParams(request) {
  const url = new URL(request.url);
  const filtersRaw = url.searchParams.get('filters');
  let filters = {};
  try {
    filters = filtersRaw ? JSON.parse(filtersRaw) : {};
  } catch {
    filters = {};
  }
  return {
    sort: url.searchParams.get('sort') || '',
    limit: Number(url.searchParams.get('limit') || 500),
    filters,
  };
}

export async function onRequestGet({ request, env, params }) {
  try {
    requireDb(env);
    if (!sameOriginAdminRequest(request)) {
      return jsonResponse({ error: 'Unauthorized request' }, { status: 401 });
    }
    const query = readParams(request);
    const items = Object.keys(query.filters).length
      ? await filterEntity(env, params.entity, query.filters, query)
      : await listEntity(env, params.entity, query);
    return jsonResponse({ items });
  } catch (error) {
    return jsonResponse({ error: error.message || 'Admin entity fetch failed' }, { status: 500 });
  }
}

export async function onRequestPost({ request, env, params }) {
  try {
    requireDb(env);
    if (!sameOriginAdminRequest(request)) {
      return jsonResponse({ error: 'Unauthorized request' }, { status: 401 });
    }
    const item = await createEntity(env, params.entity, await readJson(request));
    return jsonResponse({ item });
  } catch (error) {
    return jsonResponse({ error: error.message || 'Admin entity create failed' }, { status: 400 });
  }
}
