import React from 'react';
import { Link } from 'react-router-dom';
import { Phone, Mail, Clock, MessageCircle, Instagram, Facebook } from 'lucide-react';
import { useSiteSettings } from '@/hooks/useSiteSettings';

export default function Footer() {
  const { settings } = useSiteSettings();
  const socialLinks = [
    { key: 'facebook', label: 'פייסבוק', href: settings.facebook, icon: Facebook },
    { key: 'instagram', label: 'אינסטגרם', href: settings.instagram, icon: Instagram },
  ].filter((item) => item.href);

  return (
    <footer className="bg-walnut text-cream">
      {/* Main footer */}
      <div className="max-w-7xl mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          {/* Logo & About */}
          <div className="space-y-4">
            <img 
              src="https://media.base44.com/images/public/6a16fe7abf75ec5b5710e703/2fdbeca5e_WhatsAppImage2026-05-29at170557.jpeg" 
              alt={settings.store_name} 
              className="h-12 object-contain"
            />
            <p className="text-cream/70 text-sm font-body leading-relaxed">
              {settings.seo_description}
            </p>
            {socialLinks.length > 0 && (
              <div className="flex items-center gap-3">
                {socialLinks.map((item) => (
                  <a key={item.key} href={item.href} target="_blank" rel="noreferrer" aria-label={item.label} className="text-cream/70 transition-colors hover:text-gold">
                    <item.icon className="h-5 w-5" />
                  </a>
                ))}
              </div>
            )}
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
                <span>{settings.phone}</span>
              </li>
              <li className="flex items-center gap-3 text-cream/70">
                <MessageCircle className="h-4 w-4 text-gold" />
                <span>{settings.whatsapp}</span>
              </li>
              <li className="flex items-center gap-3 text-cream/70">
                <Mail className="h-4 w-4 text-gold" />
                <span>{settings.email}</span>
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
          <p className="text-cream/50 text-xs font-body">© {new Date().getFullYear()} {settings.store_name}. כל הזכויות שמורות.</p>
          <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-cream/50 font-body md:justify-start">
            <Link to="/terms" className="transition-colors hover:text-gold">תקנון ותנאי שימוש</Link>
            <span className="text-gold">•</span>
            <Link to="/privacy" className="transition-colors hover:text-gold">מדיניות פרטיות</Link>
            <span className="text-gold">•</span>
            <Link to="/shipping-returns" className="transition-colors hover:text-gold">משלוחים והחזרות</Link>
            <span className="text-gold">•</span>
            <Link to="/accessibility" className="transition-colors hover:text-gold">הצהרת נגישות</Link>
            <span className="text-gold">•</span>
            <Link to="/contact" className="transition-colors hover:text-gold">צור קשר</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
