import { boolSetting, nowIso, stringValue } from './http.js';
import {
  buildAdminNewOrderEmail,
  buildCustomerOrderConfirmationEmail,
  buildEmailVerificationEmail,
  buildOrderApprovedEmail,
  buildOrderCancelledEmail,
  buildOrderDeliveredEmail,
} from './emailTemplates.js';
import {
  emailProviderConfigError,
  getEmailProvider,
  sendWithEmailProvider,
} from './emailProviders.js';

function getSender(env, settings = {}, provider = 'mailjet') {
  const sender = stringValue(env.EMAIL_FROM)
    || (provider === 'resend' ? stringValue(env.RESEND_FROM_EMAIL) : '')
    || (provider === 'mailjet' ? stringValue(env.MAILJET_FROM_EMAIL) : '')
    || (provider === 'cloudflare' ? stringValue(env.CLOUDFLARE_EMAIL_FROM) : '')
    || stringValue(env.MAILJET_FROM_EMAIL)
    || stringValue(env.RESEND_FROM_EMAIL)
    || stringValue(env.CLOUDFLARE_EMAIL_FROM)
    || stringValue(settings.email_from)
    || stringValue(settings.from_email)
    || stringValue(settings.email);
  const senderName = stringValue(env.EMAIL_FROM_NAME)
    || (provider === 'resend' ? stringValue(env.RESEND_FROM_NAME) : '')
    || (provider === 'mailjet' ? stringValue(env.MAILJET_FROM_NAME) : '')
    || stringValue(env.MAILJET_FROM_NAME)
    || stringValue(env.RESEND_FROM_NAME)
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

function normalizeProviderPayload(env, payload = {}) {
  return getEmailProvider(env, { email_provider: payload.provider || payload.email_provider });
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
    VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    payload.dedupe_key,
    payload.type,
    payload.recipient,
    payload.subject,
    payload.html,
    payload.provider || 'mailjet',
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
        provider = COALESCE(?, provider),
        provider_message_id = ?,
        attempt_count = attempt_count + 1,
        error_message = ?,
        sent_at = ?,
        updated_at = ?
    WHERE id = ?
  `).bind(
    fields.status,
    fields.provider || null,
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

export async function sendOrderEmail(env, payload) {
  const provider = normalizeProviderPayload(env, payload);
  const emailPayload = { ...payload, provider };
  const log = await ensureEmailLog(env, emailPayload);
  if (log.status === 'sent') {
    return { skipped: true, reason: 'already_sent', log_id: log.id };
  }

  const configError = emailProviderConfigError(env, provider);
  if (configError) {
    await updateEmailLog(env, log.id, { status: 'failed', provider, error_message: configError });
    await createNotification(env, {
      type: emailPayload.type,
      recipient: emailPayload.recipient,
      title: emailPayload.subject,
      message: configError,
      status: 'failed',
      related_id: emailPayload.related_id,
      email_log_id: log.id,
      metadata_json: emailPayload.metadata_json,
    });
    return { failed: true, provider, error: configError, log_id: log.id };
  }

  if (!emailPayload.from || !emailPayload.recipient) {
    const errorMessage = !emailPayload.recipient ? 'Email recipient is missing' : 'Email sender is missing';
    await updateEmailLog(env, log.id, { status: 'failed', provider, error_message: errorMessage });
    await createNotification(env, {
      type: emailPayload.type,
      recipient: emailPayload.recipient,
      title: emailPayload.subject,
      message: errorMessage,
      status: 'failed',
      related_id: emailPayload.related_id,
      email_log_id: log.id,
      metadata_json: emailPayload.metadata_json,
    });
    return { failed: true, provider, error: errorMessage, log_id: log.id };
  }

  try {
    const result = await sendWithEmailProvider(env, provider, emailPayload);
    const sentAt = nowIso();
    await updateEmailLog(env, log.id, {
      status: 'sent',
      provider,
      provider_message_id: result.provider_message_id,
      sent_at: sentAt,
    });
    await createNotification(env, {
      type: emailPayload.type,
      recipient: emailPayload.recipient,
      title: emailPayload.subject,
      message: 'Email sent',
      status: 'sent',
      related_id: emailPayload.related_id,
      email_log_id: log.id,
      metadata_json: emailPayload.metadata_json,
    });
    return { sent: true, provider, provider_message_id: result.provider_message_id, log_id: log.id };
  } catch (error) {
    const errorMessage = error.message || 'Email send failed';
    await updateEmailLog(env, log.id, { status: 'failed', provider, error_message: errorMessage });
    await createNotification(env, {
      type: emailPayload.type,
      recipient: emailPayload.recipient,
      title: emailPayload.subject,
      message: errorMessage,
      status: 'failed',
      related_id: emailPayload.related_id,
      email_log_id: log.id,
      metadata_json: emailPayload.metadata_json,
    });
    return { failed: true, provider, error: errorMessage, log_id: log.id };
  }
}

export async function sendOrderCreatedEmails(env, order, settings = {}) {
  const provider = getEmailProvider(env, settings);
  const from = getSender(env, settings, provider);
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
      provider,
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
      provider,
      related_id: order.id,
      dedupe_key: dedupeKey(order, 'customer_order_received', order.customer_email),
      metadata_json: metadataFor(order, { recipient_role: 'customer' }),
    }));
  }

  return Promise.all(jobs);
}

export async function sendOrderStatusEmail(env, order, status, settings = {}) {
  const provider = getEmailProvider(env, settings);
  const from = getSender(env, settings, provider);
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
    provider,
    related_id: order.id,
    dedupe_key: dedupeKey(order, config.type, order.customer_email),
    metadata_json: metadataFor(order, { status: normalizedStatus, recipient_role: 'customer' }),
  });
}

export async function sendEmailVerificationCode(env, customer, code, settings = {}) {
  const provider = getEmailProvider(env, settings);
  const from = getSender(env, settings, provider);
  const store = storeName(settings);
  const recipient = customer.email;

  return sendOrderEmail(env, {
    type: 'customer_email_verification',
    from,
    recipient,
    subject: `קוד אימות לחשבון שלך - ${store}`,
    html: buildEmailVerificationEmail({ code, email: recipient }, settings),
    provider,
    related_type: 'customer',
    related_id: customer.id,
    dedupe_key: `customer:${customer.id}:email_verification:${Date.now()}`,
    metadata_json: authMetadata({ customer_id: customer.id, email: recipient }),
  });
}
