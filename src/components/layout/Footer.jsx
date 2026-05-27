import React from 'react';
import { Link } from 'react-router-dom';
import { Phone, Mail, Clock, MessageCircle } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-walnut text-cream">
      {/* Main footer */}
      <div className="max-w-7xl mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          {/* Logo & About */}
          <div className="space-y-4">
            <h3 className="font-heading text-2xl font-bold text-gold">אוצר הקדושה</h3>
            <p className="text-cream/70 text-sm font-body leading-relaxed">
              החנות המובילה לספרי קודש, תשמישי קדושה ומתנות יהודיות. מגוון רחב של ספרים מכל סוגי הקטגוריות במחירים משתלמים.
            </p>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h4 className="font-heading text-lg font-bold text-gold">קישורים מהירים</h4>
            <ul className="space-y-2 font-body text-sm">
              {['ראשי', 'ספרי קודש', 'גמרות', 'הלכה', 'חסידות', 'מבצעים'].map(item => (
                <li key={item}>
                  <Link to={item === 'ראשי' ? '/' : '/catalog'} className="text-cream/70 hover:text-gold transition-colors">
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div className="space-y-4">
            <h4 className="font-heading text-lg font-bold text-gold">צור קשר</h4>
            <ul className="space-y-3 font-body text-sm">
              <li className="flex items-center gap-3 text-cream/70">
                <Phone className="h-4 w-4 text-gold" />
                <span>03-123-4567</span>
              </li>
              <li className="flex items-center gap-3 text-cream/70">
                <MessageCircle className="h-4 w-4 text-gold" />
                <span>050-123-4567</span>
              </li>
              <li className="flex items-center gap-3 text-cream/70">
                <Mail className="h-4 w-4 text-gold" />
                <span>info@otzar-hakodesh.co.il</span>
              </li>
            </ul>
          </div>

          {/* Hours */}
          <div className="space-y-4">
            <h4 className="font-heading text-lg font-bold text-gold">שעות פעילות</h4>
            <ul className="space-y-2 font-body text-sm text-cream/70">
              <li className="flex items-center gap-3">
                <Clock className="h-4 w-4 text-gold" />
                <span>ראשון – חמישי: 09:00 – 20:00</span>
              </li>
              <li className="flex items-center gap-3">
                <Clock className="h-4 w-4 text-gold" />
                <span>יום שישי: 09:00 – 13:00</span>
              </li>
              <li className="flex items-center gap-3">
                <Clock className="h-4 w-4 text-gold" />
                <span>מוצ"ש: 20:00 – 23:00</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-gold/20 py-6">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-cream/50 text-xs font-body">© {new Date().getFullYear()} אוצר הקדושה. כל הזכויות שמורות.</p>
          <div className="flex items-center gap-2 text-xs text-cream/50 font-body">
            <span>תנאי שימוש</span>
            <span className="text-gold">•</span>
            <span>מדיניות פרטיות</span>
            <span className="text-gold">•</span>
            <span>מדיניות משלוחים</span>
          </div>
        </div>
      </div>
    </footer>
  );
}