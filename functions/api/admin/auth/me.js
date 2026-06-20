import { requireAdmin } from '../../../_services/adminAuthService.js';
import { jsonResponse, requireDb } from '../../../_services/http.js';

export async function onRequestGet({ request, env }) {
  try {
    requireDb(env);
    const session = await requireAdmin(request, env);
    return jsonResponse({ user: session.user });
  } catch (error) {
    return jsonResponse({ error: error.message || 'Unauthorized' }, { status: error.status || 401 });
  }
}
