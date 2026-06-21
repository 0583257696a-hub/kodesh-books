import { createEntity, filterEntity, listEntity } from '../../_services/entityService.js';
import { jsonResponse, readJson, requireDb, sameOriginAdminRequest } from '../../_services/http.js';

const PUBLIC_READ_ENTITIES = new Set([
  'Product',
  'StoreCategory',
  'SiteSettings',
  'Testimonial',
  'ChatFAQ',
  'SearchSynonym',
  'RecommendationRule',
]);

const PUBLIC_WRITE_ENTITIES = new Set([
  'ChatSession',
  'ChatMessage',
  'ChatLead',
  'SearchAnalytics',
  'MissingSearch',
  'AnalyticsEvent',
]);

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
    const entity = params.entity;
    if (!PUBLIC_READ_ENTITIES.has(entity)) {
      return jsonResponse({ error: 'Entity is not public' }, { status: 403 });
    }
    const query = readParams(request);
    const items = Object.keys(query.filters).length
      ? await filterEntity(env, entity, query.filters, query)
      : await listEntity(env, entity, query);
    return jsonResponse({ items });
  } catch (error) {
    return jsonResponse({ error: error.message || 'Entity fetch failed' }, { status: 500 });
  }
}

export async function onRequestPost({ request, env, params }) {
  try {
    requireDb(env);
    const entity = params.entity;
    if (!PUBLIC_WRITE_ENTITIES.has(entity)) {
      return jsonResponse({ error: 'Entity is not public writable' }, { status: 403 });
    }
    if (!sameOriginAdminRequest(request)) {
      return jsonResponse({ error: 'Unauthorized request' }, { status: 401 });
    }
    const item = await createEntity(env, entity, await readJson(request));
    return jsonResponse({ item });
  } catch (error) {
    return jsonResponse({ error: error.message || 'Entity create failed' }, { status: 400 });
  }
}
