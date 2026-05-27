import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Star, Quote } from 'lucide-react';

export default function TestimonialsSection() {
  const { data: testimonials = [] } = useQuery({
    queryKey: ['testimonials'],
    queryFn: () => base44.entities.Testimonial.list('-created_date', 6),
  });

  if (testimonials.length === 0) return null;

  return (
    <section className="py-20 px-4 bg-cream">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-14">
          <span className="text-gold font-body text-sm tracking-widest">מה אומרים עלינו</span>
          <h2 className="font-heading text-4xl md:text-5xl font-bold mt-3 text-foreground">הלקוחות ממליצים</h2>
          <div className="w-20 h-0.5 bg-gold mx-auto mt-4" />
        </div>

        {/* Testimonials grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="bg-white rounded-xl p-8 shadow-sm border border-gold/10 hover:shadow-lg transition-shadow relative"
            >
              <Quote className="h-8 w-8 text-gold/20 absolute top-6 left-6" />
              
              {/* Stars */}
              <div className="flex gap-1 mb-4">
                {Array(5).fill(0).map((_, si) => (
                  <Star key={si} className={`h-4 w-4 ${si < t.rating ? 'text-gold fill-gold' : 'text-gray-200'}`} />
                ))}
              </div>

              <p className="font-body text-foreground/80 leading-relaxed mb-6 text-sm">"{t.content}"</p>
              
              <div className="border-t border-gold/10 pt-4">
                <p className="font-heading font-bold text-foreground">{t.name}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}