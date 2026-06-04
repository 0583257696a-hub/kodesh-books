import React from 'react';
import { Link } from 'react-router-dom';
import { Phone, Mail, Clock, MessageCircle, Instagram, Facebook } from 'lucide-react';
import { buildMailUrl, buildPhoneUrl, buildWhatsappUrl, useSiteSettings } from '@/hooks/useSiteSettings';
import { STORE_LOGO_URL } from '@/lib/branding';

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
              src={STORE_LOGO_URL}
              alt={settings.store_name} 
              className="h-24 w-auto object-contain mix-blend-multiply contrast-125 saturate-110"
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
              {[
                { label: 'ראשי', path: '/' },
                { label: 'ספרי קודש', path: '/catalog' },
                { label: 'גמרות ומשניות', path: '/catalog?category=gemarot' },
                { label: 'הלכה', path: '/catalog?category=halacha' },
                { label: 'חסידות וקבלה', path: '/catalog?category=chassidut' },
                { label: 'מבצעים', path: '/catalog?sale=true' },
              ].map(item => (
                <li key={item.label}>
                  <Link to={item.path} className="text-cream/70 hover:text-gold transition-colors">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div className="space-y-4">
            <h4 className="font-heading text-lg font-bold text-gold">צור קשר</h4>
            <ul className="space-y-3 font-body text-sm">
              <li>
                <a href={buildPhoneUrl(settings.phone)} className="flex items-center gap-3 text-cream/70 transition-colors hover:text-gold" aria-label={`התקשר אל ${settings.phone}`}>
                  <Phone className="h-4 w-4 text-gold" />
                  <span>{settings.phone}</span>
                </a>
              </li>
              <li>
                <a href={buildWhatsappUrl(settings.whatsapp, 'שלום, אשמח לקבל שירות מאתר אוצר הקדושה')} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-cream/70 transition-colors hover:text-gold" aria-label={`פתח וואטסאפ אל ${settings.whatsapp}`}>
                  <MessageCircle className="h-4 w-4 text-gold" />
                  <span>{settings.whatsapp}</span>
                </a>
              </li>
              <li>
                <a href={buildMailUrl(settings.email, 'פנייה מאתר אוצר הקדושה')} className="flex items-center gap-3 text-cream/70 transition-colors hover:text-gold" aria-label={`שלח מייל אל ${settings.email}`}>
                  <Mail className="h-4 w-4 text-gold" />
                  <span>{settings.email}</span>
                </a>
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
