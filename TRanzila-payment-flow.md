# Tranzila J5 payment flow

מסמך זה מתאר את ההטמעה הנוכחית באתר אוצר הקדושה עבור Tranzila iframe במודל J5.

## זרימה

1. הלקוח יוצר הזמנה בצ'קאאוט.
2. האתר יוצר רשומת `payment_transactions` מסוג `verification`.
3. הדפדפן שולח טופס POST ל-iframe של Tranzila עם:
   - `tranmode=V`
   - `sum`
   - `currency=1`
   - `myid`
   - `orderId`
   - `DCdisable`
   - כתובות success/fail/notify
4. הלקוח מזין אשראי בתוך Tranzila בלבד.
5. Tranzila מחזירה callback ל-`/api/payments/tranzila/notify`.
6. אם `Response=000` או `777`, ההזמנה עוברת לסטטוס `payment_verified_waiting_manager_approval`.
7. בשלב זה ההזמנה אינה מסומנת `paid`.
8. מנהל נכנס לפאנל Tranzila ומאשר שם את העסקה.
9. האתר אינו מבצע חיוב דרך API ואינו מחזיק פרטי כרטיס מלאים.
10. אם Tranzila שולחת callback נוסף לאחר חיוב בפאנל, ניתן להרחיב את `notify` כדי לסמן `paid` לפי payload מאומת.

## סטטוסים

- `manual_pending` - ההזמנה נוצרה ועדיין לא התחיל אימות אשראי.
- `pending_payment_verification` - נפתח תהליך J5 וממתינים ל-callback.
- `payment_verified_waiting_manager_approval` - הכרטיס אומת ונשמר token, ממתין לאישור מנהל.
- `payment_verification_failed` - אימות הכרטיס נכשל.
- `paid` - יש להשתמש בו רק אם מתקבל אישור חיוב אמיתי ומאומת מטרנזילה, או לאחר תהליך ידני מפורש.

## משתני סביבה

נדרש להגדיר ב-Cloudflare:

```env
TRANZILA_TERMINAL_NAME=
TRANZILA_TRANMODE=V
TRANZILA_ENABLE_J5=true
SITE_URL=https://otzar-hakodesh.shop
```

אופציונלי, לפי הגדרת המסוף מול Tranzila:

```env
TRANZILA_IFRAME_BASE_URL=https://directng.tranzila.com
TRANZILA_IFRAME_PATH=iframenew.php
TRANZILA_IFRAME_TEMPLATE=
```

לא נדרשים `TRANZILA_API_APP_KEY` או `TRANZILA_API_SECRET` במודל הנוכחי, כי האתר לא מבצע חיוב API.

## מה הוטמע

- יצירת session ל-iframe עם `tranmode=V`.
- זיהוי הזמנה דרך `order_id`, `orderId`, `myid` או `DCdisable`.
- שמירת payload מנוקה בלבד ללא מספר כרטיס מלא וללא CVV.
- שמירת token, ארבע ספרות אחרונות, קוד תשובה, הודעת תשובה ומזהה Tranzila כאשר הם חוזרים.
- אימות סכום מול ההזמנה לפני סימון verification כמוצלח.
- סטטוס הזמנה חדש: `payment_verified_waiting_manager_approval`.
- הצגת סטטוס תשלום Tranzila בפאנל ההזמנות.
- הבהרה בפאנל שהאישור והחיוב הסופי מתבצעים בפאנל Tranzila.

## מה עדיין צריך להשלים בפאנל Tranzila

בפאנל Tranzila יש לוודא:

- המסוף מאפשר J5 / Verification.
- העסקאות נשמרות כעסקאות לאישור ולא נסלקות מיד.
- הכתובות success/fail/notify מוגדרות לדומיין האתר.
- `Return Method` מוגדר לפי מה שהמסוף דורש, כאשר באתר נתמכים גם GET וגם POST.
- אם Tranzila שולחת callback נוסף אחרי אישור/חיוב בפאנל, יש להעביר דוגמת payload כדי למפות אותו לסטטוס `paid`.
