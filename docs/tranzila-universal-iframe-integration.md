# Tranzila iframe - קובץ הטמעה אוניברסלי

מסמך זה מתאר הטמעת Tranzila iframe בצורה אוניברסלית, בלי תלות ב-React/Vite/Cloudflare דווקא. המודל המומלץ כאן הוא J5/Verification: הלקוח מזין אשראי בדף Tranzila המוטמע באתר, העסקה נשמרת לאישור, והחיוב הסופי מתבצע בפאנל Tranzila.

## עקרונות

- פרטי אשראי לא עוברים דרך השרת שלך.
- האתר יוצר הזמנה ורשומת תשלום פנימית.
- הלקוח ממלא אשראי בתוך iframe של Tranzila.
- Tranzila מחזירה success/fail/notify.
- אם האימות הצליח, ההזמנה מסומנת כממתינה לאישור מנהל.
- אין לסמן הזמנה כ-`paid` בשלב J5 בלבד.
- החיוב הסופי מתבצע בפאנל Tranzila, אלא אם מפעילים בנפרד API לחיוב מאוחר.

## משתני סביבה

```env
SITE_URL=https://your-domain.com
TRANZILA_TERMINAL_NAME=your_terminal
TRANZILA_IFRAME_BASE_URL=https://directng.tranzila.com
TRANZILA_IFRAME_PATH=iframenew.php
TRANZILA_TRANMODE=V
TRANZILA_CURRENCY=1
TRANZILA_ENABLE_J5=true
```

אין להכניס את הערכים האלו לקוד frontend אם הם רגישים. שם מסוף וכתובות callback אפשר להחזיר מהשרת כחלק מ-session, אבל מפתחות API וסודות חייבים להישאר בצד שרת בלבד.

## כתובת iframe

```text
https://directng.tranzila.com/{TRANZILA_TERMINAL_NAME}/iframenew.php
```

דוגמה:

```js
const iframeUrl = `${baseUrl}/${encodeURIComponent(terminalName)}/iframenew.php`;
```

## שדות חובה מומלצים לשליחה ל-Tranzila

```js
const fields = {
  supplier: terminalName,
  sum: order.total.toFixed(2),
  currency: '1',
  tranmode: 'V',
  orderId: order.orderNumber,
  myid: paymentTransactionId,
  DCdisable: paymentTransactionId,
  contact: order.customerName,
  company: order.customerName,
  email: order.customerEmail,
  phone: order.customerPhone,
  country: 'Israel',
  zip: order.zip || '0000000',
  address: order.address,
  city: order.city,
  success_url_address: `${siteUrl}/api/payments/tranzila/success?order_id=${order.id}`,
  fail_url_address: `${siteUrl}/api/payments/tranzila/fail?order_id=${order.id}`,
  notify_url_address: `${siteUrl}/api/payments/tranzila/notify?order_id=${order.id}`,
};
```

אם המסוף דורש שמות שדות נוספים, יש להוסיף אותם דרך הגדרות המסוף או לפי תיעוד Tranzila, בלי לשנות את פרטי האשראי עצמם.

## טופס iframe ב-HTML

```html
<form id="tranzila-form" method="POST" target="tranzila-payment-frame" action="https://directng.tranzila.com/YOUR_TERMINAL/iframenew.php">
  <input type="hidden" name="supplier" value="YOUR_TERMINAL" />
  <input type="hidden" name="sum" value="175.00" />
  <input type="hidden" name="currency" value="1" />
  <input type="hidden" name="tranmode" value="V" />
  <input type="hidden" name="orderId" value="OK-20260703-0001" />
  <input type="hidden" name="DCdisable" value="payment-transaction-id" />
  <input type="hidden" name="success_url_address" value="https://your-domain.com/api/payments/tranzila/success" />
  <input type="hidden" name="fail_url_address" value="https://your-domain.com/api/payments/tranzila/fail" />
  <input type="hidden" name="notify_url_address" value="https://your-domain.com/api/payments/tranzila/notify" />
</form>

<iframe
  name="tranzila-payment-frame"
  title="תשלום מאובטח ב-Tranzila"
  style="width: 100%; min-height: 620px; border: 0;"
  allow="payment"
></iframe>

<script>
  document.getElementById('tranzila-form').submit();
</script>
```

## דוגמת endpoint ליצירת session

```js
export async function createTranzilaSession(env, order) {
  const terminalName = env.TRANZILA_TERMINAL_NAME;
  const siteUrl = env.SITE_URL;
  const paymentTransactionId = crypto.randomUUID();

  const iframeUrl = `https://directng.tranzila.com/${encodeURIComponent(terminalName)}/iframenew.php`;
  const fields = {
    supplier: terminalName,
    sum: Number(order.total).toFixed(2),
    currency: env.TRANZILA_CURRENCY || '1',
    tranmode: env.TRANZILA_TRANMODE || 'V',
    orderId: order.order_number,
    myid: paymentTransactionId,
    DCdisable: paymentTransactionId,
    contact: order.customer_name,
    company: order.customer_name,
    email: order.customer_email,
    phone: order.customer_phone,
    country: order.country || 'Israel',
    zip: order.zip || '0000000',
    address: order.address || '',
    city: order.city || '',
    success_url_address: `${siteUrl}/api/payments/tranzila/success?order_id=${encodeURIComponent(order.id)}`,
    fail_url_address: `${siteUrl}/api/payments/tranzila/fail?order_id=${encodeURIComponent(order.id)}`,
    notify_url_address: `${siteUrl}/api/payments/tranzila/notify?order_id=${encodeURIComponent(order.id)}`,
  };

  return {
    iframe_url: iframeUrl,
    method: 'POST',
    fields,
    transaction_id: paymentTransactionId,
  };
}
```

## notify callback

ה-callback חייב לתמוך גם ב-GET וגם ב-POST, כי המסוף יכול להיות מוגדר כך או כך.

```js
async function readTranzilaPayload(request) {
  const url = new URL(request.url);
  const payload = Object.fromEntries(url.searchParams.entries());

  if (request.method === 'POST') {
    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      Object.assign(payload, await request.json());
    } else {
      const formData = await request.formData();
      for (const [key, value] of formData.entries()) {
        payload[key] = String(value);
      }
    }
  }

  return payload;
}
```

## מיפוי קודי תשובה

```js
function tranzilaStatus(payload) {
  const code = payload.Response || payload.response || payload.response_code || '';
  if (code === '000' || code === '777') return 'verified';
  if (!code) return 'pending';
  return 'verification_failed';
}
```

## סטטוסים מומלצים

```text
manual_pending
pending_payment_verification
payment_verified_waiting_manager_approval
payment_verification_failed
paid
cancelled
```

ב-J5 אין להשתמש ב-`paid` עד שיש אישור חיוב אמיתי.

## הגדרות שצריך לבצע בפאנל Tranzila

במסוף Tranzila יש להגדיר:

- Success URL: `https://your-domain.com/api/payments/tranzila/success`
- Fail URL: `https://your-domain.com/api/payments/tranzila/fail`
- Notify URL: `https://your-domain.com/api/payments/tranzila/notify`
- Return Method: לפי המסוף, מומלץ POST אם אפשר
- הפעלת J5 / Verification / Tokenization במסוף
- ביטול חיוב מיידי אם עובדים במודל אישור מנהל

אם מתקבל `Illegal Operation`, יש לבדוק מול Tranzila שהמסוף מורשה ל-J5/Verification.

## לוגים שאסור לכלול בהם פרטי אשראי

מותר לשמור:

- response code
- transaction id
- auth number
- token אם Tranzila מחזירה token מאושר לשימוש
- 4 ספרות אחרונות
- raw payload מנוקה מפרטי אשראי

אסור לשמור:

- מספר כרטיס מלא
- CVV
- תוקף מלא אם אינו נדרש
- תעודת זהות אם אין צורך עסקי/משפטי ברור

## בדיקת תקינות

1. צור הזמנה בסכום קטן.
2. ודא שה-iframe נפתח בתוך האתר.
3. ודא ש-Tranzila מקבלת את הסכום הנכון.
4. ודא ש-notify חוזר לשרת.
5. ודא שההזמנה לא מסומנת `paid` לאחר J5.
6. אשר את העסקה בפאנל Tranzila.
7. ודא שמיילים ולוגים נשמרים.
