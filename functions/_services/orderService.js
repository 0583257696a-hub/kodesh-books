import { boolSetting, getSettingsMap, nowIso, numberValue, parseJson, stringValue } from './http.js';
import { logAnalyticsEvent } from './analyticsService.js';
import { sendOrderCreatedEmails, sendOrderStatusEmail } from './emailService.js';

const ORDER_STATUS_VALUES = new Set(['new', 'pending_approval', 'approved', 'pending', 'confirmed', 'shipped', 'delivered', 'cancelled']);

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function currency(value) {
  return `₪${Number(value || 0).toLocaleString('he-IL')}`;
}

function orderItemsRows(order) {
  return (order.items || []).map((item) => {
    const lineTotal = numberValue(item.price) * numberValue(item.quantity);
    return `
      <tr>
        <td>${escapeHtml(item.product_name)}</td>
        <td>${numberValue(item.quantity)}</td>
        <td>${currency(item.price)}</td>
        <td>${currency(lineTotal)}</td>
      </tr>
    `;
  }).join('');
}

function normalizeOrderRow(row, items = []) {
  return {
    ...row,
    created_date: row.created_at,
    updated_date: row.updated_at,
    stock_reserved: Boolean(row.stock_reserved),
    stock_restored: Boolean(row.stock_restored),
    stock_reservations: parseJson(row.stock_reservations_json, []),
    subtotal: numberValue(row.subtotal),
    shipping_cost: numberValue(row.shipping_cost),
    discount_total: numberValue(row.discount_total),
    total: numberValue(row.total),
    items,
  };
}

function normalizeOrderItemRow(row) {
  return {
    id: row.id,
    order_id: row.order_id,
    product_id: row.product_id,
    product_name: row.product_name,
    sku: row.sku || '',
    quantity: numberValue(row.quantity, 1),
    price: numberValue(row.unit_price),
    unit_price: numberValue(row.unit_price),
    cost_price: numberValue(row.cost_price),
    line_total: numberValue(row.line_total),
    created_at: row.created_at,
  };
}

async function getProductForItem(env, item) {
  const productId = stringValue(item.product_id);
  if (!productId) return null;

  return env.DB.prepare(`
    SELECT * FROM products
    WHERE id = ? OR base44_id = ? OR slug = ?
    LIMIT 1
  `).bind(productId, productId, productId).first();
}

async function getOrCreateCustomer(env, form, now) {
  const email = stringValue(form.customer_email).toLowerCase();
  if (!email) return null;

  const existing = await env.DB.prepare('SELECT * FROM customers WHERE email = ? LIMIT 1').bind(email).first();
  if (existing) {
    await env.DB.prepare(`
      UPDATE customers
      SET full_name = ?, phone = ?, city = ?, shipping_address = ?, last_activity_at = ?, updated_at = ?
      WHERE id = ?
    `).bind(
      stringValue(form.customer_name),
      stringValue(form.customer_phone),
      stringValue(form.city),
      stringValue(form.shipping_address),
      now,
      now,
      existing.id
    ).run();
    return existing.id;
  }

  const id = crypto.randomUUID();
  await env.DB.prepare(`
    INSERT INTO customers (id, email, full_name, phone, city, shipping_address, last_activity_at, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    email,
    stringValue(form.customer_name),
    stringValue(form.customer_phone),
    stringValue(form.city),
    stringValue(form.shipping_address),
    now,
    now,
    now
  ).run();

  return id;
}

function validateCustomer(form) {
  const required = ['customer_name', 'customer_phone', 'customer_email', 'city', 'shipping_address'];
  const missing = required.filter((key) => !stringValue(form[key]));
  if (missing.length) {
    throw new Error('יש למלא שם מלא, טלפון, אימייל, עיר וכתובת למשלוח.');
  }
}

function generateOrderNumber() {
  const date = new Date();
  const day = date.toISOString().slice(0, 10).replace(/-/g, '');
  const suffix = `${date.getTime().toString(36)}${Math.random().toString(36).slice(2, 6)}`.toUpperCase();
  return `OK-${day}-${suffix}`;
}

async function enrichItems(env, rawItems, settings) {
  const enforceStock = boolSetting(settings.enforce_stock_limit, false);
  const items = [];
  const reservations = [];

  for (const rawItem of rawItems || []) {
    const quantity = Math.max(1, Math.floor(numberValue(rawItem.quantity, 1)));
    const product = await getProductForItem(env, rawItem);

    if (enforceStock && !product) {
      throw new Error(`אין נתון מלאי ב-D1 עבור ${rawItem.product_name || rawItem.product_id}.`);
    }

    if (product) {
      const stockQuantity = numberValue(product.stock_quantity);
      const inStock = Boolean(product.in_stock);
      if (enforceStock && (!inStock || stockQuantity < quantity)) {
        throw new Error(`אין מספיק מלאי עבור ${product.name}.`);
      }
      reservations.push({ product_id: product.id, quantity });
    }

    const unitPrice = numberValue(rawItem.price ?? rawItem.unit_price ?? product?.sale_price ?? product?.price);
    items.push({
      product_id: stringValue(product?.id || rawItem.product_id),
      product_name: stringValue(product?.name || rawItem.product_name),
      sku: stringValue(product?.sku || rawItem.sku),
      quantity,
      price: unitPrice,
      cost_price: numberValue(product?.cost_price),
      line_total: unitPrice * quantity,
    });
  }

  if (!items.length) {
    throw new Error('העגלה ריקה.');
  }

  return { items, reservations };
}

async function reduceStockForItems(env, items) {
  const reduced = [];

  for (const item of items || []) {
    const product = await getProductForItem(env, item);
    if (!product) continue;

    const nextStock = Math.max(0, numberValue(product.stock_quantity) - numberValue(item.quantity, 1));
    await env.DB.prepare('UPDATE products SET stock_quantity = ?, in_stock = ?, updated_at = ? WHERE id = ?')
      .bind(nextStock, nextStock > 0 ? 1 : 0, nowIso(), product.id)
      .run();
    reduced.push({ product_id: product.id, quantity: numberValue(item.quantity, 1) });
  }

  return reduced;
}

async function restoreStockForReservations(env, reservations) {
  for (const reservation of reservations || []) {
    const product = await getProductForItem(env, reservation);
    if (!product) continue;

    const nextStock = numberValue(product.stock_quantity) + numberValue(reservation.quantity, 1);
    await env.DB.prepare('UPDATE products SET stock_quantity = ?, in_stock = 1, updated_at = ? WHERE id = ?')
      .bind(nextStock, nowIso(), product.id)
      .run();
  }
}

export async function createOrder(env, payload = {}) {
  const now = nowIso();
  const form = payload.customer || payload;
  validateCustomer(form);

  const settings = await getSettingsMap(env);
  const { items, reservations } = await enrichItems(env, payload.items, settings);
  const subtotal = numberValue(payload.subtotal, items.reduce((sum, item) => sum + item.line_total, 0));
  const shippingCost = numberValue(payload.shipping_cost);
  const total = numberValue(payload.total, subtotal + shippingCost);
  const id = crypto.randomUUID();
  const customerId = await getOrCreateCustomer(env, form, now);
  const orderNumber = generateOrderNumber();

  await env.DB.prepare(`
    INSERT INTO orders (
      id,
      order_number,
      customer_id,
      customer_name,
      customer_phone,
      customer_email,
      city,
      shipping_address,
      subtotal,
      shipping_cost,
      shipping_method,
      total,
      status,
      payment_status,
      payment_method,
      stock_reserved,
      stock_restored,
      stock_reservations_json,
      notes,
      internal_notes,
      created_at,
      updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new', 'manual_pending', 'manual', 0, 0, ?, ?, '', ?, ?)
  `).bind(
    id,
    orderNumber,
    customerId,
    stringValue(form.customer_name),
    stringValue(form.customer_phone),
    stringValue(form.customer_email).toLowerCase(),
    stringValue(form.city),
    stringValue(form.shipping_address),
    subtotal,
    shippingCost,
    stringValue(payload.shipping_method) || 'home_delivery',
    total,
    JSON.stringify(reservations),
    stringValue(form.notes),
    now,
    now
  ).run();

  for (const item of items) {
    await env.DB.prepare(`
      INSERT INTO order_items (id, order_id, product_id, product_name, sku, quantity, unit_price, cost_price, line_total, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      crypto.randomUUID(),
      id,
      item.product_id,
      item.product_name,
      item.sku,
      item.quantity,
      item.price,
      item.cost_price,
      item.line_total,
      now
    ).run();
  }

  if (payload.cart_id) {
    await env.DB.prepare('UPDATE carts SET status = ?, converted_order_id = ?, updated_at = ? WHERE id = ?')
      .bind('converted', id, now, stringValue(payload.cart_id))
      .run();
  }

  await logAnalyticsEvent(env, {
    event_type: 'order_created',
    customer_email: form.customer_email,
    value: total,
    metadata: { order_id: id, order_number: orderNumber, item_count: items.length },
    created_at: now,
  });

  const order = await getOrder(env, id);
  await sendOrderCreatedEmails(env, order, settings);
  return order;
}

export async function getOrder(env, id) {
  const order = await env.DB.prepare('SELECT * FROM orders WHERE id = ? OR order_number = ?').bind(id, id).first();
  if (!order) return null;

  const itemRows = await env.DB.prepare('SELECT * FROM order_items WHERE order_id = ? ORDER BY created_at ASC').bind(order.id).all();
  return normalizeOrderRow(order, (itemRows.results || []).map(normalizeOrderItemRow));
}

export async function listOrders(env, limit = 500) {
  const rows = await env.DB.prepare('SELECT * FROM orders ORDER BY created_at DESC LIMIT ?').bind(Math.min(numberValue(limit, 500), 1000)).all();
  const orders = [];

  for (const row of rows.results || []) {
    orders.push(await getOrder(env, row.id));
  }

  return orders.filter(Boolean);
}

export async function updateOrderStatus(env, orderId, payload = {}) {
  const order = await getOrder(env, orderId);
  if (!order) {
    throw new Error('Order not found');
  }

  const now = nowIso();
  const settings = await getSettingsMap(env);
  const nextStatus = stringValue(payload.status || order.status);
  if (!ORDER_STATUS_VALUES.has(nextStatus)) {
    throw new Error('Invalid order status');
  }

  let stockReserved = order.stock_reserved ? 1 : 0;
  let stockRestored = order.stock_restored ? 1 : 0;
  let stockReservations = order.stock_reservations || [];
  const approvedAt = nextStatus === 'approved' && !order.approved_at ? now : order.approved_at;
  const deliveredAt = nextStatus === 'delivered' && !order.delivered_at ? now : order.delivered_at;
  const cancelledAt = nextStatus === 'cancelled' && !order.cancelled_at ? now : order.cancelled_at;

  if (nextStatus === 'approved' && !stockReserved && boolSetting(settings.reduce_stock_on_order_confirmation, false)) {
    stockReservations = await reduceStockForItems(env, order.items);
    stockReserved = stockReservations.length > 0 ? 1 : 0;
  }

  if (nextStatus === 'cancelled' && stockReserved && !stockRestored) {
    await restoreStockForReservations(env, stockReservations);
    stockRestored = 1;
  }

  await env.DB.prepare(`
    UPDATE orders
    SET status = ?,
        internal_notes = ?,
        stock_reserved = ?,
        stock_restored = ?,
        stock_reservations_json = ?,
        approved_at = ?,
        delivered_at = ?,
        cancelled_at = ?,
        updated_at = ?
    WHERE id = ?
  `).bind(
    nextStatus,
    payload.internal_notes !== undefined ? stringValue(payload.internal_notes) : stringValue(order.internal_notes),
    stockReserved,
    stockRestored,
    JSON.stringify(stockReservations),
    approvedAt || null,
    deliveredAt || null,
    cancelledAt || null,
    now,
    order.id
  ).run();

  const updatedOrder = await getOrder(env, order.id);
  if (nextStatus !== order.status) {
    await sendOrderStatusEmail(env, updatedOrder, nextStatus, settings);
  }

  return updatedOrder;
}

export function buildPrintableOrderHtml(order, settings = {}) {
  const storeName = settings.store_name || 'אוצר הקדושה';
  return `<!doctype html>
<html lang="he" dir="rtl">
<head>
  <meta charset="utf-8" />
  <title>הזמנה ${escapeHtml(order.order_number || order.id)}</title>
  <style>
    body { direction: rtl; font-family: Arial, sans-serif; color: #111827; padding: 24px; }
    h1 { font-size: 24px; margin: 0 0 20px; text-align: center; }
    .details { line-height: 1.9; margin-bottom: 18px; }
    table { width: 100%; border-collapse: collapse; margin: 18px 0; }
    th, td { border: 1px solid #222; padding: 8px; text-align: right; }
    th { background: #f3f4f6; }
    .summary { margin-top: 16px; line-height: 2; font-weight: 700; }
    .contact { margin-top: 22px; padding-top: 14px; border-top: 1px solid #999; line-height: 1.8; }
  </style>
</head>
<body>
  <h1>הזמנה - ${escapeHtml(storeName)}</h1>
  <div class="details">
    <div><strong>מספר הזמנה:</strong> ${escapeHtml(order.order_number || order.id)}</div>
    <div><strong>לקוח:</strong> ${escapeHtml(order.customer_name)}</div>
    <div><strong>טלפון:</strong> ${escapeHtml(order.customer_phone)}</div>
    <div><strong>אימייל:</strong> ${escapeHtml(order.customer_email)}</div>
    <div><strong>עיר:</strong> ${escapeHtml(order.city)}</div>
    <div><strong>כתובת:</strong> ${escapeHtml(order.shipping_address)}</div>
    ${order.notes ? `<div><strong>הערות:</strong> ${escapeHtml(order.notes)}</div>` : ''}
  </div>
  <table>
    <thead>
      <tr><th>מוצר</th><th>כמות</th><th>מחיר</th><th>סה"כ שורה</th></tr>
    </thead>
    <tbody>${orderItemsRows(order)}</tbody>
  </table>
  <div class="summary">
    <div>סכום מוצרים: ${currency(order.subtotal)}</div>
    <div>משלוח: ${currency(order.shipping_cost)}</div>
    <div>סה"כ: ${currency(order.total)}</div>
  </div>
  <div class="contact">
    <strong>פרטי התקשרות:</strong>
    ${settings.phone ? `<div>טלפון: ${escapeHtml(settings.phone)}</div>` : ''}
    ${settings.whatsapp ? `<div>וואטסאפ: ${escapeHtml(settings.whatsapp)}</div>` : ''}
    ${settings.email ? `<div>דוא"ל: ${escapeHtml(settings.email)}</div>` : ''}
    ${settings.address ? `<div>כתובת: ${escapeHtml(settings.address)}</div>` : ''}
  </div>
</body>
</html>`;
}
