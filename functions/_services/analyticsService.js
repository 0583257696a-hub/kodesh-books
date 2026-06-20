import { nowIso, numberValue, stringValue } from './http.js';

const ALLOWED_EVENTS = new Set([
  'visit',
  'product_view',
  'cart_add',
  'add_to_cart',
  'checkout_start',
  'checkout_started',
  'purchase',
  'order_created',
  'search',
]);

export async function logAnalyticsEvent(env, event = {}) {
  const eventType = stringValue(event.event_type);
  if (!ALLOWED_EVENTS.has(eventType)) {
    throw new Error(`Unsupported analytics event: ${eventType || 'empty'}`);
  }

  const id = crypto.randomUUID();
  await env.DB.prepare(`
    INSERT INTO analytics_events (
      id,
      event_type,
      product_id,
      product_name,
      customer_id,
      customer_email,
      value,
      metadata_json,
      description,
      created_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    eventType,
    stringValue(event.product_id),
    stringValue(event.product_name),
    stringValue(event.customer_id),
    stringValue(event.customer_email),
    numberValue(event.value),
    JSON.stringify(event.metadata || {}),
    stringValue(event.description),
    event.created_at || nowIso()
  ).run();

  return { id, ...event, event_type: eventType };
}

