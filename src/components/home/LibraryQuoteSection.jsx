import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BookOpen } from 'lucide-react';

export default function LibraryQuoteSection() {
  return (
    <section className="parallax-section px-4" dir="rtl" aria-label="בית המדרש שלנו">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.4 }}
        transition={{ duration: 0.6 }}
        className="relative max-w-2xl rounded-2xl border border-gold/30 bg-[#1F1008]/55 p-10 text-center shadow-2xl backdrop-blur-md md:p-14"
      >
        <span className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full border border-gold/40 bg-gold/10">
          <BookOpen className="h-6 w-6 text-gold" aria-hidden="true" />
        </span>
        <p className="font-heading text-2xl font-bold leading-relaxed text-cream md:text-3xl">
          כל ספר הוא שער לעולם של תורה, חכמה ומסורת
        </p>
        <p className="mt-4 font-body text-sm text-cream/70 md:text-base">
          באוצר הקדושה נבחר עבורכם מגוון ספרי קודש, בכל נושא ולכל בית יהודי
        </p>
        <Link
          to="/catalog"
          className="mt-8 inline-flex items-center justify-center rounded-lg px-8 py-3 font-body text-sm font-semibold transition-transform hover:scale-105"
          style={{ background: 'linear-gradient(135deg, #D4AF37, #C99722)', color: '#1F1008' }}
        >
          לכל הספרים
        </Link>
      </motion.div>
    </section>
  );
}
