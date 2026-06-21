import { base44 } from '@/api/base44Client';

const STORAGE_KEY = 'otzar_analytics_events';
const ANALYTICS_EVENT_TYPE_FALLBACKS = {
  add_to_cart: 'cart_add',
  checkout_started: 'checkout_start',
  order_created: 'purchase',
};

function readLocalEvents() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function writeLocalEvent(event) {
  const events = readLocalEvents();
  events.unshift(event);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(events.slice(0, 300)));
}

export function getLocalAnalyticsEvents() {
  return readLocalEvents();
}

export async function trackEcommerceEvent(event) {
  const payload = {
    event_type: event.event_type,
    product_id: event.product_id || '',
    product_name: event.product_name || '',
    customer_email: event.customer_email || '',
    value: Number(event.value || 0),
    metadata: event.metadata || {},
    created_date: new Date().toISOString(),
  };

  writeLocalEvent({ id: crypto.randomUUID?.() || `${Date.now()}`, ...payload });

  try {
    const response = await fetch('/api/analytics', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'content-type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      },
      body: JSON.stringify(payload),
    });
    if (response.ok) {
      return;
    }
  } catch {}

  try {
    if (base44.entities.AnalyticsEvent?.create) {
      await base44.entities.AnalyticsEvent.create({
        ...payload,
        event_type: ANALYTICS_EVENT_TYPE_FALLBACKS[payload.event_type] || payload.event_type,
      });
    }
  } catch (error) {
    console.warn('Analytics event kept locally:', error);
  }
}
