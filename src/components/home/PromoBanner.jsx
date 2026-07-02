import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Tag, Sparkles } from 'lucide-react';
import { DEFAULT_BANNER_PLACEMENT } from '@/lib/bannerPlacements';
import { normalizeBooleanValue, useSiteSettings } from '@/hooks/useSiteSettings';

const PROMO_IMAGE = '/assets/static/home-promo.png';

function parseBannerEntry([key, value]) {
  try {
    const parsed = JSON.parse(value);
    const targetUrl = parsed.target_url || parsed.link_url || parsed.cta_url || '';
    return {
      id: key,
      placement: parsed.placement || DEFAULT_BANNER_PLACEMENT,
      title: parsed.title || '',
      subtitle: parsed.subtitle || '',
      cta_text: parsed.cta_text || 'לכל המבצעים',
      cta_url: parsed.cta_url || targetUrl || '/catalog?sale=true',
      target_url: targetUrl,
      image_url: parsed.image_url || '',
      badge_text: parsed.badge_text || 'מבצע מיוחד • זמן מוגבל',
      is_active: parsed.is_active !== false,
    };
  } catch {
    return null;
  }
}

function BannerButton({ banner }) {
  const ctaUrl = banner.cta_url || '/catalog?sale=true';
  const content = (
    <>
      <Tag className="h-4 w-4 ml-2" aria-hidden="true" />
      {banner.cta_text || 'לכל המבצעים'}
    </>
  );

  return (
    <Button
      asChild
      className="font-body text-base px-8 py-5 rounded-lg shadow-lg transition-all duration-300"
      style={{ background: 'linear-gradient(135deg, #D4AF37 0%, #C99722 50%, #D4AF37 100%)', color: '#1F1008' }}
    >
      {/^https?:\/\//i.test(ctaUrl) ? (
        <a href={ctaUrl} target="_blank" rel="noopener noreferrer">{content}</a>
      ) : (
        <Link to={ctaUrl}>{content}</Link>
      )}
    </Button>
  );
}

function BannerImageLink({ banner }) {
  const ctaUrl = banner.target_url || banner.cta_url || '';
  const label = banner.title || banner.cta_text || 'באנר פרסומי';
  const image = (
    <img
      src={banner.image_url}
      alt={label}
      className="block h-auto w-full object-contain"
    />
  );

  if (!ctaUrl) return image;

  return /^https?:\/\//i.test(ctaUrl) ? (
    <a href={ctaUrl} target="_blank" rel="noopener noreferrer" aria-label={label}>
      {image}
    </a>
  ) : (
    <Link to={ctaUrl} aria-label={label}>
      {image}
    </Link>
  );
}

function PromoBannerCard({ banner, index = 0, showDefaultDiscount = false }) {
  if (banner.image_url && !banner.isDefault) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, delay: Math.min(index * 0.08, 0.2) }}
        className="relative overflow-hidden rounded-2xl border border-gold/20 bg-[#1a0e05] shadow-xl"
      >
        <BannerImageLink banner={banner} />
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay: Math.min(index * 0.08, 0.2) }}
      className="relative rounded-2xl overflow-hidden min-h-[320px] md:min-h-[340px] flex items-center border border-gold/20 shadow-xl"
    >
      <img
        src={banner.image_url || PROMO_IMAGE}
        alt={banner.title || 'מבצעי החודש על ספרי קודש'}
        className="absolute inset-0 w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-[#1a0e05]/[0.62] md:bg-transparent" aria-hidden="true" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#1a0e05]/[0.97] via-[#2A160B]/[0.86] to-[#1a0e05]/[0.40]" aria-hidden="true" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold/50 to-transparent" aria-hidden="true" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold/50 to-transparent" aria-hidden="true" />

      <div className="relative z-10 w-full p-6 sm:p-8 md:p-14">
        <div className="max-w-lg mx-auto md:mr-auto md:ml-0 text-center md:text-right">
          {banner.badge_text && (
            <div className="inline-flex items-center gap-2 bg-gold/20 backdrop-blur-sm border border-gold/30 px-4 py-2 rounded-full mb-5 md:mb-6">
              <Sparkles className="h-3.5 w-3.5 text-gold" aria-hidden="true" />
              <span className="text-gold font-body text-xs font-medium tracking-wide">{banner.badge_text}</span>
            </div>
          )}

          <div className="flex flex-col-reverse items-center gap-4 mb-5 sm:flex-row sm:items-start sm:justify-center md:justify-start md:gap-5">
            <div className="text-center md:text-right">
              <h2 className="font-heading text-3xl md:text-5xl font-bold text-cream leading-tight">
                {banner.title || (
                  <>
                    מבצעי <span className="text-gold">החודש</span><br />המיוחדים
                  </>
                )}
              </h2>
            </div>
            {showDefaultDiscount && (
              <div className="flex-shrink-0 w-20 h-20 rounded-full border-2 border-gold/60 bg-gold/15 backdrop-blur-sm flex flex-col items-center justify-center mt-1">
                <span className="text-gold font-heading font-bold text-lg leading-none">40%</span>
                <span className="text-cream/80 font-body text-xs mt-0.5">הנחה</span>
              </div>
            )}
          </div>

          <p className="font-body text-cream/70 mb-8 text-base md:text-lg leading-relaxed">
            {banner.subtitle || 'הנחות מיוחדות על מגוון רחב של ספרי קודש נבחרים. אל תפספסו!'}
          </p>

          <BannerButton banner={banner} />
        </div>
      </div>
    </motion.div>
  );
}

export default function PromoBanner({ placement = DEFAULT_BANNER_PLACEMENT }) {
  const { settings } = useSiteSettings();
  const banners = useMemo(() => Object.entries(settings)
    .filter(([key]) => key.startsWith('banner_'))
    .map(parseBannerEntry)
    .filter((banner) => banner && normalizeBooleanValue(banner.is_active) && banner.placement === placement), [placement, settings]);

  if (!banners.length && placement !== DEFAULT_BANNER_PLACEMENT) return null;

  const visibleBanners = banners.length
    ? banners
    : [{
      id: 'default-promo',
      placement,
      title: '',
      subtitle: '',
      cta_text: 'לכל המבצעים',
      cta_url: '/catalog?sale=true',
      target_url: '/catalog?sale=true',
      image_url: PROMO_IMAGE,
      badge_text: 'מבצע מיוחד • זמן מוגבל',
      is_active: true,
      isDefault: true,
    }];

  return (
    <section className="py-12 px-4 bg-[#F8F3E8]" dir="rtl">
      <div className="max-w-7xl mx-auto space-y-6">
        {visibleBanners.map((banner, index) => (
          <PromoBannerCard
            key={banner.id}
            banner={banner}
            index={index}
            showDefaultDiscount={banner.isDefault}
          />
        ))}
      </div>
    </section>
  );
}
