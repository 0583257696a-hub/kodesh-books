import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Baby, BookHeart, BookOpen, Boxes, Flame, FolderOpen, Gift, Library, Scale, Sparkles } from 'lucide-react';
import { useStoreCategories } from '@/hooks/useStoreCategories';

const ICON_MAP = { Baby, BookHeart, BookOpen, Boxes, Flame, FolderOpen, Gift, Library, Scale, Sparkles };

export default function CategoriesSection() {
  const { categories } = useStoreCategories();
  const homeCategories = categories.filter((category) => category.show_in_home);

  return (
    <section
      className="parallax-section py-20 px-4"
      style={{ backgroundImage: "linear-gradient(rgba(31,16,8,.6),rgba(31,16,8,.35)), url('/assets/static/home-hero.png')" }}
    >
      <div className="max-w-7xl mx-auto w-full">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <div className="flex items-center justify-center gap-4 mb-4">
            <div className="h-px w-16 bg-gradient-to-l from-gold/60 to-transparent" />
            <span className="text-gold font-body text-xs tracking-[0.2em]">גלה את האוצרות שלנו</span>
            <div className="h-px w-16 bg-gradient-to-r from-gold/60 to-transparent" />
          </div>
          <h2 className="font-heading text-4xl md:text-5xl font-bold text-cream">הקטגוריות</h2>
          <div className="flex items-center justify-center gap-2 mt-4">
            <div className="h-px w-8 bg-gold/40" />
            <div className="w-2 h-2 rounded-full bg-gold" />
            <div className="h-px w-8 bg-gold/40" />
          </div>
        </motion.div>

        {/* Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5">
          {homeCategories.map((cat, i) => {
            const Icon = ICON_MAP[cat.icon] || FolderOpen;
            return (
              <motion.div
                key={cat.slug}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: Math.min(i * 0.05, 0.4), duration: 0.5 }}
              >
                <Link to={`/catalog?category=${cat.slug}`} className="block group" aria-label={`עבור לקטגוריה ${cat.name}`}>
                  <div className="relative overflow-hidden rounded-xl aspect-square shadow-md group-hover:shadow-xl transition-all duration-500 border border-transparent group-hover:border-gold/50 bg-[#1F1008]">
                    {cat.image_url ? (
                      <img
                        src={cat.image_url}
                        alt={cat.name}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-700"
                        style={{ transform: 'scale(1)', transition: 'transform 700ms ease' }}
                        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.07)'}
                        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                        onError={e => { e.currentTarget.style.display = 'none'; }}
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-[#3A2415] to-[#2A1B0E] flex items-center justify-center">
                        <Icon className="h-14 w-14 text-gold/40" />
                      </div>
                    )}

                    {/* Dark overlay -- independent layer, holds even if the image above fails to load */}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#1a0e05]/85 via-[#1a0e05]/30 to-transparent group-hover:from-[#1a0e05]/75 transition-all duration-500" />

                    {/* Gold top shimmer on hover */}
                    <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                    {/* Content */}
                    <div className="absolute bottom-0 left-0 right-0 p-4 text-center">
                      <div className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-gold/15 backdrop-blur-sm mb-2 group-hover:bg-gold/30 transition-all duration-300 border border-gold/20">
                        <Icon className="h-4 w-4 text-gold" aria-hidden="true" />
                      </div>
                      <h3 className="font-heading text-base md:text-lg font-bold text-cream group-hover:text-gold transition-colors duration-300 leading-tight">
                        {cat.name}
                      </h3>
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
