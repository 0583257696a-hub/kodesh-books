import React, { useEffect } from 'react';

const sections = [
  {
    title: 'משלוחים',
    paragraphs: [
      'אוצר הקדושה פועל לספק את ההזמנות במהירות האפשרית.',
      'זמני האספקה משתנים בהתאם לאזור המגורים ולשיטת המשלוח שנבחרה.',
      'החנות אינה אחראית לעיכובים הנובעים מחברת השילוח או מגורמים שאינם בשליטתה.',
    ],
  },
  {
    title: 'בדיקת המוצר',
    paragraphs: [
      'עם קבלת המשלוח יש לבדוק את תקינות המוצר ואת התאמתו להזמנה.',
      'במקרה של פגם או טעות יש ליצור קשר בהקדם האפשרי.',
    ],
  },
  {
    title: 'ביטול עסקה',
    paragraphs: [
      'ביטול עסקה יתבצע בהתאם להוראות חוק הגנת הצרכן.',
      'בקשה לביטול יש לשלוח באמצעות פרטי הקשר של החנות.',
    ],
  },
  {
    title: 'החזרת מוצרים',
    paragraphs: [
      'ניתן להחזיר מוצרים חדשים שלא נעשה בהם שימוש, באריזתם המקורית ובכפוף להוראות הדין.',
      'החזר כספי יבוצע בהתאם להוראות החוק ולאחר בדיקת המוצר.',
    ],
  },
  {
    title: 'מוצר פגום או טעות באספקה',
    paragraphs: [
      'במקרה של מוצר פגום או טעות באספקה, החנות תפעל להחלפת המוצר או להשבת התמורה בהתאם לדין.',
    ],
  },
  {
    title: 'יצירת קשר',
    paragraphs: ['שניאור דהן', 'טלפון: 054-802-9242', 'דוא"ל: [יש להשלים]'],
  },
];

export default function ShippingReturns() {
  useEffect(() => {
    document.title = 'משלוחים, החזרות וביטולים | אוצר הקדושה';
  }, []);

  return (
    <div className="min-h-screen bg-cream" dir="rtl">
      <div className="bg-walnut px-4 py-12 text-center">
        <h1 className="font-heading text-3xl font-bold text-cream md:text-4xl">מדיניות משלוחים, החזרות וביטולים</h1>
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
            <div className="space-y-10">
              {sections.map((section) => (
                <section key={section.title} id={section.title} className="scroll-mt-28 border-t border-gold/10 pt-8 first:border-t-0 first:pt-0">
                  <h2 className="font-heading text-2xl font-bold text-walnut">{section.title}</h2>
                  <div className="mt-4 space-y-3 font-body text-base leading-8 text-foreground">
                    {section.paragraphs.map((paragraph) => (
                      <p key={paragraph}>{paragraph}</p>
                    ))}
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
