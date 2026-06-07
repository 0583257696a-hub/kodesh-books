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

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function orderItemsRows(order) {
  return (order.items || []).map((item) => {
    const lineTotal = Number(item.price || 0) * Number(item.quantity || 0);
    return `
      <tr>
        <td style="padding:10px;border:1px solid #d7d7d7;text-align:right;">${escapeHtml(item.product_name)}</td>
        <td style="padding:10px;border:1px solid #d7d7d7;text-align:center;">${Number(item.quantity || 0)}</td>
        <td style="padding:10px;border:1px solid #d7d7d7;text-align:center;">${currency(item.price)}</td>
        <td style="padding:10px;border:1px solid #d7d7d7;text-align:center;font-weight:700;">${currency(lineTotal)}</td>
      </tr>
    `;
  }).join('');
}

function emailShell(title, subtitle, content, footer = '') {
  return `
<div dir="rtl" style="margin:0;padding:24px;background:#f7f2e8;font-family:Arial,sans-serif;color:#2b1a0f;text-align:right;">
  <div style="max-width:720px;margin:0 auto;background:#fff;border:1px solid #e8d9b2;border-radius:14px;overflow:hidden;">
    <div style="background:#2b1a0f;color:#fff;padding:22px 26px;">
      <h1 style="margin:0;font-size:24px;line-height:1.4;">${escapeHtml(title)}</h1>
      ${subtitle ? `<p style="margin:8px 0 0;color:#ead7a3;font-size:15px;">${escapeHtml(subtitle)}</p>` : ''}
    </div>
    <div style="padding:24px 26px;">${content}</div>
    ${footer ? `<div style="background:#2b1a0f;color:#f4ead1;padding:18px 26px;line-height:1.8;">${footer}</div>` : ''}
  </div>
</div>`;
}

function detailsGrid(items) {
  return `
<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:16px 0;">
  ${items.filter(([, value]) => value !== undefined && value !== null && value !== '').map(([label, value]) => `
    <div style="background:#fbf8f0;border:1px solid #eee3cb;border-radius:10px;padding:10px;">
      <div style="font-size:12px;color:#7b6b55;margin-bottom:4px;">${escapeHtml(label)}</div>
      <div style="font-weight:700;color:#20140c;">${escapeHtml(value)}</div>
    </div>
  `).join('')}
</div>`;
}

function productsTable(order) {
  return `
<table dir="rtl" style="width:100%;border-collapse:collapse;margin:16px 0;text-align:right;">
  <thead>
    <tr>
      <th style="background:#f7efd9;border:1px solid #e3d2aa;padding:10px;text-align:right;">מוצר</th>
      <th style="background:#f7efd9;border:1px solid #e3d2aa;padding:10px;text-align:center;">כמות</th>
      <th style="background:#f7efd9;border:1px solid #e3d2aa;padding:10px;text-align:center;">מחיר</th>
      <th style="background:#f7efd9;border:1px solid #e3d2aa;padding:10px;text-align:center;">סה״כ</th>
    </tr>
  </thead>
  <tbody>${orderItemsRows(order)}</tbody>
</table>`;
}

function orderSummaryHtml(order) {
  return `
<div style="margin-top:16px;border-top:2px solid #e3d2aa;padding-top:12px;line-height:2;">
  <div><strong>סכום מוצרים:</strong> ${currency(order.subtotal)}</div>
  <div><strong>משלוח:</strong> ${currency(order.shipping_cost)}</div>
  <div style="font-size:20px;color:#9a6a00;"><strong>סה״כ לתשלום:</strong> ${currency(order.total)}</div>
</div>`;
}

function contactFooterHtml(settings = {}) {
  return [
    settings.store_name || 'אוצר הקדושה',
    settings.phone ? `טלפון: ${escapeHtml(settings.phone)}` : '',
    settings.whatsapp ? `וואטסאפ: ${escapeHtml(settings.whatsapp)}` : '',
    settings.email ? `דוא״ל: ${escapeHtml(settings.email)}` : '',
    settings.address ? `כתובת: ${escapeHtml(settings.address)}` : '',
  ].filter(Boolean).join('<br />');
}

function orderItemsText(order) {
  return (order.items || []).map((item, index) => {
    const lineTotal = Number(item.price || 0) * Number(item.quantity || 0);
    return [
      `${index + 1}. ${item.product_name || 'מוצר'}`,
      `   כמות: ${Number(item.quantity || 0)}`,
      `   מחיר יחידה: ${currency(item.price)}`,
      `   סה״כ שורה: ${currency(lineTotal)}`,
    ].join('\n');
  }).join('\n\n');
}

function storeContactText(settings = {}) {
  return [
    settings.store_name || 'אוצר הקדושה',
    settings.phone ? `טלפון: ${settings.phone}` : '',
    settings.whatsapp ? `וואטסאפ: ${settings.whatsapp}` : '',
    settings.email ? `דוא״ל: ${settings.email}` : '',
    settings.address ? `כתובת: ${settings.address}` : '',
  ].filter(Boolean).join('\n');
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
      const result = await base44.functions.invoke('sendOrderEmail', payload);
      return { sent: true, result };
    }
  } catch (error) {
    try {
      if (base44.entities.EmailNotification?.create) {
        await base44.entities.EmailNotification.create({
          ...emailRecord,
          status: 'failed',
          provider: 'sendOrderEmail',
          error: error.message || 'Email function failed',
        });
      }
    } catch {}
    return { queued: true, error: error.message || 'Email function failed' };
  }

  return { queued: true };
}

export function buildOrderPrintHtml(order, settings = {}) {
  const storeName = settings.store_name || 'אוצר הקדושה';
  const storePhone = settings.phone || '';
  const storeWhatsapp = settings.whatsapp || '';
  const storeEmail = settings.email || '';
  const storeAddress = settings.address || '';

  return `<!doctype html>
<html lang="he" dir="rtl">
<head>
  <meta charset="utf-8" />
  <title>הזמנה - אוצר הקדושה</title>
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
    <div><strong>מספר הזמנה:</strong> ${escapeHtml(orderNumber(order))}</div>
    <div><strong>לקוח:</strong> ${escapeHtml(order.customer_name)}</div>
    <div><strong>טלפון:</strong> ${escapeHtml(order.customer_phone)}</div>
    <div><strong>אימייל:</strong> ${escapeHtml(order.customer_email)}</div>
    <div><strong>עיר:</strong> ${escapeHtml(order.city)}</div>
    <div><strong>כתובת:</strong> ${escapeHtml(order.shipping_address)}</div>
    ${order.notes ? `<div><strong>הערות:</strong> ${escapeHtml(order.notes)}</div>` : ''}
  </div>
  <table>
    <thead>
      <tr><th>מוצר</th><th>כמות</th><th>מחיר</th><th>סה״כ שורה</th></tr>
    </thead>
    <tbody>${orderItemsRows(order)}</tbody>
  </table>
  <div class="summary">
    <div>סכום מוצרים: ${currency(order.subtotal)}</div>
    <div>משלוח: ${currency(order.shipping_cost)}</div>
    <div>סה״כ: ${currency(order.total)}</div>
  </div>
  <div class="contact">
    <strong>פרטי התקשרות:</strong>
    ${storePhone ? `<div>טלפון: ${escapeHtml(storePhone)}</div>` : ''}
    ${storeWhatsapp ? `<div>וואטסאפ: ${escapeHtml(storeWhatsapp)}</div>` : ''}
    ${storeEmail ? `<div>דוא״ל: ${escapeHtml(storeEmail)}</div>` : ''}
    ${storeAddress ? `<div>כתובת: ${escapeHtml(storeAddress)}</div>` : ''}
  </div>
</body>
</html>`;
}

export function buildCustomerOrderEmail(order, settings = {}) {
  const storeName = settings.store_name || 'אוצר הקדושה';
  const orderDate = new Date(order.created_at || order.created_date || Date.now()).toLocaleString('he-IL');
  const content = `
    <p style="font-size:16px;line-height:1.9;margin:0 0 16px;">
      שלום ${escapeHtml(order.customer_name || 'לקוח יקר')},<br />
      קיבלנו את הזמנתך באתר ${escapeHtml(storeName)}. צוות החנות יטפל בהזמנה בהקדם וייצור קשר במידת הצורך.
    </p>
    <h2 style="font-size:18px;color:#9a6a00;margin:18px 0 8px;">פרטי ההזמנה</h2>
    ${detailsGrid([
      ['מספר הזמנה', orderNumber(order)],
      ['תאריך', orderDate],
      ['שם', order.customer_name],
      ['טלפון', order.customer_phone],
      ['אימייל', order.customer_email],
      ['עיר', order.city],
      ['כתובת למשלוח', order.shipping_address],
      ['הערות', order.notes],
    ])}
    <h2 style="font-size:18px;color:#9a6a00;margin:18px 0 8px;">מוצרים שהוזמנו</h2>
    ${productsTable(order)}
    ${orderSummaryHtml(order)}
    <p style="margin:18px 0 0;line-height:1.8;">תודה שבחרת אוצר הקדושה.</p>
  `;
  return emailShell('תודה רבה, הזמנתך התקבלה בהצלחה', `מספר הזמנה: ${orderNumber(order)}`, content, contactFooterHtml(settings));
}

export function buildOrderAdminEmail(order, settings = {}) {
  const orderDate = new Date(order.created_at || order.created_date || Date.now()).toLocaleString('he-IL');
  const content = `
    <h2 style="font-size:18px;color:#9a6a00;margin:0 0 8px;">פרטי לקוח</h2>
    ${detailsGrid([
      ['מספר הזמנה', orderNumber(order)],
      ['תאריך', orderDate],
      ['לקוח', order.customer_name],
      ['טלפון', order.customer_phone],
      ['אימייל', order.customer_email],
      ['עיר', order.city],
      ['כתובת', order.shipping_address],
      ['הערות לקוח', order.notes],
    ])}
    <h2 style="font-size:18px;color:#9a6a00;margin:18px 0 8px;">מוצרים בהזמנה</h2>
    ${productsTable(order)}
    ${orderSummaryHtml(order)}
    <div style="margin-top:18px;padding:14px;border-radius:10px;background:#fbf8f0;border:1px solid #eee3cb;line-height:1.8;">
      <strong>פעולות מנהל:</strong><br />
      צפייה בהזמנה: /secret-admin/orders?order=${escapeHtml(order.id || '')}<br />
      אישור הזמנה: /secret-admin/orders?order=${escapeHtml(order.id || '')}&amp;action=approve
    </div>
  `;
  return emailShell('התקבלה הזמנה חדשה באתר אוצר הקדושה', `מספר הזמנה: ${orderNumber(order)}`, content, contactFooterHtml(settings));
}

export function buildCustomerApprovalEmail(order, settings = {}) {
  const content = `
    <p style="font-size:16px;line-height:1.9;margin:0 0 16px;">
      שלום ${escapeHtml(order.customer_name || 'לקוח יקר')},<br />
      שמחים לעדכן כי הזמנתך אושרה ונמצאת בטיפול.
    </p>
    ${productsTable(order)}
    ${orderSummaryHtml(order)}
    <p style="margin:18px 0 0;">תודה שבחרת אוצר הקדושה.</p>
  `;
  return emailShell('הזמנתך אושרה', `מספר הזמנה: ${orderNumber(order)}`, content, contactFooterHtml(settings));
}

export function buildCustomerDeliveryEmail(order, settings = {}) {
  const content = `
    <p style="font-size:16px;line-height:1.9;margin:0;">
      שלום ${escapeHtml(order.customer_name || 'לקוח יקר')},<br />
      הזמנתך מספר ${escapeHtml(orderNumber(order))} נמסרה בהצלחה.
    </p>
    <p style="margin:18px 0 0;">תודה שבחרת אוצר הקדושה.</p>
  `;
  return emailShell('הזמנתך נמסרה בהצלחה', `מספר הזמנה: ${orderNumber(order)}`, content, contactFooterHtml(settings));
}

export async function reserveStockForItems(items, options = {}) {
  const enforceStock = options.enforceStock === true;
  const reserved = [];
  const enrichedItems = [];

  for (const item of items) {
    const product = (await base44.entities.Product.filter({ id: item.product_id }, '-created_date', 1))?.[0];
    if (!product) throw new Error(`המוצר ${item.product_name} לא נמצא במערכת.`);

    const quantity = Number(item.quantity || 0);
    const hasStockCount = product.stock_quantity !== undefined && product.stock_quantity !== null && product.stock_quantity !== '';
    const currentStock = Number(product.stock_quantity || 0);

    if (enforceStock && (product.in_stock === false || (hasStockCount && currentStock < quantity))) {
      throw new Error(`אין מספיק מלאי עבור ${product.name}.`);
    }

    if (enforceStock && hasStockCount) {
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
