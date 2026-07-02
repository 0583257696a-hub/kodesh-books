import { stringValue } from './http.js';

const MAILJET_DEFAULT_HOST = 'api.mailjet.com';
const MAILJET_SEND_PATH = '/v3.1/send';
const RESEND_SEND_URL = 'https://api.resend.com/emails';

const SUPPORTED_EMAIL_PROVIDERS = new Set(['mailjet', 'resend', 'cloudflare', 'poptin']);

export function normalizeEmailProvider(value) {
  const provider = stringValue(value).toLowerCase();
  return SUPPORTED_EMAIL_PROVIDERS.has(provider) ? provider : 'mailjet';
}

export function getEmailProvider(env, settings = {}) {
  return normalizeEmailProvider(
    settings.email_provider
      || env.EMAIL_PROVIDER
      || env.MAIL_PROVIDER
      || env.EMAIL_AUTOMATION_PROVIDER
      || 'mailjet'
  );
}

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

function parseMailjetAddress(value = '') {
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

function resendError(data, response) {
  return stringValue(data?.message)
    || stringValue(data?.error)
    || stringValue(data?.name)
    || `Resend failed with status ${response.status}`;
}

export function emailProviderConfigError(env, provider) {
  if (provider === 'mailjet') {
    return mailjetApiKey(env) && mailjetSecretKey(env)
      ? ''
      : 'MAILJET_API_KEY/MJ_APIKEY_PUBLIC or MAILJET_SECRET_KEY/MJ_APIKEY_PRIVATE is not configured';
  }

  if (provider === 'resend') {
    return stringValue(env.RESEND_API_KEY)
      ? ''
      : 'RESEND_API_KEY is not configured';
  }

  if (provider === 'cloudflare') {
    return env.EMAIL && typeof env.EMAIL.send === 'function'
      ? ''
      : 'Cloudflare send_email binding EMAIL is not configured';
  }

  if (provider === 'poptin') {
    return 'Poptin Pixel is configured in the browser, but transactional email sending through Poptin requires Poptin API/webhook details that are not configured yet';
  }

  return `Unsupported email provider: ${provider}`;
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
          From: parseMailjetAddress(payload.from),
          To: [parseMailjetAddress(payload.recipient)],
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

  return {
    raw: data,
    provider_message_id: mailjetMessageId(data),
  };
}

async function sendWithResend(env, payload) {
  const response = await fetch(RESEND_SEND_URL, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${stringValue(env.RESEND_API_KEY)}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      from: payload.from,
      to: [payload.recipient],
      subject: payload.subject,
      html: payload.html,
      text: payload.text || htmlToText(payload.html),
    }),
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(resendError(data, response));
  }

  return {
    raw: data,
    provider_message_id: data?.id || null,
  };
}

async function sendWithCloudflareEmail(env, payload) {
  const response = await env.EMAIL.send({
    to: payload.recipient,
    from: payload.from,
    subject: payload.subject,
    html: payload.html,
    text: payload.text || htmlToText(payload.html),
  });

  return {
    raw: response || {},
    provider_message_id: response?.messageId || response?.id || null,
  };
}

export async function sendWithEmailProvider(env, provider, payload) {
  if (provider === 'mailjet') return sendWithMailjet(env, payload);
  if (provider === 'resend') return sendWithResend(env, payload);
  if (provider === 'cloudflare') return sendWithCloudflareEmail(env, payload);
  throw new Error(emailProviderConfigError(env, provider));
}
