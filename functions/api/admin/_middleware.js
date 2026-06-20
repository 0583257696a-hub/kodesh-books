import { requireAdmin } from '../../_services/adminAuthService.js';
import { jsonResponse, requireDb } from '../../_services/http.js';

export async function onRequest({ request, env, next }) {
  const { pathname } = new URL(request.url);

  if (pathname.startsWith('/api/admin/auth/')) {
    return next();
  }

  try {
    requireDb(env);
    await requireAdmin(request, env);
    return next();
  } catch (error) {
    return jsonResponse({ error: error.message || 'Admin authentication required' }, { status: error.status || 401 });
  }
}
