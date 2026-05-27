import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';

const PROMO_IMAGE = 'https://media.base44.com/images/public/6a16fe7abf75ec5b5710e703/90ae3e7c0_generated_99e32cc5.png';

export default function PromoBanner() {
  return (
    <section className="py-10 px-4">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="relative rounded-2xl overflow-hidden min-h-[320px] flex items-center"
        >
          {/* Background */}
          <img src={PROMO_IMAGE} alt="מבצעים" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-l from-walnut/95 via-walnut/80 to-walnut/50" />

          {/* Gold border accent */}
          <div className="absolute inset-0 border border-gold/20 rounded-2xl" />

          {/* Content */}
          <div className="relative z-10 p-8 md:p-14 text-right max-w-lg mr-0 ml-auto">
            <div className="inline-flex items-center gap-2 bg-gold/20 backdrop-blur-sm px-4 py-2 rounded-full mb-6">
              <Sparkles className="h-4 w-4 text-gold" />
              <span className="text-gold font-body text-sm">מבצע מיוחד</span>
            </div>

            <h2 className="font-heading text-3xl md:text-5xl font-bold text-cream leading-tight mb-4">
              מבצעי <span className="text-gold">החודש</span> המיוחדים
            </h2>
            <p className="font-body text-cream/70 mb-8 text-lg">
              הנחות של עד 40% על מגוון ספרי קודש נבחרים. המבצע לזמן מוגבל!
            </p>

            <Link to="/catalog?sale=true">
              <Button className="bg-gold text-walnut hover:bg-gold/90 font-body text-base px-8 py-6 rounded-lg animate-gold-pulse">
                למבצעים
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}