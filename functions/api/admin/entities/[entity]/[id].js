import { deleteEntity, updateEntity } from '../../../../_services/entityService.js';
import { jsonResponse, readJson, requireDb, sameOriginAdminRequest } from '../../../../_services/http.js';

function decodeParam(value) {
  try {
    return decodeURIComponent(String(value || ''));
  } catch {
    return String(value || '');
  }
}

export async function onRequestPatch({ request, env, params }) {
  try {
    requireDb(env);
    if (!sameOriginAdminRequest(request)) {
      return jsonResponse({ error: 'Unauthorized request' }, { status: 401 });
    }
    const item = await updateEntity(env, decodeParam(params.entity), decodeParam(params.id), await readJson(request));
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
    const result = await deleteEntity(env, decodeParam(params.entity), decodeParam(params.id));
    return jsonResponse({ item: result });
  } catch (error) {
    return jsonResponse({ error: error.message || 'Admin entity delete failed' }, { status: 400 });
  }
}
