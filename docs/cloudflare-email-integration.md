# Cloudflare Email - קובץ הטמעה אוניברסלי

מסמך זה מתאר איך להטמיע שליחת מיילים דרך Cloudflare Workers / Pages Functions באמצעות Email Routing binding, בלי לחשוף מפתחות או סודות ב-frontend.

## מתי להשתמש בזה

מתאים ל:

- מייל ללקוח בעת יצירת הזמנה
- מייל למנהל על הזמנה חדשה
- עדכון סטטוס הזמנה
- אימות כתובת מייל
- לוג של ניסיונות שליחה ב-D1

## wrangler.jsonc

```jsonc
{
  "compatibility_date": "2026-06-25",
  "compatibility_flags": ["nodejs_compat"],
  "send_email": [
    {
      "name": "EMAIL",
      "allowed_sender_addresses": [
        "welcome@your-domain.com"
      ]
    }
  ],
  "vars": {
    "EMAIL_PROVIDER": "cloudflare",
    "EMAIL_FROM": "welcome@your-domain.com",
    "EMAIL_FROM_NAME": "Store Name",
    "ORDER_ADMIN_EMAIL": "admin@example.com"
  }
}
```

בפרודקשן אפשר לשמור את `EMAIL_PROVIDER`, `EMAIL_FROM`, `EMAIL_FROM_NAME`, `ORDER_ADMIN_EMAIL` גם כמשתני סביבה ב-Cloudflare Dashboard.

## דרישות Cloudflare

1. הדומיין חייב להיות מנוהל ב-Cloudflare.
2. יש להפעיל Email Routing לדומיין.
3. כתובת השולח חייבת להיות מאושרת תחת allowed sender.
4. ה-binding חייב להיקרא `EMAIL` אם הקוד משתמש ב-`env.EMAIL.send`.

## דוגמת שליחה בסיסית

```js
export default {
  async fetch(request, env) {
    const response = await env.EMAIL.send({
      to: 'customer@example.com',
      from: 'welcome@your-domain.com',
      subject: 'ההזמנה התקבלה',
      html: '<div dir="rtl"><h1>תודה על ההזמנה</h1></div>',
      text: 'תודה על ההזמנה',
    });

    return Response.json({
      sent: true,
      messageId: response.messageId,
    });
  },
};
```

## טבלת לוגים מומלצת ב-D1

```sql
CREATE TABLE IF NOT EXISTS email_logs (
  id TEXT PRIMARY KEY,
  dedupe_key TEXT UNIQUE,
  type TEXT NOT NULL,
  recipient TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  provider TEXT NOT NULL DEFAULT 'cloudflare',
  provider_message_id TEXT,
  related_type TEXT NOT NULL DEFAULT 'order',
  related_id TEXT,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  sent_at TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_email_logs_status ON email_logs(status);
CREATE INDEX IF NOT EXISTS idx_email_logs_related_id ON email_logs(related_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_dedupe_key ON email_logs(dedupe_key);
```

## פונקציית שליחה עם לוג retry-safe

```js
function nowIso() {
  return new Date().toISOString();
}

function htmlToText(html = '') {
  return String(html).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

export async function sendCloudflareEmail(env, payload) {
  const id = crypto.randomUUID();
  const now = nowIso();

  await env.DB.prepare(`
    INSERT OR IGNORE INTO email_logs (
      id, dedupe_key, type, recipient, subject, body,
      status, provider, related_type, related_id, metadata_json,
      created_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, 'pending', 'cloudflare', ?, ?, ?, ?, ?)
  `).bind(
    id,
    payload.dedupe_key,
    payload.type,
    payload.to,
    payload.subject,
    payload.html,
    payload.related_type || 'order',
    payload.related_id || null,
    JSON.stringify(payload.metadata || {}),
    now,
    now
  ).run();

  const log = payload.dedupe_key
    ? await env.DB.prepare('SELECT * FROM email_logs WHERE dedupe_key = ?').bind(payload.dedupe_key).first()
    : await env.DB.prepare('SELECT * FROM email_logs WHERE id = ?').bind(id).first();

  if (log?.status === 'sent') {
    return { skipped: true, reason: 'already_sent', log_id: log.id };
  }

  try {
    const result = await env.EMAIL.send({
      to: payload.to,
      from: payload.from,
      subject: payload.subject,
      html: payload.html,
      text: payload.text || htmlToText(payload.html),
    });

    await env.DB.prepare(`
      UPDATE email_logs
      SET status = 'sent',
          provider_message_id = ?,
          attempt_count = attempt_count + 1,
          error_message = NULL,
          sent_at = ?,
          updated_at = ?
      WHERE id = ?
    `).bind(result?.messageId || result?.id || null, nowIso(), nowIso(), log.id).run();

    return { sent: true, log_id: log.id, provider_message_id: result?.messageId || result?.id || null };
  } catch (error) {
    await env.DB.prepare(`
      UPDATE email_logs
      SET status = 'failed',
          attempt_count = attempt_count + 1,
          error_message = ?,
          updated_at = ?
      WHERE id = ?
    `).bind(error.message || 'Email send failed', nowIso(), log.id).run();

    return { failed: true, log_id: log.id, error: error.message || 'Email send failed' };
  }
}
```

## דוגמת מייל הזמנה ללקוח ולמנהל

```js
export async function sendOrderCreatedEmails(env, order) {
  const from = env.EMAIL_FROM;
  const adminEmail = env.ORDER_ADMIN_EMAIL;

  const customerJob = sendCloudflareEmail(env, {
    type: 'customer_order_received',
    to: order.customer_email,
    from,
    subject: 'הזמנתך התקבלה',
    html: `<div dir="rtl"><h1>תודה על ההזמנה</h1><p>מספר הזמנה: ${order.order_number}</p></div>`,
    related_id: order.id,
    dedupe_key: `order:${order.id}:customer:${order.customer_email}`,
  });

  const adminJob = sendCloudflareEmail(env, {
    type: 'admin_new_order',
    to: adminEmail,
    from,
    subject: 'התקבלה הזמנה חדשה באתר',
    html: `<div dir="rtl"><h1>הזמנה חדשה</h1><p>מספר הזמנה: ${order.order_number}</p></div>`,
    related_id: order.id,
    dedupe_key: `order:${order.id}:admin:${adminEmail}`,
  });

  return Promise.all([customerJob, adminJob]);
}
```

## בדיקת לוגים

```sql
SELECT id, type, recipient, status, provider, provider_message_id, error_message, sent_at, created_at
FROM email_logs
ORDER BY created_at DESC
LIMIT 20;
```

## תקלות נפוצות

- `env.EMAIL.send is not a function` - חסר binding בשם `EMAIL`.
- המייל נרשם כ-sent אבל לא הגיע - לבדוק Spam/Promotions, allowed sender, ו-Email Routing בדומיין.
- האדמין לא מקבל - לבדוק `ORDER_ADMIN_EMAIL` או הגדרת `admin_email` במסד.
- אין לשלוח דרך frontend ואין לשים סודות במשתני `VITE_*`.

## מעבר בין ספקים

מומלץ לבנות שכבת provider:

```text
EMAIL_PROVIDER=cloudflare | mailjet | resend
```

כך אפשר להחליף ספק בלי לשנות את כל קוד ההזמנות.
