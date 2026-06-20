import { boolSetting, nowIso, stringValue } from './http.js';
import {
  buildAdminNewOrderEmail,
  buildCustomerOrderConfirmationEmail,
  buildOrderApprovedEmail,
  buildOrderCancelledEmail,
  buildOrderDeliveredEmail,
} from './emailTemplates.js';

const RESEND_SEND_URL = 'https://api.resend.com/emails';

function getSender(env, settings = {}) {
  return stringValue(env.RESEND_FROM_EMAIL)
    || stringValue(settings.email_from)
    || stringValue(settings.from_email)
    || stringValue(settings.email);
}

function getAdminRecipient(env, settings = {}) {
  return stringValue(settings.admin_email)
    || stringValue(env.ORDER_ADMIN_EMAIL)
    || stringValue(settings.email);
}

function storeName(settings = {}) {
  return settings.store_name || 'אוצר הקדושה';
}

function dedupeKey(order, type, recipient) {
  return `order:${order.id}:${type}:${String(recipient || '').toLowerCase()}`;
}

function metadataFor(order, extra = {}) {
  return JSON.stringify({
    order_id: order.id,
    order_number: order.order_number || '',
    ...extra,
  });
}

async function ensureEmailLog(env, payload) {
  const now = nowIso();
  const existing = payload.dedupe_key
    ? await env.DB.prepare('SELECT * FROM email_logs WHERE dedupe_key = ? LIMIT 1').bind(payload.dedupe_key).first()
    : null;

  if (existing) return existing;

  const id = crypto.randomUUID();
  await env.DB.prepare(`
    INSERT OR IGNORE INTO email_logs (
      id,
      dedupe_key,
      type,
      recipient,
      subject,
      body,
      status,
      provider,
      related_type,
      related_id,
      metadata_json,
      created_at,
      updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, 'pending', 'resend', 'order', ?, ?, ?, ?)
  `).bind(
    id,
    payload.dedupe_key,
    payload.type,
    payload.recipient,
    payload.subject,
    payload.html,
    payload.related_id,
    payload.metadata_json || '{}',
    now,
    now
  ).run();

  if (payload.dedupe_key) {
    return env.DB.prepare('SELECT * FROM email_logs WHERE dedupe_key = ? LIMIT 1').bind(payload.dedupe_key).first();
  }

  return env.DB.prepare('SELECT * FROM email_logs WHERE id = ? LIMIT 1').bind(id).first();
}

async function updateEmailLog(env, id, fields = {}) {
  const now = nowIso();
  await env.DB.prepare(`
    UPDATE email_logs
    SET status = ?,
        provider_message_id = ?,
        attempt_count = attempt_count + 1,
        error_message = ?,
        sent_at = ?,
        updated_at = ?
    WHERE id = ?
  `).bind(
    fields.status,
    fields.provider_message_id || null,
    fields.error_message || null,
    fields.sent_at || null,
    now,
    id
  ).run();
}

async function createNotification(env, payload) {
  const now = nowIso();
  await env.DB.prepare(`
    INSERT INTO notifications (
      id,
      type,
      channel,
      recipient,
      title,
      message,
      status,
      related_type,
      related_id,
      email_log_id,
      metadata_json,
      created_at,
      updated_at
    )
    VALUES (?, ?, 'email', ?, ?, ?, ?, 'order', ?, ?, ?, ?, ?)
  `).bind(
    crypto.randomUUID(),
    payload.type,
    payload.recipient,
    payload.title,
    payload.message || '',
    payload.status,
    payload.related_id,
    payload.email_log_id,
    payload.metadata_json || '{}',
    now,
    now
  ).run();
}

async function sendWithResend(env, payload) {
  const response = await fetch(RESEND_SEND_URL, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${env.RESEND_API_KEY}`,
      'content-type': 'application/json',
      'idempotency-key': payload.dedupe_key,
    },
    body: JSON.stringify({
      from: payload.from,
      to: [payload.recipient],
      subject: payload.subject,
      html: payload.html,
    }),
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || data.error || `Resend failed with status ${response.status}`);
  }

  return data;
}

export async function sendOrderEmail(env, payload) {
  const log = await ensureEmailLog(env, payload);
  if (log.status === 'sent') {
    return { skipped: true, reason: 'already_sent', log_id: log.id };
  }

  if (!env.RESEND_API_KEY) {
    const errorMessage = 'RESEND_API_KEY is not configured';
    await updateEmailLog(env, log.id, { status: 'failed', error_message: errorMessage });
    await createNotification(env, {
      type: payload.type,
      recipient: payload.recipient,
      title: payload.subject,
      message: errorMessage,
      status: 'failed',
      related_id: payload.related_id,
      email_log_id: log.id,
      metadata_json: payload.metadata_json,
    });
    return { failed: true, error: errorMessage, log_id: log.id };
  }

  if (!payload.from || !payload.recipient) {
    const errorMessage = !payload.recipient ? 'Email recipient is missing' : 'Email sender is missing';
    await updateEmailLog(env, log.id, { status: 'failed', error_message: errorMessage });
    await createNotification(env, {
      type: payload.type,
      recipient: payload.recipient,
      title: payload.subject,
      message: errorMessage,
      status: 'failed',
      related_id: payload.related_id,
      email_log_id: log.id,
      metadata_json: payload.metadata_json,
    });
    return { failed: true, error: errorMessage, log_id: log.id };
  }

  try {
    const result = await sendWithResend(env, payload);
    const sentAt = nowIso();
    await updateEmailLog(env, log.id, {
      status: 'sent',
      provider_message_id: result.id || null,
      sent_at: sentAt,
    });
    await createNotification(env, {
      type: payload.type,
      recipient: payload.recipient,
      title: payload.subject,
      message: 'Email sent',
      status: 'sent',
      related_id: payload.related_id,
      email_log_id: log.id,
      metadata_json: payload.metadata_json,
    });
    return { sent: true, provider_message_id: result.id || null, log_id: log.id };
  } catch (error) {
    const errorMessage = error.message || 'Email send failed';
    await updateEmailLog(env, log.id, { status: 'failed', error_message: errorMessage });
    await createNotification(env, {
      type: payload.type,
      recipient: payload.recipient,
      title: payload.subject,
      message: errorMessage,
      status: 'failed',
      related_id: payload.related_id,
      email_log_id: log.id,
      metadata_json: payload.metadata_json,
    });
    return { failed: true, error: errorMessage, log_id: log.id };
  }
}

export async function sendOrderCreatedEmails(env, order, settings = {}) {
  const from = getSender(env, settings);
  const adminRecipient = getAdminRecipient(env, settings);
  const store = storeName(settings);
  const jobs = [];

  if (boolSetting(settings.enable_order_emails, true)) {
    jobs.push(sendOrderEmail(env, {
      type: 'admin_new_order',
      from,
      recipient: adminRecipient,
      subject: `התקבלה הזמנה חדשה באתר ${store}`,
      html: buildAdminNewOrderEmail(order, settings),
      related_id: order.id,
      dedupe_key: dedupeKey(order, 'admin_new_order', adminRecipient),
      metadata_json: metadataFor(order, { recipient_role: 'admin' }),
    }));
  }

  if (boolSetting(settings.enable_customer_order_emails, true)) {
    jobs.push(sendOrderEmail(env, {
      type: 'customer_order_received',
      from,
      recipient: order.customer_email,
      subject: `הזמנתך התקבלה באתר ${store}`,
      html: buildCustomerOrderConfirmationEmail(order, settings),
      related_id: order.id,
      dedupe_key: dedupeKey(order, 'customer_order_received', order.customer_email),
      metadata_json: metadataFor(order, { recipient_role: 'customer' }),
    }));
  }

  return Promise.all(jobs);
}

export async function sendOrderStatusEmail(env, order, status, settings = {}) {
  const from = getSender(env, settings);
  const store = storeName(settings);
  const normalizedStatus = String(status || order.status || '').trim();

  const config = {
    approved: {
      enabled: boolSetting(settings.enable_approval_emails, true),
      type: 'customer_order_approved',
      subject: `הזמנתך אושרה - ${store}`,
      html: buildOrderApprovedEmail(order, settings),
    },
    delivered: {
      enabled: boolSetting(settings.enable_delivery_emails, true),
      type: 'customer_order_delivered',
      subject: 'הזמנתך נמסרה בהצלחה',
      html: buildOrderDeliveredEmail(order, settings),
    },
    cancelled: {
      enabled: boolSetting(settings.enable_cancelled_emails, true),
      type: 'customer_order_cancelled',
      subject: `הזמנתך בוטלה - ${store}`,
      html: buildOrderCancelledEmail(order, settings),
    },
  }[normalizedStatus];

  if (!config || !config.enabled) return { skipped: true };

  return sendOrderEmail(env, {
    type: config.type,
    from,
    recipient: order.customer_email,
    subject: config.subject,
    html: config.html,
    related_id: order.id,
    dedupe_key: dedupeKey(order, config.type, order.customer_email),
    metadata_json: metadataFor(order, { status: normalizedStatus, recipient_role: 'customer' }),
  });
}
