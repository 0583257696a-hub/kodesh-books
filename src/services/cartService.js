const CART_ID_KEY = 'otzar_cart_id';
const VISITOR_ID_KEY = 'otzar_visitor_id';

async function readJsonResponse(response) {
  const text = await response.text();
  const data = text ? JSON.parse(text) : {};

  if (!response.ok) {
    throw new Error(data.error || 'Cart request failed');
  }

  return data;
}

export function getVisitorId() {
  let visitorId = localStorage.getItem(VISITOR_ID_KEY);
  if (!visitorId) {
    visitorId = crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(VISITOR_ID_KEY, visitorId);
  }
  return visitorId;
}

export function getStoredCartId() {
  return localStorage.getItem(CART_ID_KEY) || '';
}

export function setStoredCartId(cartId) {
  if (cartId) {
    localStorage.setItem(CART_ID_KEY, cartId);
  }
}

export function clearStoredCartId() {
  localStorage.removeItem(CART_ID_KEY);
}

export async function syncCart(items, options = {}) {
  if (!items.length && !getStoredCartId()) {
    return null;
  }

  const response = await fetch('/api/carts', {
    method: 'POST',
    credentials: 'include',
    headers: {
      'content-type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
    },
    body: JSON.stringify({
      cart_id: getStoredCartId(),
      visitor_id: getVisitorId(),
      status: options.status || (items.length ? 'active' : 'expired'),
      total: options.total,
      items,
    }),
  });

  const data = await readJsonResponse(response);
  if (data.cart?.id && items.length) {
    setStoredCartId(data.cart.id);
  }
  if (!items.length) {
    clearStoredCartId();
  }

  return data.cart;
}

export async function markCheckoutStarted(items, total) {
  return syncCart(items, { status: 'checkout_started', total });
}

export async function markCartConverted() {
  const cartId = getStoredCartId();
  if (!cartId) return null;
  return syncCart([], { status: 'converted' });
}

