import { appApi } from '@/api/internalClient';

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

// Maps this app's internal event_type values to GA4's standard ecommerce
// event names. No-ops entirely when no GA4 property is configured (gtag is
// only ever defined by AppLayout when settings.google_analytics_id is set) --
// this only ever adds a call, never replaces the internal analytics_events
// tracking above.
const GA4_EVENT_NAMES = {
  product_view: 'view_item',
  add_to_cart: 'add_to_cart',
  checkout_started: 'begin_checkout',
  order_created: 'purchase',
  search: 'search',
};

function sendToGa4(event) {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return;
  const ga4Name = GA4_EVENT_NAMES[event.event_type];
  if (!ga4Name) return;

  const params = { currency: 'ILS' };
  if (event.value) params.value = Number(event.value);
  if (event.event_type === 'order_created' && event.metadata?.order_id) {
    params.transaction_id = event.metadata.order_number || event.metadata.order_id;
  }
  if (event.event_type === 'search' && event.metadata?.term) {
    params.search_term = event.metadata.term;
  }
  if (event.product_id || event.product_name) {
    params.items = [{
      item_id: event.product_id || undefined,
      item_name: event.product_name || undefined,
      price: event.value || undefined,
      quantity: 1,
    }];
  }

  window.gtag('event', ga4Name, params);
}

export async function trackEcommerceEvent(event) {
  sendToGa4(event);
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
    if (appApi.entities.AnalyticsEvent?.create) {
      await appApi.entities.AnalyticsEvent.create({
        ...payload,
        event_type: ANALYTICS_EVENT_TYPE_FALLBACKS[payload.event_type] || payload.event_type,
      });
    }
  } catch (error) {
    console.warn('Analytics event kept locally:', error);
  }
}
