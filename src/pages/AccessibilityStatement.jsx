import React, { useEffect } from 'react';

const sections = [
  {
    title: 'מהות אתר אינטרנט נגיש',
    body: [
      'אתר אינטרנט נגיש הוא אתר המאפשר לכל אדם, לרבות אנשים עם מוגבלות, לגלוש בו בצורה נוחה, יעילה ועצמאית, תוך שימוש בטכנולוגיות מסייעות ובהתאם ליכולותיו האישיות.',
    ],
  },
  {
    title: 'ביצוע התאמות הנגישות באתר האינטרנט',
    body: [
      'התאמות הנגישות באתר בוצעו בהתאם לתקנות שוויון זכויות לאנשים עם מוגבלות (התאמות נגישות לשירות), התשע"ג-2013 ובהתאם להנחיות התקן הישראלי ת"י 5568 המבוסס על תקן WCAG 2.1.',
      'האתר שואף לעמוד ברמת נגישות AA.',
    ],
    list: [
      'תמיכה מלאה בניווט באמצעות מקלדת.',
      'שימוש בכותרות היררכיות תקינות.',
      'התאמת צבעים וניגודיות.',
      'אפשרות הגדלת טקסט באמצעות הדפדפן.',
      'תמיכה בקוראי מסך.',
      'תיאורי ALT לתמונות מרכזיות.',
      'מבנה אתר ברור ועקבי.',
      'התאמה לשימוש במכשירים ניידים.',
      'כפתורים וקישורים ברורים ונגישים.',
      'מניעת הבהובים או אנימציות העלולות להפריע למשתמשים.',
    ],
    footer: 'האתר נבדק ומתוחזק באופן שוטף במטרה לשפר את רמת הנגישות.',
  },
  {
    title: 'שימוש בטכנולוגיות מסייעות',
    body: [
      'האתר תומך בשימוש בתוכנות קוראות מסך ובטכנולוגיות מסייעות שונות.',
      'ניתן לנווט באתר באמצעות:',
    ],
    list: [
      'מקש Tab ו-Shift+Tab למעבר בין רכיבים.',
      'מקש Enter לבחירה והפעלה.',
      'מקשי החצים לניווט באזורים שונים.',
      'מקש Esc ליציאה מחלונות ותפריטים.',
    ],
  },
  {
    title: 'הצהרה על עמידה חלקית בתקן',
    body: [
      'ייתכן כי חלק מהתכנים המוטמעים באתר על ידי צדדים שלישיים (כגון שירותי סליקה, מפות, סרטונים או תוספים חיצוניים) אינם בשליטת האתר באופן מלא.',
      'לכן ייתכנו מקרים בהם נגישותם של רכיבים אלו תהיה חלקית.',
    ],
  },
  {
    title: 'ישימות מיטבית לנגישות באתר',
    body: ['האתר מותאם לשימוש בדפדפנים הנפוצים:'],
    list: ['Google Chrome', 'Microsoft Edge', 'Mozilla Firefox', 'Safari'],
    footer: 'וכן תומך בתוכנות קוראות מסך נפוצות כגון: NVDA, JAWS ו-VoiceOver.',
  },
  {
    title: 'שלבי ההנגשה',
    body: [
      'האתר נמצא בתהליך תחזוקה ושיפור מתמשך של רכיבי הנגישות.',
      'אנו ממשיכים לבצע בדיקות תקופתיות ולהוסיף התאמות נגישות בהתאם לצורך.',
    ],
  },
  {
    title: 'הסדרי נגישות',
    body: [
      'האתר הינו אתר מסחר מקוון הפועל באמצעות האינטרנט.',
      'במידה ויינתנו שירותים פרונטליים או איסוף עצמי בעתיד, פרטי הסדרי הנגישות יעודכנו בהתאם.',
    ],
  },
];

export default function AccessibilityStatement() {
  useEffect(() => {
    document.title = 'הצהרת נגישות | אוצר הקדושה';
  }, []);

  return (
    <div className="min-h-screen bg-cream" dir="rtl">
      <div className="bg-walnut px-4 py-12 text-center">
        <h1 className="font-heading text-3xl font-bold text-cream md:text-4xl">הצהרת נגישות</h1>
        <p className="mt-3 font-body text-sm text-cream/70">הצהרת הנגישות עודכנה בתאריך: 28/06/2026</p>
        <div className="mx-auto mt-4 h-0.5 w-16 bg-gold" />
      </div>

      <div className="mx-auto max-w-4xl px-4 py-12">
        <article className="rounded-xl border border-gold/10 bg-white p-6 shadow-sm md:p-10">
          <div className="space-y-4 font-body text-base leading-8 text-foreground">
            <p>
              אוצר הקדושה – הכל לבית היהודי, הינה חנות מקוונת למכירת ספרי קודש, ספרי הלכה,
              גמרות, חסידות, ספרי ילדים ונוער ומוצרים נלווים לבית היהודי.
            </p>
            <p>
              אנו פועלים רבות על מנת להנגיש את אתר האינטרנט שלנו לכלל הציבור, ובפרט לאנשים עם
              מוגבלות, מתוך אמונה בשוויון, כבוד האדם, שירות איכותי ונגישות מלאה ככל האפשר.
            </p>
          </div>

          <div className="mt-10 space-y-10">
            {sections.map((section) => (
              <section key={section.title} className="border-t border-gold/10 pt-8">
                <h2 className="font-heading text-2xl font-bold text-walnut">{section.title}</h2>
                <div className="mt-4 space-y-3 font-body text-base leading-8 text-foreground">
                  {section.body.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                  {section.list && (
                    <ul className="list-disc space-y-2 pr-6">
                      {section.list.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  )}
                  {section.footer && <p>{section.footer}</p>}
                </div>
              </section>
            ))}
          </div>

          <section className="mt-10 border-t border-gold/10 pt-8">
            <h2 className="font-heading text-2xl font-bold text-walnut">דרכי פנייה בנושא נגישות</h2>
            <div className="mt-4 space-y-3 font-body text-base leading-8 text-foreground">
              <p>
                במידה ונתקלתם בבעיה בנושא נגישות באתר, או שיש לכם הערה, בקשה או הצעה לשיפור,
                נשמח לקבל את פנייתכם ולטפל בה בהקדם האפשרי.
              </p>
              <h3 className="pt-2 font-heading text-xl font-bold text-walnut">רכז נגישות</h3>
              <p>שם: שניאור דהן</p>
              <p>טלפון: +972 54-802-9242</p>
              <p>דוא״ל: יש להוסיף דוא״ל ייעודי לפניות נגישות</p>
              <p className="pt-4">
                אנו עושים מאמצים רבים על מנת לאפשר לכלל הציבור ליהנות מחוויית שימוש נגישה,
                מכבדת ונוחה באתר אוצר הקדושה.
              </p>
            </div>
          </section>
        </article>
      </div>
    </div>
  );
}
