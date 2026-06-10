import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { BookOpen, MessageCircle, Truck, ShieldCheck, Users, Star, Tag } from 'lucide-react';
import { buildWhatsappUrl, useSiteSettings } from '@/hooks/useSiteSettings';
import { STORE_LOGO_URL } from '@/lib/branding';

const HERO_IMAGE = 'https://media.base44.com/images/public/6a16fe7abf75ec5b5710e703/f511806de_generated_bffda8a3.png';

const TRUST_BADGE_ICONS = [Truck, BookOpen, ShieldCheck, Users, Tag];

export default function HeroSection() {
  const { settings } = useSiteSettings();
  const trustBadges = TRUST_BADGE_ICONS.map((Icon, index) => {
    const position = index + 1;
    return {
      icon: Icon,
      label: settings[`trust_badge_${position}_title`],
      sub: settings[`trust_badge_${position}_subtitle`],
    };
  }).filter((badge) => badge.label);

  return (
    <>
      <section className="relative min-h-[88vh] flex items-center overflow-hidden" aria-label="ברוכים הבאים לאוצר הקדושה">
        {/* Background */}
        <div className="absolute inset-0">
          <img src={HERO_IMAGE} alt="" role="presentation" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-l from-[#1a0e05]/96 via-[#2A160B]/80 to-[#1a0e05]/55" />
          <div className="absolute inset-0 bg-[#1a0e05]/35 md:hidden" />
          {/* Subtle gold vignette bottom */}
          <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#1a0e05]/80 to-transparent" />
        </div>

        {/* Decorative gold lines */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold/40 to-transparent" />

        {/* Content */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 md:px-8 w-full py-20">
          <div className="grid items-center gap-12 md:grid-cols-[1fr_1.1fr]" dir="ltr">
            
            {/* Logo side */}
            <div className="hidden justify-self-center md:flex flex-col items-center gap-6">
              <motion.div
                initial={{ opacity: 0, scale: 0.88 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 1, ease: 'easeOut', delay: 0.1 }}
                className="relative"
              >
                {/* Glow ring behind logo */}
                <div className="absolute inset-0 rounded-full bg-gold/10 blur-3xl scale-125" />
                <img
                  src={STORE_LOGO_URL}
                  alt={`לוגו ${settings.store_name || 'אוצר הקדושה'}`}
                  className="pointer-events-none relative z-10 h-[260px] lg:h-[290px] xl:h-[310px] w-auto object-contain drop-shadow-2xl"
                />
              </motion.div>
            </div>

            {/* Text side */}
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.9, ease: 'easeOut', delay: 0.15 }}
              className="text-center md:text-right"
              dir="rtl"
            >
              {/* Overline */}
              <div className="flex items-center justify-center md:justify-start gap-3 mb-5">
                <div className="h-px flex-1 bg-gradient-to-l from-gold/50 to-transparent max-w-[80px]" />
                <span className="text-gold font-body text-xs tracking-[0.25em] uppercase">{settings.hero_overline}</span>
              </div>

              {/* Heading */}
              <h1 className="font-heading font-bold leading-tight text-cream mb-5 max-w-full overflow-visible">
                <span
                  className="block text-4xl sm:text-5xl md:text-6xl lg:text-7xl"
                  style={{ textShadow: '0 3px 24px rgba(0,0,0,0.85)' }}
                >
                  {settings.hero_title_first}
                </span>
                <span className="block text-5xl sm:text-6xl md:text-7xl lg:text-8xl text-gold" style={{ textShadow: '0 3px 28px rgba(0,0,0,0.75), 0 0 40px rgba(212,175,55,0.25)' }}>
                  {settings.hero_title_second}
                </span>
              </h1>

              <p className="font-body text-base md:text-xl text-cream/75 mb-10 leading-relaxed max-w-md mx-auto md:mx-0">
                {settings.hero_subtitle}
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-wrap justify-center md:justify-start gap-4">
                <Link to="/catalog">
                  <Button
                    className="font-body text-base px-8 py-6 rounded-lg transition-all duration-300 shadow-lg"
                    style={{ background: 'linear-gradient(135deg, #D4AF37 0%, #C99722 50%, #D4AF37 100%)', color: '#1F1008', backgroundSize: '200% auto' }}
                    onMouseEnter={e => e.currentTarget.style.backgroundPosition = 'right center'}
                    onMouseLeave={e => e.currentTarget.style.backgroundPosition = 'left center'}
                  >
                    <BookOpen className="h-5 w-5 ml-2" />
                    {settings.hero_primary_cta}
                  </Button>
                </Link>
                <Link to="/catalog?sale=true">
                  <Button
                    variant="outline"
                    className="border-gold/60 text-gold hover:bg-gold/10 hover:border-gold font-body text-base px-8 py-6 rounded-lg transition-all duration-300"
                  >
                    <Tag className="h-5 w-5 ml-2" />
                    {settings.hero_secondary_cta}
                  </Button>
                </Link>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 2.5 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10"
          aria-hidden="true"
        >
          <div className="w-6 h-10 border-2 border-gold/30 rounded-full flex justify-center pt-2">
            <div className="w-1 h-3 bg-gold/50 rounded-full" />
          </div>
        </motion.div>
      </section>

      {/* Trust Badges Bar */}
      <div className="bg-[#F8F3E8] border-y border-[#E7D8B8]">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-5 divide-x divide-x-reverse divide-[#E7D8B8]">
            {trustBadges.map(({ icon: Icon, label, sub }) => (
              <div key={label} className="flex items-center gap-3 py-4 px-4 md:px-6 justify-center md:justify-start">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gold/10 flex items-center justify-center">
                  <Icon className="h-5 w-5 text-gold" aria-hidden="true" />
                </div>
                <div>
                  <p className="font-body font-semibold text-[#1F160F] text-sm leading-tight">{label}</p>
                  <p className="font-body text-[#6B5A45] text-xs mt-0.5">{sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
