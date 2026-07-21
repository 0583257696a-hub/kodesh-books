import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Star, Quote } from 'lucide-react';
import { listEntitySafely } from '@/services/entityDataService';

export default function TestimonialsSection() {
  const { data: testimonials = [] } = useQuery({
    queryKey: ['testimonials'],
    queryFn: () => listEntitySafely('Testimonial', '-created_date', 6),
  });

  if (testimonials.length === 0) return null;

  return (
    <section className="py-20 px-4" style={{ background: 'linear-gradient(180deg, #F8F3E8 0%, #FCFAF5 100%)' }}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <div className="flex items-center justify-center gap-4 mb-4">
            <div className="h-px w-16 bg-gradient-to-l from-gold/60 to-transparent" />
            <span className="text-gold-deep font-body text-xs tracking-[0.2em]">מה אומרים עלינו</span>
            <div className="h-px w-16 bg-gradient-to-r from-gold/60 to-transparent" />
          </div>
          <h2 className="font-heading text-4xl md:text-5xl font-bold text-[#1F160F]">הלקוחות ממליצים</h2>
          <div className="flex items-center justify-center gap-2 mt-4">
            <div className="h-px w-8 bg-gold/40" />
            <div className="w-2 h-2 rounded-full bg-gold" />
            <div className="h-px w-8 bg-gold/40" />
          </div>
        </motion.div>

        {/* Testimonials grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              className="bg-white rounded-xl p-8 shadow-sm border border-[#E7D8B8] hover:shadow-md hover:border-gold/30 transition-all duration-300 relative overflow-hidden group"
            >
              {/* Gold top accent */}
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-gold/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

              <Quote className="h-9 w-9 text-gold/15 absolute top-6 left-6" aria-hidden="true" />

              {/* Stars */}
              <div className="flex gap-1 mb-5" role="img" aria-label={`דירוג ${t.rating} מתוך 5 כוכבים`}>
                {Array(5).fill(0).map((_, si) => (
                  <Star
                    key={si}
                    className={`h-4 w-4 ${si < t.rating ? 'text-gold fill-gold' : 'text-[#E7D8B8]'}`}
                    aria-hidden="true"
                  />
                ))}
              </div>

              <p className="font-body text-[#3A2415]/80 leading-relaxed mb-7 text-sm">
                &ldquo;{t.content}&rdquo;
              </p>

              <div className="border-t border-[#E7D8B8] pt-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-gold/20 to-gold/10 flex items-center justify-center flex-shrink-0 border border-gold/20">
                  <span className="font-heading font-bold text-gold-deep text-sm">{t.name?.[0] || '?'}</span>
                </div>
                <p className="font-heading font-bold text-[#1F160F] text-sm">{t.name}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
