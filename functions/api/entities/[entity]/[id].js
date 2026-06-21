import { updateEntity } from '../../../_services/entityService.js';
import { jsonResponse, readJson, requireDb, sameOriginAdminRequest } from '../../../_services/http.js';

const PUBLIC_UPDATE_ENTITIES = new Set([
  'SearchAnalytics',
  'MissingSearch',
  'ChatSession',
]);

export async function onRequestPatch({ request, env, params }) {
  try {
    requireDb(env);
    if (!PUBLIC_UPDATE_ENTITIES.has(params.entity)) {
      return jsonResponse({ error: 'Entity is not public writable' }, { status: 403 });
    }
    if (!sameOriginAdminRequest(request)) {
      return jsonResponse({ error: 'Unauthorized request' }, { status: 401 });
    }
    const item = await updateEntity(env, params.entity, params.id, await readJson(request));
    return jsonResponse({ item });
  } catch (error) {
    return jsonResponse({ error: error.message || 'Entity update failed' }, { status: 400 });
  }
}

export async function onRequestPut(context) {
  return onRequestPatch(context);
}
