import React, { useState } from 'react';
import { ChevronDown, ShoppingCart } from 'lucide-react';
import { useCategoryProducts } from '@/hooks/useCategoryProducts';
import { useCart } from '@/context/CartContext';

export default function MobileCategoryMenuItem({ category, active, onNavigate }) {
  const [open, setOpen] = useState(false);
  const { addItem } = useCart();
  const { data: products = [], isLoading } = useCategoryProducts(category.slug, {
    enabled: open && category.mega_menu_show_products,
    inStockOnly: category.mega_menu_in_stock_only,
  });

  const product = products[0];

  return (
    <div className="border-b border-[#E7D8B8]/60">
      <div className="flex items-center">
        <button
          type="button"
          onClick={() => onNavigate(`/catalog?category=${category.slug}`)}
          className={`flex-1 min-h-[48px] flex items-center gap-3 px-5 py-3.5 text-right font-body text-sm transition-colors ${active ? 'bg-gold/10 text-[#1F160F] font-semibold' : 'text-[#3A2415] hover:bg-gold/5 hover:text-gold'}`}
        >
          {active && <span className="w-1 h-4 rounded-full bg-gold flex-shrink-0" aria-hidden="true" />}
          {category.name}
        </button>
        {category.mega_menu_enabled && (
          <button
            type="button"
            onClick={() => setOpen((current) => !current)}
            aria-expanded={open}
            aria-controls={`mobile-cat-${category.slug}`}
            aria-label={`הצג פרטים נוספים על ${category.name}`}
            className="min-h-[48px] min-w-[48px] flex items-center justify-center text-[#6B5A45] hover:text-gold transition-colors"
          >
            <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
          </button>
        )}
      </div>

      {open && (
        <div id={`mobile-cat-${category.slug}`} className="bg-[#F8F3E8] px-5 py-3 space-y-3" dir="rtl">
          {category.mega_menu_show_view_all && (
            <button
              type="button"
              onClick={() => onNavigate(`/catalog?category=${category.slug}`)}
              className="font-body text-xs font-semibold text-gold"
            >
              לכל הקטגוריה ←
            </button>
          )}

          {category.mega_menu_show_products && (
            isLoading ? (
              <div className="h-16 rounded-lg bg-[#EDE4D0] animate-pulse" />
            ) : product ? (
              <div className="flex items-center gap-3 rounded-lg border border-[#E7D8B8] bg-white p-2.5">
                <button
                  type="button"
                  onClick={() => onNavigate(`/product/${product.id}`)}
                  className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-md bg-[#F8F3E8]"
                >
                  <img src={product.image_url} alt={product.name} loading="lazy" className="h-full w-full object-cover" />
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate(`/product/${product.id}`)}
                  className="min-w-0 flex-1 text-right"
                >
                  <p className="line-clamp-1 font-body text-xs font-semibold text-[#1F160F]">{product.name}</p>
                  <p className="font-heading text-sm font-bold text-gold">₪{product.is_on_sale && product.sale_price ? product.sale_price : product.price}</p>
                </button>
                {category.mega_menu_show_add_to_cart && (
                  <button
                    type="button"
                    disabled={product.in_stock === false}
                    onClick={() => addItem(product)}
                    aria-label={`הוסף את ${product.name} לעגלה`}
                    className="min-h-[44px] min-w-[44px] flex flex-shrink-0 items-center justify-center rounded-md disabled:opacity-40"
                    style={{ background: 'linear-gradient(135deg, #D4AF37, #C99722)', color: '#1F1008' }}
                  >
                    <ShoppingCart className="h-4 w-4" aria-hidden="true" />
                  </button>
                )}
              </div>
            ) : null
          )}
        </div>
      )}
    </div>
  );
}
