import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BookOpen, Library, Scale, Sparkles, Baby, BookHeart, Flame, Gift } from 'lucide-react';

const CATEGORY_IMAGES = {
  chumashim: 'https://media.base44.com/images/public/6a16fe7abf75ec5b5710e703/c7956dabc_generated_58adb81d.png',
  gemarot: 'https://media.base44.com/images/public/6a16fe7abf75ec5b5710e703/522a640b6_generated_aae8d1f9.png',
  halacha: 'https://media.base44.com/images/public/6a16fe7abf75ec5b5710e703/492a71714_generated_ef0436d4.png',
  chassidut: 'https://media.base44.com/images/public/6a16fe7abf75ec5b5710e703/f0982ad6d_generated_8f79bc9b.png',
  kids: 'https://media.base44.com/images/public/6a16fe7abf75ec5b5710e703/cd371a324_generated_686fa02d.png',
  siddurim: 'https://media.base44.com/images/public/6a16fe7abf75ec5b5710e703/f910326d1_generated_d7cb5ac1.png',
  tashmishei_kedusha: 'https://media.base44.com/images/public/6a16fe7abf75ec5b5710e703/583d0969f_generated_5e782f7b.png',
  gifts: 'https://media.base44.com/images/public/6a16fe7abf75ec5b5710e703/0d11dfa5e_generated_df9cd4ac.png',
};

const ICON_MAP = { BookOpen, Library, Scale, Sparkles, Baby, BookHeart, Flame, Gift };

const categories = [
  { id: 'chumashim', name: 'חומשים', icon: 'BookOpen' },
  { id: 'gemarot', name: 'גמרות', icon: 'Library' },
  { id: 'halacha', name: 'הלכה', icon: 'Scale' },
  { id: 'chassidut', name: 'חסידות', icon: 'Sparkles' },
  { id: 'kids', name: 'ספרי ילדים', icon: 'Baby' },
  { id: 'siddurim', name: 'סידורים ומחזורים', icon: 'BookHeart' },
  { id: 'tashmishei_kedusha', name: 'תשמישי קדושה', icon: 'Flame' },
  { id: 'gifts', name: 'מתנות יהודיות', icon: 'Gift' },
];

export default function CategoriesSection() {
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
          {categories.map((cat, i) => {
            const Icon = ICON_MAP[cat.icon];
            return (
              <motion.div
                key={cat.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.5 }}
              >
                <Link to={`/catalog?category=${cat.id}`} className="block group">
                  <div className="relative overflow-hidden rounded-xl aspect-square shadow-md hover:shadow-xl transition-all duration-500">
                    <img src={CATEGORY_IMAGES[cat.id]} alt={cat.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
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