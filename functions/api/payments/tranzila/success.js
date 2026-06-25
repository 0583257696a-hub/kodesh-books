import { recordTranzilaCallback } from '../../../_services/tranzilaService.js';
import { jsonResponse, requireDb } from '../../../_services/http.js';

async function handle(context) {
  const { request, env } = context;
  try {
    requireDb(env);
    const result = await recordTranzilaCallback(env, request, 'success', 'verification_pending');
    return jsonResponse({ ok: true, status: 'verification_pending', ...result });
  } catch (error) {
    return jsonResponse({ error: error.message || 'Tranzila success callback failed' }, { status: error.status || 400 });
  }
}

export const onRequestGet = handle;
export const onRequestPost = handle;
