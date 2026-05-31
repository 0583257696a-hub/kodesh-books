import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const STORAGE_KEY = 'otzar_cookie_consent';

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(!window.localStorage.getItem(STORAGE_KEY));
  }, []);

  const saveChoice = (choice) => {
    window.localStorage.setItem(STORAGE_KEY, choice);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <section
      className="fixed inset-x-3 bottom-3 z-[120] mx-auto max-w-4xl rounded-xl border border-gold/20 bg-white p-4 text-right shadow-2xl md:bottom-5 md:p-5"
      dir="rtl"
      role="dialog"
      aria-live="polite"
      aria-label="באנר עוגיות"
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <h2 className="font-heading text-lg font-bold text-walnut">שימוש בעוגיות</h2>
          <p className="font-body text-sm leading-6 text-slate-700">
            האתר משתמש בקבצי Cookies לצורך תפעול תקין, אבטחה, סטטיסטיקות ושיפור חוויית המשתמש.
            ניתן לקרוא עוד ב<Link to="/privacy" className="mx-1 font-semibold text-gold underline">מדיניות הפרטיות</Link>.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button type="button" variant="outline" onClick={() => saveChoice('declined')} className="border-gold/30 text-walnut hover:bg-gold/10">
            דחה
          </Button>
          <Button type="button" onClick={() => saveChoice('accepted')} className="bg-gold text-walnut hover:bg-gold/90">
            אישור
          </Button>
        </div>
      </div>
    </section>
  );
}
