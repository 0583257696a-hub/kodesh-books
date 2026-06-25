import { recordTranzilaCallback, tranzilaCallbackHtml } from '../../../_services/tranzilaService.js';
import { jsonResponse, requireDb } from '../../../_services/http.js';

async function handle(context) {
  const { request, env } = context;
  try {
    requireDb(env);
    const result = await recordTranzilaCallback(env, request, 'success', 'verified');
    return tranzilaCallbackHtml(result.status === 'verified' ? 'success' : 'fail', result);
  } catch (error) {
    return jsonResponse({ error: error.message || 'Tranzila success callback failed' }, { status: error.status || 400 });
  }
}

export const onRequestGet = handle;
export const onRequestPost = handle;
