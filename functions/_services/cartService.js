import { nowIso, numberValue, stringValue } from './http.js';

function normalizeCartItem(item = {}) {
  const quantity = Math.max(1, Math.floor(numberValue(item.quantity, 1)));
  const unitPrice = numberValue(item.price ?? item.unit_price, 0);

  return {
    product_id: stringValue(item.product_id),
    product_name: stringValue(item.product_name),
    quantity,
    unit_price: unitPrice,
    price: unitPrice,
    image_url: stringValue(item.image_url),
  };
}

function publicCart(row, items = []) {
  return {
    id: row.id,
    visitor_id: row.visitor_id || '',
    session_id: row.session_id || '',
    status: row.status,
    subtotal: numberValue(row.subtotal),
    total: numberValue(row.total),
    currency: row.currency || 'ILS',
    converted_order_id: row.converted_order_id || '',
    created_at: row.created_at,
    updated_at: row.updated_at,
    items,
  };
}

export async function getCart(env, cartId) {
  const cart = await env.DB.prepare('SELECT * FROM carts WHERE id = ?').bind(cartId).first();
  if (!cart) return null;

  const rows = await env.DB.prepare('SELECT * FROM cart_items WHERE cart_id = ? ORDER BY created_at ASC').bind(cartId).all();
  const items = (rows.results || []).map((row) => ({
    id: row.id,
    product_id: row.product_id,
    product_name: row.product_name,
    quantity: numberValue(row.quantity, 1),
    price: numberValue(row.unit_price),
    image_url: row.image_url || '',
  }));

  return publicCart(cart, items);
}

export async function syncCart(env, payload = {}) {
  const now = nowIso();
  const id = stringValue(payload.cart_id) || crypto.randomUUID();
  const items = (payload.items || []).map(normalizeCartItem).filter((item) => item.product_id);
  const subtotal = items.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);
  const total = numberValue(payload.total, subtotal);
  const visitorId = stringValue(payload.visitor_id);
  const sessionId = stringValue(payload.session_id);
  const status = stringValue(payload.status) || (items.length ? 'active' : 'expired');

  await env.DB.prepare(`
    INSERT INTO carts (id, visitor_id, session_id, status, subtotal, total, currency, expires_at, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, 'ILS', ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      visitor_id = excluded.visitor_id,
      session_id = excluded.session_id,
      status = excluded.status,
      subtotal = excluded.subtotal,
      total = excluded.total,
      updated_at = excluded.updated_at
  `).bind(
    id,
    visitorId,
    sessionId,
    status,
    subtotal,
    total,
    payload.expires_at || null,
    now,
    now
  ).run();

  await env.DB.prepare('DELETE FROM cart_items WHERE cart_id = ?').bind(id).run();

  for (const item of items) {
    await env.DB.prepare(`
      INSERT INTO cart_items (
        id,
        cart_id,
        product_id,
        product_name,
        quantity,
        unit_price,
        image_url,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      crypto.randomUUID(),
      id,
      item.product_id,
      item.product_name,
      item.quantity,
      item.unit_price,
      item.image_url,
      now,
      now
    ).run();
  }

  return getCart(env, id);
}

export async function updateCartItem(env, cartId, item) {
  const now = nowIso();
  const normalized = normalizeCartItem(item);

  if (!normalized.product_id) {
    throw new Error('Missing product_id');
  }

  await env.DB.prepare(`
    INSERT INTO cart_items (id, cart_id, product_id, product_name, quantity, unit_price, image_url, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(cart_id, product_id) DO UPDATE SET
      product_name = excluded.product_name,
      quantity = excluded.quantity,
      unit_price = excluded.unit_price,
      image_url = excluded.image_url,
      updated_at = excluded.updated_at
  `).bind(
    crypto.randomUUID(),
    cartId,
    normalized.product_id,
    normalized.product_name,
    normalized.quantity,
    normalized.unit_price,
    normalized.image_url,
    now,
    now
  ).run();

  await recalculateCart(env, cartId);
  return getCart(env, cartId);
}

export async function removeCartItem(env, cartId, productId) {
  await env.DB.prepare('DELETE FROM cart_items WHERE cart_id = ? AND product_id = ?').bind(cartId, productId).run();
  await recalculateCart(env, cartId);
  return getCart(env, cartId);
}

export async function recalculateCart(env, cartId) {
  const rows = await env.DB.prepare('SELECT quantity, unit_price FROM cart_items WHERE cart_id = ?').bind(cartId).all();
  const subtotal = (rows.results || []).reduce((sum, row) => sum + numberValue(row.quantity, 1) * numberValue(row.unit_price), 0);
  await env.DB.prepare('UPDATE carts SET subtotal = ?, total = ?, updated_at = ? WHERE id = ?').bind(subtotal, subtotal, nowIso(), cartId).run();
}

