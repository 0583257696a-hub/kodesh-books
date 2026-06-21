import { deleteEntity, updateEntity } from '../../../../_services/entityService.js';
import { jsonResponse, readJson, requireDb, sameOriginAdminRequest } from '../../../../_services/http.js';

export async function onRequestPatch({ request, env, params }) {
  try {
    requireDb(env);
    if (!sameOriginAdminRequest(request)) {
      return jsonResponse({ error: 'Unauthorized request' }, { status: 401 });
    }
    const item = await updateEntity(env, params.entity, params.id, await readJson(request));
    return jsonResponse({ item });
  } catch (error) {
    return jsonResponse({ error: error.message || 'Admin entity update failed' }, { status: 400 });
  }
}

export async function onRequestPut(context) {
  return onRequestPatch(context);
}

export async function onRequestDelete({ request, env, params }) {
  try {
    requireDb(env);
    if (!sameOriginAdminRequest(request)) {
      return jsonResponse({ error: 'Unauthorized request' }, { status: 401 });
    }
    const result = await deleteEntity(env, params.entity, params.id);
    return jsonResponse({ item: result });
  } catch (error) {
    return jsonResponse({ error: error.message || 'Admin entity delete failed' }, { status: 400 });
  }
}
