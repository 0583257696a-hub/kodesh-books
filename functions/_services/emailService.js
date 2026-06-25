import { boolSetting, nowIso, stringValue } from './http.js';
import {
  buildAdminNewOrderEmail,
  buildCustomerOrderConfirmationEmail,
  buildEmailVerificationEmail,
  buildOrderApprovedEmail,
  buildOrderCancelledEmail,
  buildOrderDeliveredEmail,
} from './emailTemplates.js';

const MAILJET_DEFAULT_HOST = 'api.mailjet.com';
const MAILJET_SEND_PATH = '/v3.1/send';

function mailjetApiKey(env) {
  const combined = stringValue(env.MAILJET_API_KEY);
  if (combined.includes(':')) {
    return combined.split(':')[0].trim();
  }
  return combined || stringValue(env.MJ_APIKEY_PUBLIC);
}

function mailjetSecretKey(env) {
  const combined = stringValue(env.MAILJET_API_KEY);
  const explicitSecret = stringValue(env.MAILJET_SECRET_KEY) || stringValue(env.MJ_APIKEY_PRIVATE);
  if (explicitSecret) return explicitSecret;
  if (combined.includes(':')) {
    return combined.split(':').slice(1).join(':').trim();
  }
  return '';
}

function mailjetSendUrl(env) {
  const region = stringValue(env.MAILJET_API_REGION).toLowerCase();
  const regionalHost = region ? `api.${region}.mailjet.com` : '';
  const host = (stringValue(env.MAILJET_API_HOST) || regionalHost || MAILJET_DEFAULT_HOST)
    .replace(/^https?:\/\//i, '')
    .replace(/\/+$/g, '');
  return `https://${host}${MAILJET_SEND_PATH}`;
}

function htmlToText(html = '') {
  return String(html)
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h[1-6]|tr)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

function getSender(env, settings = {}) {
  const sender = stringValue(env.MAILJET_FROM_EMAIL)
    || stringValue(settings.email_from)
    || stringValue(settings.from_email)
    || stringValue(settings.email);
  const senderName = stringValue(env.MAILJET_FROM_NAME)
    || stringValue(settings.email_from_name)
    || storeName(settings);

  if (!sender || sender.includes('<')) return sender;
  return senderName ? `${senderName} <${sender}>` : sender;
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

function authMetadata(extra = {}) {
  return JSON.stringify(extra);
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
    VALUES (?, ?, ?, ?, ?, ?, 'pending', 'mailjet', ?, ?, ?, ?, ?)
  `).bind(
    id,
    payload.dedupe_key,
    payload.type,
    payload.recipient,
    payload.subject,
    payload.html,
    payload.related_type || 'order',
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
    VALUES (?, ?, 'email', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    crypto.randomUUID(),
    payload.type,
    payload.recipient,
    payload.title,
    payload.message || '',
    payload.status,
    payload.related_type || 'order',
    payload.related_id,
    payload.email_log_id,
    payload.metadata_json || '{}',
    now,
    now
  ).run();
}

function parseEmailAddress(value = '') {
  const text = String(value || '').trim();
  const match = text.match(/^(.*?)<([^>]+)>$/);
  if (match) {
    return {
      Email: match[2].trim(),
      Name: match[1].replace(/^"|"$/g, '').trim() || undefined,
    };
  }
  return { Email: text };
}

function mailjetMessageId(data) {
  const message = data?.Messages?.[0];
  return message?.To?.[0]?.MessageID || message?.To?.[0]?.MessageUUID || message?.MessageID || null;
}

function mailjetError(data, response) {
  const message = data?.Messages?.[0];
  const errors = message?.Errors || data?.ErrorInfo || data?.ErrorMessage || data?.ErrorCode;
  if (Array.isArray(errors) && errors.length) {
    return errors.map((error) => error.ErrorMessage || error.ErrorInfo || error.ErrorCode || String(error)).join('; ');
  }
  return stringValue(errors) || `Mailjet failed with status ${response.status}`;
}

async function sendWithMailjet(env, payload) {
  const credentials = btoa(`${mailjetApiKey(env)}:${mailjetSecretKey(env)}`);
  const response = await fetch(mailjetSendUrl(env), {
    method: 'POST',
    headers: {
      authorization: `Basic ${credentials}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      Messages: [
        {
          From: parseEmailAddress(payload.from),
          To: [parseEmailAddress(payload.recipient)],
          Subject: payload.subject,
          HTMLPart: payload.html,
          TextPart: payload.text || htmlToText(payload.html),
          CustomID: payload.dedupe_key,
        },
      ],
    }),
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(mailjetError(data, response));
  }

  return data;
}

export async function sendOrderEmail(env, payload) {
  const log = await ensureEmailLog(env, payload);
  if (log.status === 'sent') {
    return { skipped: true, reason: 'already_sent', log_id: log.id };
  }

  if (!mailjetApiKey(env) || !mailjetSecretKey(env)) {
    const errorMessage = 'MAILJET_API_KEY/MJ_APIKEY_PUBLIC or MAILJET_SECRET_KEY/MJ_APIKEY_PRIVATE is not configured';
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
    const result = await sendWithMailjet(env, payload);
    const sentAt = nowIso();
    const providerMessageId = mailjetMessageId(result);
    await updateEmailLog(env, log.id, {
      status: 'sent',
      provider_message_id: providerMessageId,
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
    return { sent: true, provider_message_id: providerMessageId, log_id: log.id };
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

export async function sendEmailVerificationCode(env, customer, code, settings = {}) {
  const from = getSender(env, settings);
  const store = storeName(settings);
  const recipient = customer.email;

  return sendOrderEmail(env, {
    type: 'customer_email_verification',
    from,
    recipient,
    subject: `קוד אימות לחשבון שלך - ${store}`,
    html: buildEmailVerificationEmail({ code, email: recipient }, settings),
    related_type: 'customer',
    related_id: customer.id,
    dedupe_key: `customer:${customer.id}:email_verification:${Date.now()}`,
    metadata_json: authMetadata({ customer_id: customer.id, email: recipient }),
  });
}
