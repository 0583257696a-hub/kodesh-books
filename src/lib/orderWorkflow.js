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
  const storePhone = settings.phone || '';
  const storeWhatsapp = settings.whatsapp || '';
  const storeEmail = settings.email || '';
  const storeAddress = settings.address || '';
  const orderDate = new Date(order.created_at || order.created_date || Date.now()).toLocaleString('he-IL');

  return `<!doctype html>
<html lang="he" dir="rtl">
<head>
  <meta charset="utf-8" />
  <style>
    body { margin:0; padding:0; direction:rtl; background:#f7f2e8; font-family:Arial, sans-serif; color:#2b1a0f; }
    .wrap { max-width:720px; margin:0 auto; padding:24px; }
    .card { background:#fff; border:1px solid #e8d9b2; border-radius:16px; overflow:hidden; box-shadow:0 12px 30px rgba(43,26,15,.08); }
    .header { background:#2b1a0f; color:#fff; padding:26px; text-align:right; }
    .header h1 { margin:0; font-size:25px; line-height:1.35; }
    .header p { margin:10px 0 0; color:#ead7a3; font-size:15px; }
    .section { padding:24px 26px; border-bottom:1px solid #f0e6d0; }
    .section h2 { margin:0 0 14px; font-size:18px; color:#9a6a00; }
    .intro { font-size:16px; line-height:1.9; margin:0; color:#3a2a1e; }
    .grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
    .field { background:#fbf8f0; border:1px solid #eee3cb; border-radius:10px; padding:11px; }
    .label { display:block; font-size:12px; color:#7b6b55; margin-bottom:5px; }
    .value { font-weight:700; color:#20140c; }
    table { width:100%; border-collapse:collapse; direction:rtl; }
    th { background:#f7efd9; color:#2b1a0f; padding:10px; border:1px solid #e3d2aa; text-align:right; }
    td { padding:10px; border:1px solid #e3d2aa; text-align:right; }
    .summary-row { display:flex; justify-content:space-between; gap:16px; padding:8px 0; }
    .total { font-size:20px; font-weight:800; color:#9a6a00; border-top:2px solid #e3d2aa; margin-top:8px; padding-top:12px; }
    .contact { background:#2b1a0f; color:#fff; padding:22px 26px; }
    .contact h2 { color:#d4af37; margin:0 0 12px; font-size:18px; }
    .contact p { margin:6px 0; color:#f4ead1; }
    .note { margin-top:14px; padding:14px; border-radius:10px; background:#fff8e6; border:1px solid #e4c567; color:#5b4316; font-size:14px; }
    @media (max-width:560px) {
      .wrap { padding:12px; }
      .grid { grid-template-columns:1fr; }
      .section, .header, .contact { padding:18px; }
      table { font-size:13px; }
    }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="card">
      <div class="header">
        <h1>תודה רבה, הזמנתך התקבלה בהצלחה</h1>
        <p>${escapeHtml(storeName)} | מספר הזמנה: ${escapeHtml(orderNumber(order))}</p>
      </div>

      <div class="section">
        <p class="intro">
          שלום ${escapeHtml(order.customer_name || 'לקוח יקר')},<br />
          קיבלנו את הזמנתך באתר ${escapeHtml(storeName)}. צוות החנות יטפל בהזמנה בהקדם וייצור קשר במידת הצורך.
          מצורף למייל זה קובץ סיכום הזמנה לשמירה או הדפסה.
        </p>
        <div class="note">שימו לב: זמני האספקה תלויים בזמינות המלאי ובשיטת המשלוח שנבחרה.</div>
      </div>

      <div class="section">
        <h2>פרטי ההזמנה</h2>
        <div class="grid">
          <div class="field"><span class="label">מספר הזמנה</span><span class="value">${escapeHtml(orderNumber(order))}</span></div>
          <div class="field"><span class="label">תאריך</span><span class="value">${escapeHtml(orderDate)}</span></div>
          <div class="field"><span class="label">שם</span><span class="value">${escapeHtml(order.customer_name)}</span></div>
          <div class="field"><span class="label">טלפון</span><span class="value">${escapeHtml(order.customer_phone)}</span></div>
          <div class="field"><span class="label">עיר</span><span class="value">${escapeHtml(order.city)}</span></div>
          <div class="field"><span class="label">אימייל</span><span class="value">${escapeHtml(order.customer_email)}</span></div>
          <div class="field" style="grid-column:1 / -1;"><span class="label">כתובת למשלוח</span><span class="value">${escapeHtml(order.shipping_address)}</span></div>
        </div>
      </div>

      <div class="section">
        <h2>מוצרים שהוזמנו</h2>
        <table>
          <thead><tr><th>מוצר</th><th>כמות</th><th>מחיר יחידה</th><th>סה״כ</th></tr></thead>
          <tbody>${orderItemsRows(order)}</tbody>
        </table>
      </div>

      <div class="section">
        <h2>סיכום לתשלום</h2>
        <div class="summary-row"><span>סכום מוצרים</span><strong>${currency(order.subtotal)}</strong></div>
        <div class="summary-row"><span>משלוח</span><strong>${currency(order.shipping_cost)}</strong></div>
        <div class="summary-row total"><span>סה״כ</span><span>${currency(order.total)}</span></div>
      </div>

      <div class="contact">
        <h2>פרטי התקשרות עם החנות</h2>
        ${storePhone ? `<p><strong>טלפון:</strong> ${escapeHtml(storePhone)}</p>` : ''}
        ${storeWhatsapp ? `<p><strong>וואטסאפ:</strong> ${escapeHtml(storeWhatsapp)}</p>` : ''}
        ${storeEmail ? `<p><strong>דוא״ל:</strong> ${escapeHtml(storeEmail)}</p>` : ''}
        ${storeAddress ? `<p><strong>כתובת:</strong> ${escapeHtml(storeAddress)}</p>` : ''}
      </div>
    </div>
  </div>
</body>
</html>`;
}

export function buildOrderAdminEmail(order) {
  const orderDate = new Date(order.created_at || order.created_date || Date.now()).toLocaleString('he-IL');

  return `<!doctype html>
<html lang="he" dir="rtl">
<head>
  <meta charset="utf-8" />
  <style>
    body { margin:0; padding:0; direction:rtl; background:#f6f3ec; font-family:Arial, sans-serif; color:#2b1a0f; }
    .wrap { max-width:720px; margin:0 auto; padding:24px; }
    .card { background:#fff; border:1px solid #e7d8b5; border-radius:14px; overflow:hidden; }
    .header { background:#2b1a0f; color:#fff; padding:22px 26px; }
    .header h1 { margin:0; font-size:24px; }
    .header p { margin:8px 0 0; color:#ead7a3; }
    .section { padding:22px 26px; border-bottom:1px solid #f0e6d0; }
    .section h2 { margin:0 0 14px; font-size:18px; color:#9a6a00; }
    .grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
    .field { background:#faf8f3; border:1px solid #eee3cb; border-radius:10px; padding:10px; }
    .label { display:block; font-size:12px; color:#7b6b55; margin-bottom:4px; }
    .value { font-weight:700; color:#20140c; }
    table { width:100%; border-collapse:collapse; direction:rtl; }
    th { background:#f7efd9; color:#2b1a0f; padding:10px; border:1px solid #e3d2aa; text-align:right; }
    td { padding:10px; border:1px solid #e3d2aa; text-align:right; }
    .summary-row { display:flex; justify-content:space-between; padding:8px 0; }
    .total { font-size:20px; font-weight:800; color:#9a6a00; border-top:2px solid #e3d2aa; margin-top:8px; padding-top:12px; }
    .actions { padding:22px 26px; text-align:center; }
    .button { display:inline-block; margin:4px; padding:12px 18px; border-radius:10px; text-decoration:none; font-weight:700; }
    .primary { background:#d4af37; color:#2b1a0f; }
    .secondary { background:#f4ead1; color:#2b1a0f; }
    .print { margin-top:18px; padding:16px; background:#fafafa; border:1px dashed #c7b27a; border-radius:10px; color:#555; font-size:13px; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="card">
      <div class="header">
        <h1>התקבלה הזמנה חדשה באתר אוצר הקדושה</h1>
        <p>מספר הזמנה: ${escapeHtml(orderNumber(order))} | ${escapeHtml(orderDate)}</p>
      </div>

      <div class="section">
        <h2>פרטי לקוח</h2>
        <div class="grid">
          <div class="field"><span class="label">שם</span><span class="value">${escapeHtml(order.customer_name)}</span></div>
          <div class="field"><span class="label">טלפון</span><span class="value">${escapeHtml(order.customer_phone)}</span></div>
          <div class="field"><span class="label">אימייל</span><span class="value">${escapeHtml(order.customer_email)}</span></div>
          <div class="field"><span class="label">עיר</span><span class="value">${escapeHtml(order.city)}</span></div>
          <div class="field" style="grid-column:1 / -1;"><span class="label">כתובת</span><span class="value">${escapeHtml(order.shipping_address)}</span></div>
          ${order.notes ? `<div class="field" style="grid-column:1 / -1;"><span class="label">הערות לקוח</span><span class="value">${escapeHtml(order.notes)}</span></div>` : ''}
        </div>
      </div>

      <div class="section">
        <h2>מוצרים בהזמנה</h2>
        <table>
          <thead><tr><th>מוצר</th><th>כמות</th><th>מחיר יחידה</th><th>סה״כ</th></tr></thead>
          <tbody>${orderItemsRows(order)}</tbody>
        </table>
      </div>

      <div class="section">
        <h2>סיכום הזמנה</h2>
        <div class="summary-row"><span>סכום מוצרים</span><strong>${currency(order.subtotal)}</strong></div>
        <div class="summary-row"><span>משלוח</span><strong>${currency(order.shipping_cost)}</strong></div>
        <div class="summary-row total"><span>סה״כ</span><span>${currency(order.total)}</span></div>
      </div>

      <div class="actions">
        <a class="button primary" href="/secret-admin/orders?order=${encodeURIComponent(order.id || '')}">צפייה בהזמנה</a>
        <a class="button secondary" href="/secret-admin/orders?order=${encodeURIComponent(order.id || '')}&action=approve">אישור הזמנה</a>
        <div class="print">
          קובץ ההדפסה של ההזמנה מצורף אם שירות המייל תומך בצירוף קבצים. בנוסף, ניתן להדפיס את ההזמנה ישירות ממסך ניהול ההזמנות.
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;
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
