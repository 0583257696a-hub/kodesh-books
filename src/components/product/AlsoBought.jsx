import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, ShoppingCart, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCart } from '@/context/CartContext';
import { CATEGORY_MAP } from '@/lib/categories';

const VISIBLE = 4; // items visible on desktop
const INTERVAL = 3500; // 3.5 seconds

export default function AlsoBought({ currentProductId, category }) {
  const { addItem } = useCart();
  const [current, setCurrent] = useState(0);
  const timerRef = useRef(null);

  const { data: products = [] } = useQuery({
    queryKey: ['also-bought', category],
    queryFn: async () => {
      const all = await base44.entities.Product.filter({ in_stock: true });
      return all.filter((p) => p.id !== currentProductId).slice(0, 12);
    },
    enabled: !!currentProductId,
  });

  const total = products.length;
  const maxIndex = Math.max(0, total - VISIBLE);

  const next = () => setCurrent((c) => (c >= maxIndex ? 0 : c + 1));
  const prev = () => setCurrent((c) => (c <= 0 ? maxIndex : c - 1));

  // Auto-advance every 4 seconds
  useEffect(() => {
    if (total <= VISIBLE) return;
    timerRef.current = setInterval(next, INTERVAL);
    return () => clearInterval(timerRef.current);
  }, [total, maxIndex]);

  const resetTimer = () => {
    clearInterval(timerRef.current);
    timerRef.current = setInterval(next, INTERVAL);
  };

  const handleNext = () => { next(); resetTimer(); };
  const handlePrev = () => { prev(); resetTimer(); };

  if (total === 0) return null;

  return (
    <section className="max-w-5xl mx-auto px-4 py-10 border-t border-gold/10" aria-label="לקוחות שקנו מוצר זה קנו גם">
      <h2 className="font-heading text-2xl font-bold text-foreground mb-6 text-right">
        לקוחות שקנו מוצר זה קנו גם
      </h2>

      <div className="relative">
        {/* Carousel track */}
        <div className="overflow-hidden">
          <div
            className="flex transition-transform duration-500 ease-in-out gap-4"
            style={{ transform: `translateX(${current * (100 / VISIBLE)}%)` }}
          >
            {products.map((product) => (
              <div
                key={product.id}
                className="flex-shrink-0 w-[calc(25%-12px)] min-w-[180px]"
              >
                <div className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 border border-gold/10 group">
                  {/* Image */}
                  <Link to={`/product/${product.id}`} className="block relative aspect-[3/4] overflow-hidden bg-secondary">
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <BookOpen className="h-12 w-12 text-gold/30" />
                      </div>
                    )}
                  </Link>

                  {/* Info */}
                  <div className="p-3">
                    <Link to={`/product/${product.id}`}>
                      <h3 className="font-heading text-sm font-bold text-foreground line-clamp-2 leading-snug mb-1 hover:text-gold transition-colors">
                        {product.name}
                      </h3>
                      {product.author && (
                        <p className="text-muted-foreground text-xs font-body line-clamp-1 mb-2">{product.author}</p>
                      )}
                      <div className="flex items-center gap-1.5 mb-3">
                        {product.is_on_sale && product.sale_price ? (
                          <>
                            <span className="font-heading text-base font-bold text-gold">₪{product.sale_price}</span>
                            <span className="font-body text-xs text-muted-foreground line-through">₪{product.price}</span>
                          </>
                        ) : (
                          <span className="font-heading text-base font-bold text-foreground">₪{product.price}</span>
                        )}
                      </div>
                    </Link>
                    <button
                      onClick={() => addItem(product)}
                      className="w-full flex items-center justify-center gap-1.5 bg-gold/10 hover:bg-gold text-gold hover:text-walnut font-body text-xs font-semibold py-2 rounded-lg transition-colors duration-200"
                      aria-label={`הוסף את ${product.name} לעגלה`}
                    >
                      <ShoppingCart className="h-3.5 w-3.5" />
                      הוסף לעגלה
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Navigation arrows */}
        {total > VISIBLE && (
          <>
            <button
              onClick={handlePrev}
              className="absolute -right-4 top-1/2 -translate-y-1/2 z-10 bg-white border border-gold/20 hover:border-gold hover:bg-gold/5 rounded-full p-2 shadow-md transition-all"
              aria-label="הקודם"
            >
              <ChevronRight className="h-5 w-5 text-foreground" />
            </button>
            <button
              onClick={handleNext}
              className="absolute -left-4 top-1/2 -translate-y-1/2 z-10 bg-white border border-gold/20 hover:border-gold hover:bg-gold/5 rounded-full p-2 shadow-md transition-all"
              aria-label="הבא"
            >
              <ChevronLeft className="h-5 w-5 text-foreground" />
            </button>
          </>
        )}

        {/* Dots */}
        {total > VISIBLE && (
          <div className="flex justify-center gap-1.5 mt-5">
            {Array.from({ length: maxIndex + 1 }).map((_, i) => (
              <button
                key={i}
                onClick={() => { setCurrent(i); resetTimer(); }}
                className={`h-1.5 rounded-full transition-all duration-300 ${i === current ? 'w-5 bg-gold' : 'w-1.5 bg-gold/30'}`}
                aria-label={`עבור לשקופית ${i + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}