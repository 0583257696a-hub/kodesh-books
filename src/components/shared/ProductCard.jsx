import React from 'react';
import { motion } from 'framer-motion';
import { ShoppingCart, BookOpen, Eye } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useCart } from '@/context/CartContext';
import { Link, useNavigate } from 'react-router-dom';
import { useStoreCategories } from '@/hooks/useStoreCategories';

export default function ProductCard({ product }) {
  const { addItem } = useCart();
  const navigate = useNavigate();
  const { categoryMap } = useStoreCategories();
  const productPath = `/product/${product.id}`;

  const isOutOfStock = product.in_stock === false;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="group"
    >
      <div className="bg-white rounded-xl overflow-hidden transition-all duration-400 border border-[#E7D8B8] hover:border-gold/40 hover:shadow-lg" style={{ boxShadow: '0 2px 12px rgba(42,22,11,0.06)' }}>
        
        {/* Image */}
        <div className="relative aspect-[3/4] overflow-hidden bg-[#F8F3E8]">
          <Link to={productPath} className="block h-full w-full cursor-pointer" aria-label={`פתח את ${product.name}`}>
            {product.image_url ? (
              <img
                src={product.image_url}
                alt={product.name}
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-600 group-hover:scale-105"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#F8F3E8] to-[#EDE4D0]">
                <BookOpen className="h-16 w-16 text-gold/25" aria-hidden="true" />
              </div>
            )}
          </Link>

          {/* Tags */}
          <div className="absolute top-3 right-3 flex flex-col gap-1.5 z-10">
            {product.is_new && (
              <Badge className="font-body text-xs px-2.5 py-0.5 rounded-md" style={{ background: 'linear-gradient(135deg, #D4AF37, #C99722)', color: '#1F1008' }}>חדש</Badge>
            )}
            {product.is_on_sale && (
              <Badge className="bg-red-600 text-white font-body text-xs px-2.5 py-0.5 rounded-md">מבצע</Badge>
            )}
            {isOutOfStock && (
              <Badge className="bg-[#3A2415]/80 text-cream font-body text-xs px-2.5 py-0.5 rounded-md">אזל</Badge>
            )}
          </div>

          {/* Quick view + Add to cart overlay */}
          <div className="absolute bottom-0 left-0 right-0 flex flex-col gap-0 translate-y-full group-hover:translate-y-0 transition-transform duration-300 z-10">
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); navigate(productPath); }}
              className="w-full bg-[#2A160B]/85 backdrop-blur-sm text-cream/80 hover:text-gold font-body text-xs py-2.5 flex items-center justify-center gap-2 transition-colors"
              aria-label={`צפייה מהירה ב${product.name}`}
            >
              <Eye className="h-3.5 w-3.5" aria-hidden="true" />
              צפייה מהירה
            </button>
            <Button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); addItem(product); }}
              disabled={isOutOfStock}
              className="w-full rounded-none py-3 font-body text-sm border-0 transition-all duration-200"
              style={{ background: 'linear-gradient(135deg, #D4AF37, #C99722)', color: '#1F1008' }}
              aria-label={`הוסף את ${product.name} לעגלה`}
            >
              <ShoppingCart className="h-4 w-4 ml-2" aria-hidden="true" />
              הוסף לסל
            </Button>
          </div>
        </div>

        {/* Info */}
        <Link to={productPath}>
          <div className="p-4">
            {product.category && (
              <span className="text-gold-deep text-xs font-body font-medium tracking-wide">{categoryMap[product.category] || product.category}</span>
            )}
            <h3 className="font-heading text-sm md:text-base font-bold mt-1 text-[#1F160F] line-clamp-2 leading-snug">{product.name}</h3>
            {product.author && (
              <p className="text-[#6B5A45] text-xs font-body mt-1 line-clamp-1">{product.author}</p>
            )}
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[#E7D8B8]">
              {product.is_on_sale && product.sale_price ? (
                <>
                  <span className="font-heading text-lg font-bold text-gold-deep">₪{Number(product.sale_price).toLocaleString('he-IL')}</span>
                  <span className="font-body text-sm text-[#6B5A45] line-through">₪{Number(product.price).toLocaleString('he-IL')}</span>
                  <span className="text-red-500 text-xs font-body font-semibold mr-auto">
                    {Math.round(((product.price - product.sale_price) / product.price) * 100)}% הנחה
                  </span>
                </>
              ) : (
                <span className="font-heading text-lg font-bold text-[#1F160F]">₪{Number(product.price).toLocaleString('he-IL')}</span>
              )}
            </div>
          </div>
        </Link>
      </div>
    </motion.div>
  );
}
