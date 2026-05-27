import React from 'react';
import { motion } from 'framer-motion';
import { ShoppingCart, BookOpen } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useCart } from '@/context/CartContext';
import { Link } from 'react-router-dom';
import { CATEGORY_MAP } from '@/lib/categories';

export default function ProductCard({ product }) {
  const { addItem } = useCart();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="group"
    >
      <div className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500 border border-gold/10">
        {/* Image */}
        <div className="relative aspect-[3/4] overflow-hidden bg-secondary">
          {product.image_url ? (
            <img src={product.image_url} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-secondary to-muted">
              <BookOpen className="h-16 w-16 text-gold/30" />
            </div>
          )}

          {/* Tags */}
          <div className="absolute top-3 right-3 flex flex-col gap-2">
            {product.is_new && (
              <Badge className="bg-gold text-walnut font-body text-xs px-3 py-1">חדש</Badge>
            )}
            {product.is_on_sale && (
              <Badge className="bg-red-600 text-white font-body text-xs px-3 py-1">מבצע</Badge>
            )}
          </div>

          {/* Add to cart overlay */}
          <div className="absolute bottom-0 left-0 right-0 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
            <Button
              onClick={(e) => { e.preventDefault(); addItem(product); }}
              className="w-full bg-gold/95 text-walnut hover:bg-gold font-body rounded-none py-3 text-sm"
            >
              <ShoppingCart className="h-4 w-4 ml-2" />
              הוסף לעגלה
            </Button>
          </div>
        </div>

        {/* Info */}
        <Link to={`/product/${product.id}`}>
          <div className="p-4">
            {product.category && (
              <span className="text-gold text-xs font-body">{CATEGORY_MAP[product.category]}</span>
            )}
            <h3 className="font-heading text-base font-bold mt-1 text-foreground line-clamp-2 leading-snug">{product.name}</h3>
            {product.author && (
              <p className="text-muted-foreground text-xs font-body mt-1">{product.author}</p>
            )}
            <div className="flex items-center gap-2 mt-3">
              {product.is_on_sale && product.sale_price ? (
                <>
                  <span className="font-heading text-lg font-bold text-gold">₪{product.sale_price}</span>
                  <span className="font-body text-sm text-muted-foreground line-through">₪{product.price}</span>
                </>
              ) : (
                <span className="font-heading text-lg font-bold text-foreground">₪{product.price}</span>
              )}
            </div>
          </div>
        </Link>
      </div>
    </motion.div>
  );
}