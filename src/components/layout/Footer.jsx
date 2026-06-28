import React from 'react';
import { Link } from 'react-router-dom';
import { Phone, Mail, Clock, MessageCircle, Instagram, Facebook, ShieldCheck, CreditCard } from 'lucide-react';
import { buildMailUrl, buildPhoneUrl, buildWhatsappUrl, useSiteSettings } from '@/hooks/useSiteSettings';
import { useStoreCategories } from '@/hooks/useStoreCategories';
import { STORE_LOGO_URL } from '@/lib/branding';

export default function Footer() {
  const { settings } = useSiteSettings();
  const { categories } = useStoreCategories();
  const popularCategories = categories.filter((category) => category.show_in_nav).slice(0, 8);
  const socialLinks = [
    { key: 'facebook', label: 'פייסבוק', href: settings.facebook, icon: Facebook },
    { key: 'instagram', label: 'אינסטגרם', href: settings.instagram, icon: Instagram },
    { key: 'whatsapp', label: 'וואטסאפ', href: buildWhatsappUrl(settings.whatsapp, 'שלום, אשמח לקבל שירות'), icon: MessageCircle },
  ].filter((item) => item.href);

  return (
    <footer className="bg-[#1F1008] text-cream" dir="rtl">
      {/* Decorative top border */}
      <div className="h-px bg-gradient-to-r from-transparent via-gold/50 to-transparent" />

      {/* Main footer */}
      <div className="max-w-7xl mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-12">
          
          {/* Logo & About */}
          <div className="space-y-5 lg:col-span-1">
            <img
              src={STORE_LOGO_URL}
              alt={settings.store_name || 'אוצר הקדושה'}
              className="h-20 w-auto object-contain"
            />
            <p className="text-cream/60 text-sm font-body leading-relaxed">
              {settings.seo_description || 'חנות ספרי קודש ומוצרים לבית היהודי. מבחר עשיר, שירות אישי ומשלוחים מהירים.'}
            </p>
            {/* Social */}
            {socialLinks.length > 0 && (
              <div className="flex items-center gap-3 pt-1">
                {socialLinks.map((item) => (
                  <a
                    key={item.key}
                    href={item.href}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={item.label}
                    className="w-9 h-9 rounded-full border border-gold/20 bg-gold/5 flex items-center justify-center text-cream/60 hover:text-gold hover:border-gold/50 hover:bg-gold/10 transition-all duration-200"
                  >
                    <item.icon className="h-4 w-4" aria-hidden="true" />
                  </a>
                ))}
              </div>
            )}
            {/* Security */}
            <div className="flex items-center gap-2 text-cream/40 text-xs font-body pt-1">
              <ShieldCheck className="h-3.5 w-3.5 text-gold/50" aria-hidden="true" />
              <span>אתר מאובטח SSL</span>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h4 className="font-heading text-base font-bold text-gold border-b border-gold/15 pb-3">קישורים מהירים</h4>
            <ul className="space-y-2.5 font-body text-sm">
              {[
                { label: 'ראשי', path: '/' },
                { label: 'כל הספרים', path: '/catalog' },
                { label: 'מבצעים חמים', path: '/catalog?sale=true' },
                { label: 'מוצרים חדשים', path: '/catalog?new=true' },
                { label: 'צור קשר', path: '/contact' },
              ].map(item => (
                <li key={item.label}>
                  <Link to={item.path} className="text-cream/60 hover:text-gold transition-colors duration-200 flex items-center gap-2 group">
                    <span className="w-1 h-1 rounded-full bg-gold/30 group-hover:bg-gold transition-colors" aria-hidden="true" />
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div className="space-y-4">
            <h4 className="font-heading text-base font-bold text-gold border-b border-gold/15 pb-3">צור קשר</h4>
            <ul className="space-y-3.5 font-body text-sm">
              {settings.phone && (
                <li>
                  <a href={buildPhoneUrl(settings.phone)} className="flex items-center gap-3 text-cream/60 hover:text-gold transition-colors" aria-label={`התקשר: ${settings.phone}`}>
                    <Phone className="h-4 w-4 text-gold/60 flex-shrink-0" aria-hidden="true" />
                    <span>{settings.phone}</span>
                  </a>
                </li>
              )}
              {settings.whatsapp && (
                <li>
                  <a href={buildWhatsappUrl(settings.whatsapp, 'שלום, אשמח לקבל שירות מאתר אוצר הקדושה')} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-cream/60 hover:text-gold transition-colors" aria-label={`וואטסאפ: ${settings.whatsapp}`}>
                    <MessageCircle className="h-4 w-4 text-gold/60 flex-shrink-0" aria-hidden="true" />
                    <span>{settings.whatsapp}</span>
                  </a>
                </li>
              )}
              {settings.email && (
                <li>
                  <a href={buildMailUrl(settings.email, 'פנייה מאתר אוצר הקדושה')} className="flex items-center gap-3 text-cream/60 hover:text-gold transition-colors" aria-label={`מייל: ${settings.email}`}>
                    <Mail className="h-4 w-4 text-gold/60 flex-shrink-0" aria-hidden="true" />
                    <span className="break-all">{settings.email}</span>
                  </a>
                </li>
              )}
            </ul>
          </div>

          {/* Hours & Categories */}
          <div className="space-y-4">
            <h4 className="font-heading text-base font-bold text-gold border-b border-gold/15 pb-3">שעות פעילות</h4>
            <ul className="space-y-2.5 font-body text-sm text-cream/60">
              <li className="flex items-start gap-3">
                <Clock className="h-4 w-4 text-gold/60 mt-0.5 flex-shrink-0" aria-hidden="true" />
                <span>ראשון – חמישי: 09:00 – 20:00</span>
              </li>
              <li className="flex items-start gap-3">
                <Clock className="h-4 w-4 text-gold/60 mt-0.5 flex-shrink-0" aria-hidden="true" />
                <span>יום שישי: 09:00 – 13:00</span>
              </li>
              <li className="flex items-start gap-3">
                <Clock className="h-4 w-4 text-gold/60 mt-0.5 flex-shrink-0" aria-hidden="true" />
                <span>מוצ&quot;ש: 20:00 – 23:00</span>
              </li>
            </ul>

            {/* Popular categories */}
            <div className="pt-2">
              <h5 className="font-body text-xs text-gold/60 tracking-wide mb-2.5">קטגוריות פופולריות</h5>
              <div className="flex flex-wrap gap-1.5">
                {popularCategories.map(cat => (
                  <Link
                    key={cat.slug}
                    to={`/catalog?category=${cat.slug}`}
                    className="text-xs font-body text-cream/50 hover:text-gold px-2 py-0.5 rounded border border-cream/10 hover:border-gold/30 transition-all duration-200"
                    aria-label={`מעבר לקטגוריה ${cat.name}`}
                  >
                    {cat.name}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Payment icons */}
      <div className="border-t border-gold/10 py-5">
        <div className="max-w-7xl mx-auto px-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-cream/30 text-xs font-body">
            <CreditCard className="h-4 w-4 text-gold/30" aria-hidden="true" />
            <span>אמצעי תשלום: ויזה, מסטרקארד, PayPal, ביט</span>
          </div>
          <div className="flex items-center gap-2 text-cream/30 text-xs font-body">
            <ShieldCheck className="h-3.5 w-3.5 text-gold/30" aria-hidden="true" />
            <span>תשלום מאובטח ומוצפן</span>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-gold/10 py-5">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="text-center font-body text-xs text-cream/35 md:text-right">
            <p>© {new Date().getFullYear()} {settings.store_name || 'אוצר הקדושה'}. כל הזכויות שמורות.</p>
            <a
              href="https://abd-digital.website/"
              target="_blank"
              rel="noopener noreferrer"
              className="relative z-20 mt-1 inline-flex min-h-8 items-center rounded-md px-2 py-1 transition-colors hover:text-gold/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50"
              style={{ touchAction: 'manipulation' }}
              aria-label="עוצב ונבנה על ידי ABD Digital - פתיחת האתר"
            >
              עוצב ונבנה על ידי ABD Digital
            </a>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-cream/35 font-body">
            <Link to="/terms" className="hover:text-gold/60 transition-colors">תקנון ותנאי שימוש</Link>
            <span className="text-gold/20">|</span>
            <Link to="/privacy" className="hover:text-gold/60 transition-colors">מדיניות פרטיות</Link>
            <span className="text-gold/20">|</span>
            <Link to="/shipping-returns" className="hover:text-gold/60 transition-colors">משלוחים והחזרות</Link>
            <span className="text-gold/20">|</span>
            <Link to="/accessibility" className="hover:text-gold/60 transition-colors">הצהרת נגישות</Link>
            <span className="text-gold/20">|</span>
            <Link to="/contact" className="hover:text-gold/60 transition-colors">צור קשר</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
