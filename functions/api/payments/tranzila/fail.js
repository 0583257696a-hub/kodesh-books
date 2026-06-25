import { recordTranzilaCallback, tranzilaCallbackHtml } from '../../../_services/tranzilaService.js';
import { jsonResponse, requireDb } from '../../../_services/http.js';

async function handle(context) {
  const { request, env } = context;
  try {
    requireDb(env);
    const result = await recordTranzilaCallback(env, request, 'fail', 'verification_failed');
    return tranzilaCallbackHtml('fail', result);
  } catch (error) {
    return jsonResponse({ error: error.message || 'Tranzila fail callback failed' }, { status: error.status || 400 });
  }
}

export const onRequestGet = handle;
export const onRequestPost = handle;
