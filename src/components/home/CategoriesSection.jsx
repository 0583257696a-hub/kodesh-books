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
    <section className="py-20 px-4 bg-cream">
      <div className="max-w-7xl mx-auto">
        {/* Section header */}
        <div className="text-center mb-14">
          <span className="text-gold font-body text-sm tracking-widest">גלה את העולם שלנו</span>
          <h2 className="font-heading text-4xl md:text-5xl font-bold mt-3 text-foreground">הקטגוריות</h2>
          <div className="w-20 h-0.5 bg-gold mx-auto mt-4" />
        </div>

        {/* Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {homeCategories.map((cat, i) => {
            const Icon = ICON_MAP[cat.icon] || FolderOpen;
            return (
              <motion.div
                key={cat.slug}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.5 }}
              >
                <Link to={`/catalog?category=${cat.slug}`} className="block group">
                  <div className="relative overflow-hidden rounded-xl aspect-square shadow-md hover:shadow-xl transition-all duration-500">
                    {cat.image_url ? (
                      <img src={cat.image_url} alt={cat.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-walnut/10">
                        <Icon className="h-12 w-12 text-gold" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-walnut/90 via-walnut/40 to-transparent" />
                    
                    {/* Content */}
                    <div className="absolute bottom-0 left-0 right-0 p-4 text-center">
                      <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-gold/20 backdrop-blur-sm mb-2 group-hover:bg-gold/40 transition-colors">
                        <Icon className="h-5 w-5 text-gold" />
                      </div>
                      <h3 className="font-heading text-lg font-bold text-cream">{cat.name}</h3>
                    </div>

                    {/* Gold arch border on hover */}
                    <div className="absolute inset-0 border-2 border-transparent group-hover:border-gold/40 rounded-xl transition-colors duration-500" />
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
