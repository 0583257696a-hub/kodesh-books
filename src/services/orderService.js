import { getStoredCartId, markCartConverted } from '@/services/cartService';

async function readJsonResponse(response) {
  const text = await response.text();
  const data = text ? JSON.parse(text) : {};

  if (!response.ok) {
    throw new Error(data.error || 'Order request failed');
  }

  return data;
}

export async function createOrder(payload) {
  const response = await fetch('/api/orders', {
    method: 'POST',
    credentials: 'include',
    headers: {
      'content-type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
    },
    body: JSON.stringify({
      ...payload,
      cart_id: getStoredCartId(),
    }),
  });

  const data = await readJsonResponse(response);
  await markCartConverted().catch(() => {});
  return data.order;
}

export async function listAdminOrders() {
  const response = await fetch('/api/admin/orders?limit=500', {
    credentials: 'include',
    headers: {
      'X-Requested-With': 'XMLHttpRequest',
    },
  });
  const data = await readJsonResponse(response);
  return data.orders || [];
}

export async function updateAdminOrderStatus(id, data) {
  const response = await fetch(`/api/admin/orders/${encodeURIComponent(id)}/status`, {
    method: 'PATCH',
    credentials: 'include',
    headers: {
      'content-type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
    },
    body: JSON.stringify(data),
  });
  const result = await readJsonResponse(response);
  return result.order;
}

export async function getAdminOrderPrintHtml(id) {
  const response = await fetch(`/api/admin/orders/${encodeURIComponent(id)}/print`, {
    credentials: 'include',
    headers: {
      'X-Requested-With': 'XMLHttpRequest',
    },
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(text || 'Order print failed');
  }

  return text;
}

