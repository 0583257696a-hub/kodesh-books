import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { BookOpen, MessageCircle } from 'lucide-react';
import { buildWhatsappUrl, useSiteSettings } from '@/hooks/useSiteSettings';
import { STORE_LOGO_URL } from '@/lib/branding';

const HERO_IMAGE = 'https://media.base44.com/images/public/6a16fe7abf75ec5b5710e703/f511806de_generated_bffda8a3.png';

export default function HeroSection() {
  const { settings } = useSiteSettings();

  return (
    <section className="relative min-h-[85vh] flex items-center overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        <img src={HERO_IMAGE} alt="ספריית ספרי קודש של אוצר הקדושה" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-l from-walnut/90 via-walnut/70 to-walnut/40" />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 w-full py-20">
        <div className="grid items-start gap-10 md:grid-cols-[minmax(0,1fr)_minmax(260px,430px)]" dir="ltr">
          <div className="hidden justify-self-center md:block">
            <motion.img
              src={STORE_LOGO_URL}
              alt={`לוגו ${settings.store_name || 'אוצר הקדושה'}`}
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, ease: 'easeOut', delay: 0.12 }}
              className="pointer-events-none h-[250px] w-auto object-contain object-center drop-shadow-2xl lg:h-[270px] xl:h-[285px]"
            />
          </div>
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="max-w-xl justify-self-end text-right"
            dir="rtl"
          >
            {/* Decorative line */}
            <div className="flex items-center gap-3 mb-6">
              <div className="h-px flex-1 bg-gold/40" />
              <span className="text-gold text-sm font-body tracking-widest">ברוכים הבאים</span>
            </div>

            <h1 className="font-heading text-5xl md:text-7xl font-bold text-cream leading-tight mb-4">
              אוצר <span className="text-gold">הקדושה</span>
            </h1>

            <p className="font-body text-lg md:text-xl text-cream/80 mb-8 leading-relaxed">
              ספרי קודש <span className="text-gold">•</span> תשמישי קדושה <span className="text-gold">•</span> הכל לבית היהודי
            </p>

            <div className="flex flex-wrap gap-4">
              <Link to="/catalog">
                <Button className="bg-gold text-walnut hover:bg-gold/90 font-body text-base px-8 py-6 rounded-lg gold-glow gold-glow-hover transition-all">
                  <BookOpen className="h-5 w-5 ml-2" />
                  לקטלוג הספרים
                </Button>
              </Link>
              <a href={buildWhatsappUrl(settings.whatsapp, 'שלום, אני רוצה לבצע הזמנה מאתר אוצר הקדושה')} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" className="border-gold/50 text-gold hover:bg-gold/10 font-body text-base px-8 py-6 rounded-lg transition-all">
                  <MessageCircle className="h-5 w-5 ml-2" />
                  וואצאפ להזמנות
                </Button>
              </a>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        animate={{ y: [0, 8, 0] }}
        transition={{ repeat: Infinity, duration: 2 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
      >
        <div className="w-6 h-10 border-2 border-gold/40 rounded-full flex justify-center pt-2">
          <div className="w-1.5 h-3 bg-gold/60 rounded-full" />
        </div>
      </motion.div>
    </section>
  );
}
