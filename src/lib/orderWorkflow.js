import { base44 } from '@/api/base44Client';

export const ORDER_STATUSES = {
  new: { label: 'חדש', tone: 'bg-amber-50 text-amber-700 border-amber-100' },
  pending_approval: { label: 'ממתין לאישור', tone: 'bg-blue-50 text-blue-700 border-blue-100' },
  approved: { label: 'אושר', tone: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
  delivered: { label: 'נמסר', tone: 'bg-violet-50 text-violet-700 border-violet-100' },
  cancelled: { label: 'בוטל', tone: 'bg-rose-50 text-rose-700 border-rose-100' },
};

const LEGACY_STATUS_MAP = {
  pending: 'new',
  confirmed: 'approved',
  shipped: 'approved',
};

export function normalizeOrderStatus(status) {
  return LEGACY_STATUS_MAP[status] || status || 'new';
}

export function currency(value) {
  return `₪${Number(value || 0).toLocaleString('he-IL')}`;
}

export function orderNumber(order) {
  return order?.order_number || order?.id || '';
}

export function calculateOrderProfit(order) {
  const productCost = (order.items || []).reduce((sum, item) => (
    sum + Number(item.cost_price || item.product_cost || 0) * Number(item.quantity || 0)
  ), 0);
  const revenue = Number(order.subtotal || 0);
  return {
    revenue,
    cost: productCost,
    profit: revenue - productCost,
  };
}

export async function sendManagedEmail(settings, payload) {
  const enabledKey = payload.enabledKey;
  if (enabledKey && settings?.[enabledKey] === 'false') return { skipped: true };

  const emailRecord = {
    type: payload.type,
    to: payload.to,
    subject: payload.subject,
    body: payload.body,
    status: 'queued',
    provider: 'future_email_integration',
    created_at: new Date().toISOString(),
  };

  try {
    if (base44.entities.EmailNotification?.create) {
      await base44.entities.EmailNotification.create(emailRecord);
    }
  } catch {}

  try {
    if (base44.functions?.invoke) {
      return await base44.functions.invoke('sendOrderEmail', payload);
    }
  } catch {}

  return { queued: true };
}

export function buildOrderAdminEmail(order) {
  const lines = (order.items || []).map((item) => (
    `${item.product_name}\nQuantity: ${item.quantity}\nUnit Price: ${currency(item.price)}\nLine Total: ${currency(Number(item.price || 0) * Number(item.quantity || 0))}`
  )).join('\n\n');

  return [
    `Order Number: ${orderNumber(order)}`,
    `Order Date: ${new Date(order.created_at || order.created_date || Date.now()).toLocaleString('he-IL')}`,
    `Customer Name: ${order.customer_name || ''}`,
    `Phone: ${order.customer_phone || ''}`,
    `Email: ${order.customer_email || ''}`,
    `City: ${order.city || ''}`,
    `Address: ${order.shipping_address || ''}`,
    `Customer Notes: ${order.notes || ''}`,
    '',
    'Products',
    lines,
    '',
    'Order Summary',
    `Products Total: ${currency(order.subtotal)}`,
    `Shipping Cost: ${currency(order.shipping_cost)}`,
    `Final Total: ${currency(order.total)}`,
    '',
    `View Order: /secret-admin/orders?order=${order.id}`,
    `Approve Order: /secret-admin/orders?order=${order.id}&action=approve`,
  ].join('\n');
}

export function buildCustomerApprovalEmail(order) {
  const lines = (order.items || []).map((item) => (
    `${item.product_name} - כמות: ${item.quantity} - מחיר: ${currency(item.price)}`
  )).join('\n');

  return [
    `שלום ${order.customer_name || ''},`,
    '',
    'שמחים לעדכן כי הזמנתך אושרה.',
    '',
    `מספר הזמנה: ${orderNumber(order)}`,
    '',
    'מוצרים בהזמנה:',
    lines,
    '',
    `סכום מוצרים: ${currency(order.subtotal)}`,
    `משלוח: ${currency(order.shipping_cost)}`,
    `סה"כ לתשלום: ${currency(order.total)}`,
    '',
    'סטטוס: אושר',
    '',
    'תודה שבחרת אוצר הקדושה.',
  ].join('\n');
}

export function buildCustomerDeliveryEmail(order) {
  return [
    `שלום ${order.customer_name || ''},`,
    '',
    `הזמנתך מספר ${orderNumber(order)} נמסרה בהצלחה.`,
    '',
    'תודה שבחרת אוצר הקדושה.',
  ].join('\n');
}

export async function reserveStockForItems(items) {
  const reserved = [];
  const enrichedItems = [];

  for (const item of items) {
    const product = (await base44.entities.Product.filter({ id: item.product_id }, '-created_date', 1))?.[0];
    if (!product) throw new Error(`המוצר ${item.product_name} לא נמצא במערכת.`);

    const quantity = Number(item.quantity || 0);
    const hasStockCount = product.stock_quantity !== undefined && product.stock_quantity !== null && product.stock_quantity !== '';
    const currentStock = Number(product.stock_quantity || 0);

    if (product.in_stock === false || (hasStockCount && currentStock < quantity)) {
      throw new Error(`אין מספיק מלאי עבור ${product.name}.`);
    }

    if (hasStockCount) {
      const nextStock = Math.max(0, currentStock - quantity);
      await base44.entities.Product.update(product.id, {
        stock_quantity: nextStock,
        in_stock: nextStock > 0,
      });
      reserved.push({ product_id: product.id, quantity });
    }

    enrichedItems.push({
      ...item,
      product_name: product.name || item.product_name,
      price: Number(item.price || product.sale_price || product.price || 0),
      cost_price: Number(product.cost_price || product.product_cost || 0),
      sku: product.sku || '',
    });
  }

  return { reserved, enrichedItems };
}

export async function restoreReservedStock(order) {
  const reservations = order.stock_reservations || [];
  for (const reservation of reservations) {
    const product = (await base44.entities.Product.filter({ id: reservation.product_id }, '-created_date', 1))?.[0];
    if (!product) continue;
    const nextStock = Number(product.stock_quantity || 0) + Number(reservation.quantity || 0);
    await base44.entities.Product.update(product.id, {
      stock_quantity: nextStock,
      in_stock: nextStock > 0,
    });
  }
}
