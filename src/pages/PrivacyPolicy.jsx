import React, { useEffect } from 'react';

const sections = [
  {
    title: '1. איסוף מידע',
    paragraphs: ['בעת שימוש באתר אנו עשויים לאסוף מידע כגון:'],
    list: [
      'שם מלא',
      'מספר טלפון',
      'כתובת דוא"ל',
      'כתובת למשלוח',
      'פרטי הזמנות',
      'מידע טכני על השימוש באתר',
    ],
  },
  {
    title: '2. מטרות השימוש במידע',
    paragraphs: ['המידע נאסף לצורך:'],
    list: [
      'טיפול בהזמנות',
      'אספקת מוצרים',
      'יצירת קשר עם לקוחות',
      'שיפור השירות',
      'טיפול בפניות',
      'שליחת עדכונים ומבצעים (בכפוף להסכמה)',
    ],
  },
  {
    title: '3. מסירת מידע לצדדים שלישיים',
    paragraphs: ['החנות לא תמכור או תעביר מידע אישי לצדדים שלישיים, למעט במקרים הבאים:'],
    list: [
      'לצורך משלוח ההזמנה',
      'לצורך סליקת תשלומים',
      'מכוח חובה חוקית',
      'בהתאם לצו שיפוטי',
    ],
  },
  {
    title: '4. אבטחת מידע',
    paragraphs: [
      'האתר עושה שימוש באמצעי אבטחה מקובלים לצורך הגנה על המידע.',
      'למרות המאמצים, אין אפשרות להבטיח חסינות מוחלטת מפני חדירה בלתי מורשית.',
    ],
  },
  {
    title: '5. דיוור שיווקי',
    paragraphs: [
      'ייתכן והמשתמש יקבל הודעות ועדכונים בהתאם להסכמתו.',
      'ניתן להסיר את ההרשמה בכל עת.',
    ],
  },
  {
    title: '6. Cookies',
    paragraphs: [
      'האתר עשוי להשתמש בקבצי Cookies לצורך תפעול שוטף, אבטחה, סטטיסטיקות ושיפור חוויית המשתמש.',
    ],
  },
  {
    title: '7. יצירת קשר',
    paragraphs: ['לשאלות בנושא פרטיות ניתן לפנות:', 'שניאור דהן', 'טלפון: 054-802-9242', 'דוא"ל: [יש להשלים]'],
  },
];

export default function PrivacyPolicy() {
  useEffect(() => {
    document.title = 'מדיניות פרטיות | אוצר הקדושה';
  }, []);

  return (
    <div className="min-h-screen bg-cream" dir="rtl">
      <div className="bg-walnut px-4 py-12 text-center">
        <h1 className="font-heading text-3xl font-bold text-cream md:text-4xl">מדיניות פרטיות</h1>
        <p className="mt-3 font-body text-sm text-cream/70">תאריך עדכון אחרון: 31/05/2026</p>
        <div className="mx-auto mt-4 h-0.5 w-16 bg-gold" />
      </div>

      <main className="mx-auto max-w-5xl px-4 py-12">
        <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
          <aside className="hidden lg:block">
            <nav className="sticky top-32 rounded-xl border border-gold/10 bg-white p-4 shadow-sm" aria-label="ניווט בעמוד">
              <h2 className="mb-3 font-heading text-lg font-bold text-walnut">תוכן העניינים</h2>
              <ul className="space-y-2 font-body text-sm">
                {sections.map((section) => (
                  <li key={section.title}>
                    <a href={`#${section.title}`} className="text-muted-foreground transition-colors hover:text-gold">
                      {section.title}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </aside>

          <article className="rounded-xl border border-gold/10 bg-white p-6 shadow-sm md:p-10 print:border-0 print:shadow-none">
            <div className="space-y-4 font-body text-base leading-8 text-foreground">
              <p>ברוכים הבאים לאתר "אוצר הקדושה – הכל לבית היהודי" (להלן: "האתר").</p>
              <p>אנו מכבדים את פרטיות המשתמשים באתר ופועלים בהתאם להוראות הדין לשמירה על המידע הנמסר לנו.</p>
            </div>

            <div className="mt-10 space-y-10">
              {sections.map((section) => (
                <section key={section.title} id={section.title} className="scroll-mt-28 border-t border-gold/10 pt-8">
                  <h2 className="font-heading text-2xl font-bold text-walnut">{section.title}</h2>
                  <div className="mt-4 space-y-3 font-body text-base leading-8 text-foreground">
                    {section.paragraphs.map((paragraph) => (
                      <p key={paragraph}>{paragraph}</p>
                    ))}
                    {section.list && (
                      <ul className="list-disc space-y-2 pr-6">
                        {section.list.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                </section>
              ))}
            </div>
          </article>
        </div>
      </main>
    </div>
  );
}
