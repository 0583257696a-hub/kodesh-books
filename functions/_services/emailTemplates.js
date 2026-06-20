import { numberValue } from './http.js';

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

function orderNumber(order) {
  return order?.order_number || order?.id || '';
}

function orderDate(order) {
  return new Date(order?.created_at || order?.created_date || Date.now()).toLocaleString('he-IL');
}

function footer(settings = {}) {
  return [
    settings.store_name || 'אוצר הקדושה',
    settings.phone ? `טלפון: ${escapeHtml(settings.phone)}` : '',
    settings.whatsapp ? `וואטסאפ: ${escapeHtml(settings.whatsapp)}` : '',
    settings.email ? `דוא"ל: ${escapeHtml(settings.email)}` : '',
    settings.address ? `כתובת: ${escapeHtml(settings.address)}` : '',
  ].filter(Boolean).join('<br />');
}

function shell(title, subtitle, content, settings = {}) {
  return `<!doctype html>
<html lang="he" dir="rtl">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
</head>
<body dir="rtl" style="margin:0;padding:0;background:#f7f2e8;font-family:Arial,'Helvetica Neue',sans-serif;color:#2b1a0f;text-align:right;">
  <div style="padding:24px;">
    <div style="max-width:720px;margin:0 auto;background:#ffffff;border:1px solid #e8d9b2;border-radius:14px;overflow:hidden;">
      <div style="background:#2b1a0f;color:#ffffff;padding:22px 26px;">
        <h1 style="margin:0;font-size:24px;line-height:1.4;">${escapeHtml(title)}</h1>
        ${subtitle ? `<p style="margin:8px 0 0;color:#ead7a3;font-size:15px;">${escapeHtml(subtitle)}</p>` : ''}
      </div>
      <div style="padding:24px 26px;">${content}</div>
      <div style="background:#2b1a0f;color:#f4ead1;padding:18px 26px;line-height:1.8;font-size:14px;">
        ${footer(settings)}
      </div>
    </div>
  </div>
</body>
</html>`;
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

function itemsRows(order) {
  return (order.items || []).map((item) => {
    const quantity = numberValue(item.quantity, 1);
    const price = numberValue(item.price ?? item.unit_price);
    return `
      <tr>
        <td style="padding:10px;border:1px solid #d7d7d7;text-align:right;">${escapeHtml(item.product_name)}</td>
        <td style="padding:10px;border:1px solid #d7d7d7;text-align:center;">${quantity}</td>
        <td style="padding:10px;border:1px solid #d7d7d7;text-align:center;">${currency(price)}</td>
        <td style="padding:10px;border:1px solid #d7d7d7;text-align:center;font-weight:700;">${currency(price * quantity)}</td>
      </tr>
    `;
  }).join('');
}

function productsTable(order) {
  return `
<table dir="rtl" style="width:100%;border-collapse:collapse;margin:16px 0;text-align:right;">
  <thead>
    <tr>
      <th style="background:#f7efd9;border:1px solid #e3d2aa;padding:10px;text-align:right;">מוצר</th>
      <th style="background:#f7efd9;border:1px solid #e3d2aa;padding:10px;text-align:center;">כמות</th>
      <th style="background:#f7efd9;border:1px solid #e3d2aa;padding:10px;text-align:center;">מחיר</th>
      <th style="background:#f7efd9;border:1px solid #e3d2aa;padding:10px;text-align:center;">סה"כ</th>
    </tr>
  </thead>
  <tbody>${itemsRows(order)}</tbody>
</table>`;
}

function summary(order) {
  return `
<div style="margin-top:16px;border-top:2px solid #e3d2aa;padding-top:12px;line-height:2;">
  <div><strong>סכום מוצרים:</strong> ${currency(order.subtotal)}</div>
  <div><strong>משלוח:</strong> ${currency(order.shipping_cost)}</div>
  <div style="font-size:20px;color:#9a6a00;"><strong>סה"כ לתשלום:</strong> ${currency(order.total)}</div>
</div>`;
}

function orderDetails(order) {
  return detailsGrid([
    ['מספר הזמנה', orderNumber(order)],
    ['תאריך', orderDate(order)],
    ['שם', order.customer_name],
    ['טלפון', order.customer_phone],
    ['אימייל', order.customer_email],
    ['עיר', order.city],
    ['כתובת למשלוח', order.shipping_address],
    ['הערות', order.notes],
  ]);
}

export function buildAdminNewOrderEmail(order, settings = {}) {
  const title = 'התקבלה הזמנה חדשה באתר';
  const content = `
    <h2 style="font-size:18px;color:#9a6a00;margin:0 0 8px;">פרטי לקוח</h2>
    ${orderDetails(order)}
    <h2 style="font-size:18px;color:#9a6a00;margin:18px 0 8px;">מוצרים בהזמנה</h2>
    ${productsTable(order)}
    ${summary(order)}
    <div style="margin-top:18px;padding:14px;border-radius:10px;background:#fbf8f0;border:1px solid #eee3cb;line-height:1.8;">
      <strong>פעולות מנהל:</strong><br />
      צפייה בהזמנה: /secret-admin/orders?order=${escapeHtml(order.id || '')}
    </div>
  `;
  return shell(title, `מספר הזמנה: ${orderNumber(order)}`, content, settings);
}

export function buildCustomerOrderConfirmationEmail(order, settings = {}) {
  const storeName = settings.store_name || 'אוצר הקדושה';
  const title = 'תודה רבה, הזמנתך התקבלה בהצלחה';
  const content = `
    <p style="font-size:16px;line-height:1.9;margin:0 0 16px;">
      שלום ${escapeHtml(order.customer_name || 'לקוח יקר')},<br />
      קיבלנו את הזמנתך באתר ${escapeHtml(storeName)}. צוות החנות יטפל בהזמנה בהקדם ויצור קשר במידת הצורך.
    </p>
    <h2 style="font-size:18px;color:#9a6a00;margin:18px 0 8px;">פרטי ההזמנה</h2>
    ${orderDetails(order)}
    <h2 style="font-size:18px;color:#9a6a00;margin:18px 0 8px;">מוצרים שהוזמנו</h2>
    ${productsTable(order)}
    ${summary(order)}
  `;
  return shell(title, `מספר הזמנה: ${orderNumber(order)}`, content, settings);
}

export function buildOrderApprovedEmail(order, settings = {}) {
  const title = 'הזמנתך אושרה';
  const content = `
    <p style="font-size:16px;line-height:1.9;margin:0 0 16px;">
      שלום ${escapeHtml(order.customer_name || 'לקוח יקר')},<br />
      שמחים לעדכן כי הזמנתך אושרה ונמצאת בטיפול.
    </p>
    ${productsTable(order)}
    ${summary(order)}
  `;
  return shell(title, `מספר הזמנה: ${orderNumber(order)}`, content, settings);
}

export function buildOrderDeliveredEmail(order, settings = {}) {
  const title = 'הזמנתך נמסרה בהצלחה';
  const content = `
    <p style="font-size:16px;line-height:1.9;margin:0;">
      שלום ${escapeHtml(order.customer_name || 'לקוח יקר')},<br />
      הזמנתך מספר ${escapeHtml(orderNumber(order))} נמסרה בהצלחה.
    </p>
    <p style="margin:18px 0 0;">תודה שבחרת אוצר הקדושה.</p>
  `;
  return shell(title, `מספר הזמנה: ${orderNumber(order)}`, content, settings);
}

export function buildOrderCancelledEmail(order, settings = {}) {
  const title = 'הזמנתך בוטלה';
  const content = `
    <p style="font-size:16px;line-height:1.9;margin:0;">
      שלום ${escapeHtml(order.customer_name || 'לקוח יקר')},<br />
      הזמנתך מספר ${escapeHtml(orderNumber(order))} בוטלה. אם הביטול אינו ברור, ניתן ליצור איתנו קשר ונשמח לעזור.
    </p>
  `;
  return shell(title, `מספר הזמנה: ${orderNumber(order)}`, content, settings);
}
