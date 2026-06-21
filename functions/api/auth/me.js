import { getCustomerSession } from '../../_services/customerAuthService.js';
import { jsonResponse, requireDb } from '../../_services/http.js';

export async function onRequestGet({ request, env }) {
  try {
    requireDb(env);
    const session = await getCustomerSession(request, env);
    if (!session) {
      return jsonResponse({ error: 'Not authenticated' }, { status: 401 });
    }
    return jsonResponse({ user: session.user });
  } catch (error) {
    return jsonResponse({ error: error.message || 'Auth check failed' }, { status: error.status || 500 });
  }
}
