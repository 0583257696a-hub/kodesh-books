import { getOrder } from './orderService.js';
import { nowIso, numberValue, stringValue } from './http.js';

const TRANZILA_DEFAULT_IFRAME_BASE_URL = 'https://directng.tranzila.com';
const TRANZILA_HANDSHAKE_URL = 'https://api.tranzila.com/v1/handshake/create';
const TRANZILA_CURRENCY_NIS = '1';
const TRANZILA_J5_MODE = 'V';
const TRANZILA_DEFAULT_IFRAME_PATH = 'iframenew.php';
const DEFAULT_PUBLIC_BASE_URL = 'https://otzar-hakodesh.shop';
const TRANZILA_APPROVED_CODES = new Set(['000', '777']);
const TRANZILA_PENDING_CODES = new Set(['shva']);

function normalizeBaseUrl(value) {
  return stringValue(value).replace(/\/+$/, '');
}

function publicBaseUrl(env) {
  const configuredUrl = normalizeBaseUrl(env.TRANZILA_CALLBACK_BASE_URL || env.SITE_URL || env.PUBLIC_SITE_URL);
  if (configuredUrl) {
    return configuredUrl;
  }

  return DEFAULT_PUBLIC_BASE_URL;
}

function getTerminalName(env) {
  return stringValue(env.TRANZILA_TERMINAL_NAME);
}

function getTransactionMode(env) {
  return stringValue(env.TRANZILA_TRANMODE) || TRANZILA_J5_MODE;
}

function getIframeBaseUrl(env) {
  const baseUrl = normalizeBaseUrl(env.TRANZILA_IFRAME_BASE_URL) || TRANZILA_DEFAULT_IFRAME_BASE_URL;
  if (!/^https:\/\/[a-z0-9.-]+$/i.test(baseUrl)) {
    const error = new Error('TRANZILA_IFRAME_BASE_URL must be a valid https URL');
    error.status = 500;
    throw error;
  }
  return baseUrl;
}

function isFlagEnabled(value, fallback = true) {
  const normalized = stringValue(value).toLowerCase();
  if (!normalized) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(normalized);
}

function getHandshakePassword(env) {
  return stringValue(
    env.TRANZILA_HANDSHAKE_PASSWORD
    || env.TRANZILA_TOKEN_PASSWORD
    || env.TRANZILA_PASSWORD
  );
}

function getIframePath(env) {
  const iframePath = stringValue(env.TRANZILA_IFRAME_PATH) || TRANZILA_DEFAULT_IFRAME_PATH;
  const normalizedPath = iframePath.replace(/^\/+/, '');

  if (!/^[a-zA-Z0-9_-]+\.php$/.test(normalizedPath)) {
    const error = new Error('TRANZILA_IFRAME_PATH must be a Tranzila PHP page name, for example iframe.php');
    error.status = 500;
    throw error;
  }

  return normalizedPath;
}

function getIframeTemplate(env) {
  return stringValue(env.TRANZILA_IFRAME_TEMPLATE);
}

function getIframeUrl(env, terminalName) {
  const url = new URL(`${getIframeBaseUrl(env)}/${encodeURIComponent(terminalName)}/${getIframePath(env)}`);
  const template = getIframeTemplate(env);

  if (template) {
    url.searchParams.set('template', template);
  }

  return url.toString();
}

function transactionUnsupportedMessage(codeOrMessage = '') {
  const value = stringValue(codeOrMessage);
  if (!value) return '';
  if (!/(275497|illegal operation)/i.test(value)) return '';
  return 'המסוף אינו מורשה ל-J5 / Verification / Tokenization. יש לפנות ל-Tranzila להפעלת המודול.';
}

function safeTranzilaRequestLog({ iframeUrl, terminalName, fields }) {
  return {
    iframeUrl,
    terminalName,
    sum: fields.sum,
    currency: fields.currency,
    tranmode: fields.tranmode,
    myid: fields.myid || '',
    DCdisable: fields.DCdisable,
    success_url_address: fields.success_url_address,
    fail_url_address: fields.fail_url_address,
    notify_url_address: fields.notify_url_address,
  };
}

function compactJson(value) {
  return JSON.stringify(value);
}

function parseHandshakeResponse(text) {
  const trimmed = String(text || '').trim();
  let data = {};

  if (!trimmed) {
    return { token: '', data };
  }

  try {
    data = JSON.parse(trimmed);
  } catch {
    data = Object.fromEntries(new URLSearchParams(trimmed).entries());
  }

  return {
    token: stringValue(data.thtk || data.token || data.TranzilaTK),
    data,
  };
}

async function createHandshake(env, terminalName, amount) {
  const handshakePassword = getHandshakePassword(env);
  if (!handshakePassword) {
    return null;
  }

  const url = new URL(TRANZILA_HANDSHAKE_URL);
  url.searchParams.set('supplier', terminalName);
  url.searchParams.set('sum', amount);
  url.searchParams.set('TranzilaPW', handshakePassword);

  const response = await fetch(url.toString(), { method: 'GET' });
  const text = await response.text();
  const parsed = parseHandshakeResponse(text);

  if (!response.ok || !parsed.token) {
    const error = new Error('Tranzila handshake failed');
    error.status = 502;
    error.details = parsed.data;
    throw error;
  }

  return parsed;
}

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function orderDescription(order) {
  const orderNumber = order.order_number || order.id;
  return `Order ${orderNumber}`;
}

function orderRemarks(order) {
  const itemNames = (order.items || [])
    .map((item) => `${item.product_name} x${numberValue(item.quantity, 1)}`)
    .join(', ');
  return `${orderDescription(order)}${itemNames ? ` - ${itemNames}` : ''}`.slice(0, 250);
}

function orderProductsPayload(order) {
  return (order.items || []).slice(0, 10).map((item) => ({
    product_name: String(item.product_name || '').slice(0, 118),
    product_quantity: numberValue(item.quantity, 1),
    product_price: numberValue(item.price ?? item.unit_price),
  }));
}

function buildJ5Fields(order, terminalName, env, paymentTransactionId, handshake) {
  const baseUrl = publicBaseUrl(env);
  const amount = numberValue(order.final_amount ?? order.total).toFixed(2);
  const description = orderDescription(order);
  const template = getIframeTemplate(env);
  const transactionMode = getTransactionMode(env);
  const country = stringValue(order.country || order.shipping_country || env.TRANZILA_DEFAULT_COUNTRY) || 'IL';
  const zip = stringValue(order.zip || order.postal_code || order.shipping_zip || env.TRANZILA_DEFAULT_ZIP) || '0000000';

  const fields = {
    sum: amount,
    supplier: terminalName,
    cred_type: '1',
    currency: TRANZILA_CURRENCY_NIS,
    tranmode: transactionMode,
    lang: 'il',
    accessibility: '2',
    newprocess: '1',
    new_process: '1',
    u71: '1',
    orderId: order.id,
    DCdisable: paymentTransactionId,
    buttonLabel: 'אימות כרטיס',
    success_url_address: `${baseUrl}/api/payments/tranzila/success?order_id=${encodeURIComponent(order.id)}`,
    fail_url_address: `${baseUrl}/api/payments/tranzila/fail?order_id=${encodeURIComponent(order.id)}`,
    notify_url_address: `${baseUrl}/api/payments/tranzila/notify?order_id=${encodeURIComponent(order.id)}`,
    company: 'אוצר הקדושה',
    contact: order.customer_name || '',
    email: order.customer_email || '',
    country,
    zip,
    address: order.shipping_address || '',
    phone: order.customer_phone || '',
    city: order.city || '',
    pdesc: description,
    remarks: orderRemarks(order),
    json_purchase_data: compactJson(orderProductsPayload(order)),
    trBgColor: 'FCFAF5',
    trTextColor: '1F160F',
    trButtonColor: 'D4AF37',
    nologo: '1',
  };

  if (template) {
    fields.template = template;
  }

  if (handshake?.token) {
    fields.thtk = handshake.token;
  }

  return fields;
}

async function getOpenPaymentTransaction(env, orderId) {
  return env.DB.prepare(`
    SELECT * FROM payment_transactions
    WHERE order_id = ? AND provider = 'tranzila' AND status IN ('initiated', 'redirect_created', 'verification_pending')
    ORDER BY created_at DESC
    LIMIT 1
  `).bind(orderId).first();
}

async function getOrCreatePaymentTransaction(env, order, terminalName) {
  const existing = await getOpenPaymentTransaction(env, order.id);

  if (existing) {
    return existing.id;
  }

  const id = crypto.randomUUID();
  const now = nowIso();

  await env.DB.prepare(`
    INSERT INTO payment_transactions (
      id,
      order_id,
      terminal_name,
      transaction_mode,
      transaction_type,
      currency,
      amount,
      status,
      request_json,
      created_at,
      updated_at
    )
    VALUES (?, ?, ?, ?, 'j5_verification', ?, ?, 'initiated', '{}', ?, ?)
  `).bind(
    id,
    order.id,
    terminalName,
    getTransactionMode(env),
    TRANZILA_CURRENCY_NIS,
    numberValue(order.final_amount ?? order.total),
    now,
    now
  ).run();

  return id;
}

async function updatePaymentTransactionRequest(env, order, terminalName, transactionId, requestFields, handshake, iframeUrl) {
  const requestLog = safeTranzilaRequestLog({ iframeUrl, terminalName, fields: requestFields });
  await env.DB.prepare(`
    UPDATE payment_transactions
    SET terminal_name = ?,
        transaction_mode = ?,
        transaction_type = ?,
        currency = ?,
        amount = ?,
        status = 'redirect_created',
        request_json = ?,
        error_message = NULL,
        updated_at = ?
    WHERE id = ?
  `).bind(
    terminalName,
    getTransactionMode(env),
    'j5_verification',
    TRANZILA_CURRENCY_NIS,
    numberValue(order.final_amount ?? order.total),
    JSON.stringify({
      ...requestFields,
      iframe_url: iframeUrl,
      terminal_name: terminalName,
      safe_debug_log: requestLog,
      handshake: handshake?.data || null,
    }),
    nowIso(),
    transactionId
  ).run();
}

async function markPaymentTransactionError(env, orderId, error) {
  const existing = await getOpenPaymentTransaction(env, orderId);
  if (!existing) return;

  await env.DB.prepare(`
    UPDATE payment_transactions
    SET error_message = ?,
        updated_at = ?
    WHERE id = ?
  `).bind(error.message || 'Tranzila session failed', nowIso(), existing.id).run();
}

async function readCallbackPayload(request) {
  const url = new URL(request.url);
  const payload = Object.fromEntries(url.searchParams.entries());

  if (request.method !== 'GET') {
    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
      const form = await request.formData();
      for (const [key, value] of form.entries()) {
        payload[key] = typeof value === 'string' ? value : value.name;
      }
    } else if (contentType.includes('application/json')) {
      Object.assign(payload, await request.json().catch(() => ({})));
    } else {
      const text = await request.text().catch(() => '');
      if (text) payload.raw_body = text;
    }
  }

  return payload;
}

const SENSITIVE_PAYLOAD_KEYS = new Set([
  'ccno_full',
  'card_number',
  'cardNumber',
  'credit_card',
  'pan',
  'cvv',
  'cvv2',
  'cccvv',
  'expdate',
  'expyear',
  'expmonth',
  'expiry_month',
  'expiry_year',
  'expiry',
  'expiration',
  'myid',
  'id_number',
  'identity_number',
  'holder_id',
]);

function sanitizeTranzilaPayload(payload = {}) {
  return Object.entries(payload).reduce((acc, [key, value]) => {
    const text = stringValue(Array.isArray(value) ? value[0] : value);
    if (SENSITIVE_PAYLOAD_KEYS.has(key)) {
      acc[key] = '[REMOVED]';
      return acc;
    }
    if (key.toLowerCase() === 'ccno' && text.length > 4) {
      acc[key] = text.slice(-4);
      return acc;
    }
    acc[key] = text;
    return acc;
  }, {});
}

function callbackToken(payload) {
  return stringValue(
    payload.TranzilaTK
    || payload.tranzilaTK
    || payload.tranzila_token
    || payload.card_token
    || payload.token
  );
}

function callbackCardLast4(payload) {
  const value = stringValue(payload.ccno || payload.card_last4 || payload.last4);
  return value ? value.slice(-4) : '';
}

function callbackTransactionId(payload) {
  return stringValue(
    payload.tranzila_transaction_id
    || payload.transaction_id
    || payload.txn_id
    || payload.reference_txn_id
    || payload.index
    || payload.Index
  );
}

function callbackTranzilaIndex(payload) {
  return stringValue(payload.index || payload.Index || payload.tranzila_index);
}

function callbackMerchantTransactionId(payload) {
  return stringValue(
    payload.DCdisable
    || payload.dcdisable
    || payload.dc_disable
  );
}

function callbackConfirmationCode(payload) {
  return stringValue(
    payload.ConfirmationCode
    || payload.confirmation_code
    || payload.auth_number
    || payload.AuthNumber
    || payload.authnr
    || payload.AuthNr
  );
}

function callbackResponseMessage(payload) {
  return stringValue(
    payload.ResponseDescription
    || payload.response_description
    || payload.response_message
    || payload.errdesc
    || payload.error
    || payload.message
    || payload.raw_body
  );
}

function callbackAmount(payload) {
  return numberValue(payload.sum || payload.Sum || payload.amount || payload.Amount, null);
}

function callbackCurrency(payload) {
  return stringValue(payload.currency || payload.Currency) || TRANZILA_CURRENCY_NIS;
}

function callbackCardType(payload) {
  return stringValue(payload.cardtype || payload.card_type || payload.cardType);
}

function callbackCardIssuer(payload) {
  return stringValue(payload.cardissuer || payload.card_issuer || payload.cardIssuer);
}

function callbackCardAcquirer(payload) {
  return stringValue(payload.cardacquirer || payload.card_acquirer || payload.cardAcquirer);
}

function callbackApplicationCode(payload) {
  const rawBodyCode = stringValue(payload.raw_body).match(/\b(\d{3,6})\b/)?.[1] || '';
  const code = stringValue(
    payload.Response
    || payload.response
    || payload.ResponseCode
    || payload.responseCode
    || payload.response_code
    || payload.status
    || payload.Status
    || payload.shva_response
    || payload.shvaResponse
    || rawBodyCode
  );

  return code.toLowerCase() === 'shva' ? 'shva' : code.padStart(3, '0');
}

function resolveCallbackStatus(source, fallbackStatus, payload) {
  const code = callbackApplicationCode(payload);

  if (code) {
    if (TRANZILA_APPROVED_CODES.has(code)) return 'verified';
    if (TRANZILA_PENDING_CODES.has(code)) return 'verification_pending';
    return 'verification_failed';
  }

  if (source === 'fail') return 'verification_failed';
  return fallbackStatus;
}

export async function recordTranzilaCallback(env, request, source, status) {
  const now = nowIso();
  const payload = await readCallbackPayload(request);
  const resolvedStatus = resolveCallbackStatus(source, status, payload);
  const applicationCode = callbackApplicationCode(payload);
  let orderId = stringValue(payload.order_id || payload.OrderId || payload.orderId);
  const merchantTransactionId = callbackMerchantTransactionId(payload);

  if (!orderId && merchantTransactionId) {
    const transaction = await env.DB.prepare(`
      SELECT order_id FROM payment_transactions
      WHERE id = ? AND provider = 'tranzila'
      LIMIT 1
    `).bind(merchantTransactionId).first();
    orderId = stringValue(transaction?.order_id);
  }

  if (!orderId) {
    const error = new Error('Missing order_id');
    error.status = 400;
    throw error;
  }

  const existing = await env.DB.prepare(`
    SELECT * FROM payment_transactions
    WHERE order_id = ? AND provider = 'tranzila'
    ORDER BY created_at DESC
    LIMIT 1
  `).bind(orderId).first();

  if (!existing) {
    const error = new Error('Payment transaction not found');
    error.status = 404;
    throw error;
  }

  const order = await getOrder(env, orderId);
  if (!order) {
    const error = new Error('Order not found');
    error.status = 404;
    throw error;
  }

  const cleanPayload = sanitizeTranzilaPayload(payload);
  const responseMessage = callbackResponseMessage(payload);
  const token = callbackToken(payload);
  const cardLast4 = callbackCardLast4(payload);
  const providerTransactionId = callbackTransactionId(payload) || existing.provider_transaction_id || existing.id;
  const confirmationCode = callbackConfirmationCode(payload);
  const expectedAmount = numberValue(order.final_amount ?? order.total);
  const returnedAmount = callbackAmount(payload);
  const amountMatches = returnedAmount === null || returnedAmount <= 0 || returnedAmount.toFixed(2) === expectedAmount.toFixed(2);
  const finalStatus = amountMatches ? resolvedStatus : 'verification_failed';
  const finalApplicationCode = amountMatches ? applicationCode : (applicationCode || 'AMOUNT_MISMATCH');
  const unsupportedTerminalMessage = getTransactionMode(env) === 'V'
    ? transactionUnsupportedMessage(`${applicationCode || ''} ${responseMessage || ''} ${payload.raw_body || ''}`)
    : '';
  const finalResponseMessage = amountMatches
    ? (unsupportedTerminalMessage || responseMessage)
    : 'Amount mismatch';

  await env.DB.prepare(`
    UPDATE payment_transactions
    SET status = ?,
        provider_transaction_id = COALESCE(?, provider_transaction_id),
        provider_confirmation_code = COALESCE(?, provider_confirmation_code),
        payment_stage = 'verification',
        response_code = ?,
        response_message = ?,
        tranzila_index = COALESCE(?, tranzila_index),
        tranzila_token = COALESCE(?, tranzila_token),
        card_last4 = COALESCE(?, card_last4),
        card_type = COALESCE(?, card_type),
        card_issuer = COALESCE(?, card_issuer),
        card_acquirer = COALESCE(?, card_acquirer),
        auth_number = COALESCE(?, auth_number),
        response_json = ?,
        notify_payload_json = ?,
        raw_payload_json = ?,
        verified_at = CASE WHEN ? = 'verified' THEN COALESCE(verified_at, ?) ELSE verified_at END,
        error_message = CASE WHEN ? = 'verification_failed' THEN ? ELSE NULL END,
        updated_at = ?
    WHERE id = ?
  `).bind(
    finalStatus,
    providerTransactionId || null,
    confirmationCode || null,
    finalApplicationCode || null,
    finalResponseMessage || null,
    callbackTranzilaIndex(payload) || null,
    token || null,
    cardLast4 || null,
    callbackCardType(payload) || null,
    callbackCardIssuer(payload) || null,
    callbackCardAcquirer(payload) || null,
    confirmationCode || null,
    JSON.stringify({ source, application_code: finalApplicationCode || null, payload: cleanPayload }),
    JSON.stringify(cleanPayload),
    JSON.stringify(cleanPayload),
    finalStatus,
    now,
    finalStatus,
    finalResponseMessage || finalApplicationCode || 'Verification failed',
    now,
    existing.id
  ).run();

  const paymentStatus = finalStatus === 'verified'
    ? 'payment_verified_waiting_manager_approval'
    : finalStatus === 'verification_failed'
      ? 'payment_verification_failed'
      : 'pending_payment_verification';

  await env.DB.prepare(`
    UPDATE orders
    SET payment_status = ?,
        payment_method = 'tranzila_j5',
        payment_reference = ?,
        payment_provider = 'tranzila',
        manager_approval_status = CASE WHEN ? = 'verified' THEN 'waiting' ELSE manager_approval_status END,
        tranzila_token = CASE WHEN ? = 'verified' THEN COALESCE(?, tranzila_token) ELSE tranzila_token END,
        card_last4 = CASE WHEN ? = 'verified' THEN COALESCE(?, card_last4) ELSE card_last4 END,
        verified_at = CASE WHEN ? = 'verified' THEN COALESCE(verified_at, ?) ELSE verified_at END,
        payment_error = CASE WHEN ? = 'verification_failed' THEN ? ELSE NULL END,
        updated_at = ?
    WHERE id = ?
  `).bind(
    paymentStatus,
    providerTransactionId,
    finalStatus,
    finalStatus,
    token || null,
    finalStatus,
    cardLast4 || null,
    finalStatus,
    now,
    finalStatus,
    finalResponseMessage || finalApplicationCode || 'Verification failed',
    now,
    orderId
  ).run();

  return {
    order_id: orderId,
    transaction_id: existing.id,
    status: finalStatus,
    application_code: finalApplicationCode || null,
    amount_mismatch: !amountMatches,
  };
}

export function tranzilaCallbackHtml(type, result = {}) {
  const isSuccess = type === 'success';
  const title = isSuccess ? 'פרטי האשראי התקבלו' : 'אימות האשראי לא הושלם';
  const message = isSuccess
    ? 'ההזמנה נשמרה ופרטי האשראי הועברו לטרנזילה. החיוב הסופי יבוצע לאחר אישור מנהל בפאנל טרנזילה.'
    : 'לא התקבל אישור מטרנזילה. ניתן לנסות שוב או ליצור קשר עם החנות.';
  const eventType = isSuccess ? 'tranzila:j5-success' : 'tranzila:j5-fail';
  const orderId = result.order_id || '';
  const applicationCode = result.application_code || '';
  const statusClass = isSuccess ? 'success' : 'fail';
  const statusMark = isSuccess ? '✓' : '!';
  const eyebrow = isSuccess ? 'העסקה נשמרה לאישור' : 'נדרש ניסיון נוסף';
  const note = isSuccess
    ? 'אין צורך לבצע פעולה נוספת כרגע. מנהל החנות יאשר את החיוב הסופי בפאנל טרנזילה.'
    : 'ההזמנה נשארה במערכת, אך פרטי האשראי לא אומתו. אפשר לחזור למסך התשלום ולנסות שוב.';
  const primaryAction = isSuccess ? 'חזרה לחנות' : 'חזרה לתשלום';
  const primaryHref = isSuccess ? '/' : '/checkout';

  return new Response(`<!doctype html>
<html lang="he" dir="rtl">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <style>
    :root {
      color-scheme: light;
      --ink: #1f160f;
      --muted: #6b5a45;
      --cream: #fcfaf5;
      --paper: #ffffff;
      --gold: #d4af37;
      --gold-dark: #9f7318;
      --line: #e7d8b8;
      --success: #28734b;
      --success-soft: #edf8f1;
      --fail: #9f2f2f;
      --fail-soft: #fff1ef;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: Arial, "Noto Sans Hebrew", sans-serif;
      background:
        radial-gradient(circle at 20% 10%, rgba(212, 175, 55, 0.12), transparent 28%),
        linear-gradient(180deg, #fffaf0 0%, var(--cream) 100%);
      color: var(--ink);
      direction: rtl;
    }
    .wrap {
      min-height: 100vh;
      display: grid;
      place-items: center;
      padding: 28px;
      text-align: center;
    }
    .box {
      width: min(620px, 100%);
      border: 1px solid var(--line);
      border-radius: 16px;
      background: rgba(255, 255, 255, 0.96);
      padding: 34px 30px;
      box-shadow: 0 18px 42px rgba(42, 22, 11, 0.12);
    }
    .mark {
      width: 68px;
      height: 68px;
      display: grid;
      place-items: center;
      margin: 0 auto 18px;
      border-radius: 999px;
      font-size: 36px;
      font-weight: 800;
      line-height: 1;
    }
    .success .mark {
      color: var(--success);
      background: var(--success-soft);
      border: 1px solid rgba(40, 115, 75, 0.24);
    }
    .fail .mark {
      color: var(--fail);
      background: var(--fail-soft);
      border: 1px solid rgba(159, 47, 47, 0.22);
    }
    .eyebrow {
      margin-bottom: 8px;
      color: var(--gold-dark);
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 0;
    }
    h1 {
      margin: 0 0 12px;
      font-size: clamp(24px, 4vw, 34px);
      line-height: 1.2;
    }
    p {
      margin: 0 auto;
      max-width: 500px;
      color: var(--muted);
      line-height: 1.8;
      font-size: 16px;
    }
    .details {
      display: grid;
      gap: 10px;
      margin: 24px 0;
      padding: 16px;
      border: 1px solid var(--line);
      border-radius: 12px;
      background: #fffaf1;
      text-align: right;
    }
    .row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      color: var(--muted);
      font-size: 14px;
    }
    .value {
      color: var(--ink);
      font-weight: 700;
      direction: ltr;
      overflow-wrap: anywhere;
      text-align: left;
    }
    .notice {
      margin-top: 18px;
      color: var(--muted);
      font-size: 14px;
      line-height: 1.7;
    }
    .actions {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 10px;
      margin-top: 24px;
    }
    a {
      min-width: 140px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 44px;
      border-radius: 10px;
      padding: 10px 18px;
      color: var(--ink);
      text-decoration: none;
      font-weight: 700;
      border: 1px solid var(--line);
      background: #fff;
    }
    a.primary {
      border-color: transparent;
      background: linear-gradient(135deg, var(--gold), #c99722);
      box-shadow: 0 8px 18px rgba(159, 115, 24, 0.22);
    }
    @media (max-width: 520px) {
      .wrap { padding: 16px; }
      .box { padding: 28px 18px; }
      .row { display: grid; gap: 4px; text-align: center; }
      .value { text-align: center; }
      a { width: 100%; }
    }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="box ${statusClass}">
      <div class="mark" aria-hidden="true">${statusMark}</div>
      <div class="eyebrow">${escapeHtml(eyebrow)}</div>
      <h1>${escapeHtml(title)}</h1>
      <p>${escapeHtml(message)}</p>
      <div class="details">
        <div class="row">
          <span>סטטוס</span>
          <span class="value">${escapeHtml(isSuccess ? 'ממתין לאישור מנהל' : 'לא אומת')}</span>
        </div>
        ${orderId ? `<div class="row"><span>מזהה הזמנה</span><span class="value">${escapeHtml(orderId)}</span></div>` : ''}
        ${applicationCode ? `<div class="row"><span>קוד תשובה</span><span class="value">${escapeHtml(applicationCode)}</span></div>` : ''}
      </div>
      <div class="notice">${escapeHtml(note)}</div>
      <div class="actions">
        <a class="primary" href="${primaryHref}" target="_top">${escapeHtml(primaryAction)}</a>
        <a href="/contact" target="_top">יצירת קשר</a>
      </div>
    </div>
  </div>
  <script>
    window.parent && window.parent.postMessage(${JSON.stringify({ type: eventType, orderId })}, window.location.origin);
  </script>
</body>
</html>`, {
    headers: { 'content-type': 'text/html; charset=utf-8' },
  });
}

export async function createTranzilaJ5Session(env, payload = {}) {
  const terminalName = getTerminalName(env);
  if (!terminalName) {
    const error = new Error('TRANZILA_TERMINAL_NAME is not configured');
    error.status = 500;
    throw error;
  }

  if (!isFlagEnabled(env.TRANZILA_ENABLE_J5, true)) {
    const error = new Error('Tranzila J5 verification is disabled');
    error.status = 503;
    throw error;
  }

  const orderId = stringValue(payload.order_id || payload.orderId);
  const customerEmail = stringValue(payload.customer_email || payload.customerEmail).toLowerCase();
  if (!orderId || !customerEmail) {
    const error = new Error('Missing order_id or customer_email');
    error.status = 400;
    throw error;
  }

  const order = await getOrder(env, orderId);
  if (!order || stringValue(order.customer_email).toLowerCase() !== customerEmail) {
    const error = new Error('Order not found');
    error.status = 404;
    throw error;
  }

  if (order.payment_status === 'paid') {
    const error = new Error('Order is already paid');
    error.status = 409;
    throw error;
  }

  const paymentTransactionId = await getOrCreatePaymentTransaction(env, order, terminalName);
  const amount = numberValue(order.final_amount ?? order.total).toFixed(2);
  let handshake = null;

  try {
    handshake = await createHandshake(env, terminalName, amount);
  } catch (error) {
    await markPaymentTransactionError(env, order.id, error);
    throw error;
  }

  const fields = buildJ5Fields(order, terminalName, env, paymentTransactionId, handshake);
  const iframeUrl = getIframeUrl(env, terminalName);
  const requestLog = safeTranzilaRequestLog({ iframeUrl, terminalName, fields });
  console.info('Tranzila iframe request', requestLog);
  await updatePaymentTransactionRequest(env, order, terminalName, paymentTransactionId, fields, handshake, iframeUrl);

  await env.DB.prepare(`
    UPDATE orders
    SET payment_status = 'pending_payment_verification',
        payment_method = 'tranzila_j5',
        payment_provider = 'tranzila',
        payment_reference = ?,
        final_amount = ?,
        currency = ?,
        payment_error = NULL,
        updated_at = ?
    WHERE id = ?
  `).bind(paymentTransactionId, numberValue(order.final_amount ?? order.total), TRANZILA_CURRENCY_NIS, nowIso(), order.id).run();

  return {
    provider: 'tranzila',
    mode: 'J5',
    transaction_id: paymentTransactionId,
    iframe_url: iframeUrl,
    debug_log: requestLog,
    method: 'POST',
    fields,
    handshake_enabled: Boolean(handshake?.token),
  };
}
