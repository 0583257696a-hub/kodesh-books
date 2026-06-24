import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Tag, Sparkles } from 'lucide-react';

const PROMO_IMAGE = '/assets/static/home-promo.png';

export default function PromoBanner() {
  return (
    <section className="py-12 px-4 bg-[#F8F3E8]">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="relative rounded-2xl overflow-hidden min-h-[300px] md:min-h-[340px] flex items-center border border-gold/20 shadow-xl"
        >
          {/* Background */}
          <img
            src={PROMO_IMAGE}
            alt="מבצעי החודש על ספרי קודש"
            className="absolute inset-0 w-full h-full object-cover"
          />
          {/* Multi-stop gradient for better readability */}
          <div className="absolute inset-0 bg-gradient-to-l from-[#1a0e05]/97 via-[#2A160B]/85 to-[#1a0e05]/40" />
          {/* Top gold line */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold/50 to-transparent" />
          {/* Bottom gold line */}
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold/50 to-transparent" />

          {/* Content */}
          <div className="relative z-10 w-full p-8 md:p-14">
            <div className="max-w-lg mr-auto ml-0 text-right">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 bg-gold/20 backdrop-blur-sm border border-gold/30 px-4 py-2 rounded-full mb-6">
                <Sparkles className="h-3.5 w-3.5 text-gold" aria-hidden="true" />
                <span className="text-gold font-body text-xs font-medium tracking-wide">מבצע מיוחד • זמן מוגבל</span>
              </div>

              {/* Discount badge */}
              <div className="flex items-start gap-5 mb-5">
                <div className="text-right">
                  <h2 className="font-heading text-3xl md:text-5xl font-bold text-cream leading-tight">
                    מבצעי <span className="text-gold">החודש</span><br />המיוחדים
                  </h2>
                </div>
                <div className="flex-shrink-0 w-20 h-20 rounded-full border-2 border-gold/60 bg-gold/15 backdrop-blur-sm flex flex-col items-center justify-center mt-1">
                  <span className="text-gold font-heading font-bold text-lg leading-none">40%</span>
                  <span className="text-cream/80 font-body text-xs mt-0.5">הנחה</span>
                </div>
              </div>

              <p className="font-body text-cream/70 mb-8 text-base md:text-lg leading-relaxed">
                הנחות מיוחדות על מגוון רחב של ספרי קודש נבחרים. אל תפספסו!
              </p>

              <Link to="/catalog?sale=true">
                <Button
                  className="font-body text-base px-8 py-5 rounded-lg shadow-lg transition-all duration-300"
                  style={{ background: 'linear-gradient(135deg, #D4AF37 0%, #C99722 50%, #D4AF37 100%)', color: '#1F1008' }}
                >
                  <Tag className="h-4 w-4 ml-2" />
                  לכל המבצעים
                </Button>
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
