import { getOrder } from './orderService.js';
import { nowIso, numberValue, stringValue } from './http.js';

const TRANZILA_DIRECT_BASE_URL = 'https://direct.tranzila.com';
const TRANZILA_CURRENCY_NIS = '1';
const TRANZILA_J5_MODE = 'V';

function publicBaseUrl(request) {
  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`;
}

function getTerminalName(env) {
  return stringValue(env.TRANZILA_TERMINAL_NAME);
}

function getIframeUrl(terminalName) {
  return `${TRANZILA_DIRECT_BASE_URL}/${encodeURIComponent(terminalName)}/iframenew.php`;
}

function compactJson(value) {
  return JSON.stringify(value);
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

function buildJ5Fields(order, request, terminalName) {
  const baseUrl = publicBaseUrl(request);
  const amount = numberValue(order.total).toFixed(2);
  const description = orderDescription(order);

  return {
    sum: amount,
    cred_type: '1',
    currency: TRANZILA_CURRENCY_NIS,
    tranmode: TRANZILA_J5_MODE,
    lang: 'il',
    accessibility: '2',
    newprocess: '1',
    u71: '1',
    DCdisable: order.id,
    buttonLabel: 'אישור פרטי אשראי',
    success_url_address: `${baseUrl}/api/payments/tranzila/success?order_id=${encodeURIComponent(order.id)}`,
    fail_url_address: `${baseUrl}/api/payments/tranzila/fail?order_id=${encodeURIComponent(order.id)}`,
    notify_url_address: `${baseUrl}/api/payments/tranzila/notify?order_id=${encodeURIComponent(order.id)}`,
    company: 'אוצר הקדושה',
    contact: order.customer_name || '',
    email: order.customer_email || '',
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
}

async function upsertPaymentTransaction(env, order, terminalName, requestFields) {
  const now = nowIso();
  const existing = await env.DB.prepare(`
    SELECT * FROM payment_transactions
    WHERE order_id = ? AND provider = 'tranzila' AND status IN ('initiated', 'redirect_created', 'verification_pending')
    ORDER BY created_at DESC
    LIMIT 1
  `).bind(order.id).first();

  if (existing) {
    await env.DB.prepare(`
      UPDATE payment_transactions
      SET terminal_name = ?,
          transaction_mode = ?,
          transaction_type = ?,
          currency = ?,
          amount = ?,
          status = 'redirect_created',
          request_json = ?,
          updated_at = ?
      WHERE id = ?
    `).bind(
      terminalName,
      TRANZILA_J5_MODE,
      'j5_verification',
      TRANZILA_CURRENCY_NIS,
      numberValue(order.total),
      JSON.stringify(requestFields),
      now,
      existing.id
    ).run();

    return existing.id;
  }

  const id = crypto.randomUUID();
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
    VALUES (?, ?, ?, ?, 'j5_verification', ?, ?, 'redirect_created', ?, ?, ?)
  `).bind(
    id,
    order.id,
    terminalName,
    TRANZILA_J5_MODE,
    TRANZILA_CURRENCY_NIS,
    numberValue(order.total),
    JSON.stringify(requestFields),
    now,
    now
  ).run();

  return id;
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

function callbackTransactionId(payload) {
  return stringValue(
    payload.TranzilaTK
    || payload.tranzila_transaction_id
    || payload.transaction_id
    || payload.index
    || payload.Index
  );
}

function callbackConfirmationCode(payload) {
  return stringValue(
    payload.ConfirmationCode
    || payload.confirmation_code
    || payload.authnr
    || payload.AuthNr
  );
}

export async function recordTranzilaCallback(env, request, source, status) {
  const now = nowIso();
  const payload = await readCallbackPayload(request);
  const orderId = stringValue(payload.order_id || payload.OrderId || payload.orderId);

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

  await env.DB.prepare(`
    UPDATE payment_transactions
    SET status = ?,
        provider_transaction_id = COALESCE(?, provider_transaction_id),
        provider_confirmation_code = COALESCE(?, provider_confirmation_code),
        response_json = ?,
        notify_payload_json = ?,
        verified_at = CASE WHEN ? = 'verified' THEN COALESCE(verified_at, ?) ELSE verified_at END,
        updated_at = ?
    WHERE id = ?
  `).bind(
    status,
    callbackTransactionId(payload) || null,
    callbackConfirmationCode(payload) || null,
    JSON.stringify({ source, payload }),
    JSON.stringify(payload),
    status,
    now,
    now,
    existing.id
  ).run();

  const providerTransactionId = callbackTransactionId(payload) || existing.provider_transaction_id || existing.id;
  const paymentStatus = status === 'verified'
    ? 'j5_verified'
    : status === 'verification_failed'
      ? 'j5_failed'
      : 'j5_pending';

  await env.DB.prepare(`
    UPDATE orders
    SET payment_status = ?,
        payment_method = 'tranzila_j5',
        payment_reference = ?,
        updated_at = ?
    WHERE id = ?
  `).bind(paymentStatus, providerTransactionId, now, orderId).run();

  return { order_id: orderId, transaction_id: existing.id };
}

export function tranzilaCallbackHtml(type, result = {}) {
  const isSuccess = type === 'success';
  const title = isSuccess ? 'פרטי האשראי התקבלו' : 'אימות האשראי לא הושלם';
  const message = isSuccess
    ? 'ההזמנה נשמרה ופרטי האשראי הועברו לטרנזילה. החיוב הסופי יבוצע לאחר אישור מנהל בפאנל טרנזילה.'
    : 'לא התקבל אישור מטרנזילה. ניתן לנסות שוב או ליצור קשר עם החנות.';
  const eventType = isSuccess ? 'tranzila:j5-success' : 'tranzila:j5-fail';
  const orderId = result.order_id || '';

  return new Response(`<!doctype html>
<html lang="he" dir="rtl">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <style>
    body { margin: 0; font-family: Arial, sans-serif; background: #fcfaf5; color: #1f160f; direction: rtl; }
    .wrap { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px; text-align: center; }
    .box { max-width: 520px; border: 1px solid #e7d8b8; border-radius: 14px; background: #fff; padding: 28px; box-shadow: 0 10px 28px rgba(42, 22, 11, 0.10); }
    h1 { margin: 0 0 12px; font-size: 24px; }
    p { margin: 0; color: #6b5a45; line-height: 1.8; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="box">
      <h1>${escapeHtml(title)}</h1>
      <p>${escapeHtml(message)}</p>
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

export async function createTranzilaJ5Session(env, request, payload = {}) {
  const terminalName = getTerminalName(env);
  if (!terminalName) {
    const error = new Error('TRANZILA_TERMINAL_NAME is not configured');
    error.status = 500;
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

  const fields = buildJ5Fields(order, request, terminalName);
  const paymentTransactionId = await upsertPaymentTransaction(env, order, terminalName, fields);

  await env.DB.prepare(`
    UPDATE orders
    SET payment_status = 'j5_session_created',
        payment_method = 'tranzila_j5',
        payment_reference = ?,
        updated_at = ?
    WHERE id = ?
  `).bind(paymentTransactionId, nowIso(), order.id).run();

  return {
    provider: 'tranzila',
    mode: 'J5',
    transaction_id: paymentTransactionId,
    iframe_url: getIframeUrl(terminalName),
    method: 'POST',
    fields,
  };
}
