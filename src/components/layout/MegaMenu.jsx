import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Baby, BookHeart, BookOpen, Boxes, Check, FolderOpen, Gift, Library, Scale, ShoppingCart, Sparkles } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useCategoryProducts } from '@/hooks/useCategoryProducts';

const ICON_MAP = { Baby, BookHeart, BookOpen, Boxes, FolderOpen, Gift, Library, Scale, Sparkles };

function useRotatingProducts(products, count, rotationSeconds, active) {
  const [start, setStart] = useState(0);

  useEffect(() => {
    setStart(0);
  }, [products, count]);

  useEffect(() => {
    if (!active || products.length <= count) return undefined;
    const id = setInterval(() => {
      setStart((current) => (current + count) % products.length);
    }, rotationSeconds * 1000);
    return () => clearInterval(id);
  }, [active, products, count, rotationSeconds]);

  if (count <= 0 || products.length === 0) return [];
  if (products.length <= count) return products;

  const visible = [];
  for (let i = 0; i < count; i += 1) {
    visible.push(products[(start + i) % products.length]);
  }
  return visible;
}

function MegaMenuProductCard({ product, showAddToCart }) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);

  const handleAdd = (e) => {
    e.preventDefault();
    e.stopPropagation();
    addItem(product);
    setAdded(true);
    setTimeout(() => setAdded(false), 1200);
  };

  const outOfStock = product.in_stock === false;
  const price = product.is_on_sale && product.sale_price ? product.sale_price : product.price;

  return (
    <Link
      to={`/product/${product.id}`}
      className="group flex flex-col overflow-hidden rounded-lg border border-[#E7D8B8]/70 bg-white transition-colors hover:border-gold/50 hover:shadow-md"
    >
      <div className="aspect-square w-full overflow-hidden bg-[#F8F3E8]">
        <img
          src={product.image_url}
          alt={product.name}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <p className="line-clamp-2 min-h-[2.2em] font-body text-xs font-semibold leading-snug text-[#1F160F]">{product.name}</p>
        <p className="font-heading text-sm font-bold text-gold-deep">₪{Number(price).toLocaleString('he-IL')}</p>
        {showAddToCart ? (
          <button
            type="button"
            onClick={handleAdd}
            disabled={outOfStock}
            aria-label={`הוסף את ${product.name} לעגלה`}
            className="mt-auto flex items-center justify-center gap-1.5 rounded-md px-2.5 py-1.5 font-body text-[11px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50"
            style={added ? { background: '#E9F3E5', color: '#2E6B3E' } : { background: 'linear-gradient(135deg, #D4AF37, #C99722)', color: '#1F1008' }}
          >
            {outOfStock ? 'אזל מהמלאי' : added ? (
              <>
                <Check className="h-3 w-3" aria-hidden="true" /> נוסף לסל
              </>
            ) : (
              <>
                <ShoppingCart className="h-3 w-3" aria-hidden="true" /> הוסף לסל
              </>
            )}
          </button>
        ) : null}
      </div>
    </Link>
  );
}

export default function MegaMenu({ category, panelId, isOpen, onMouseEnter, onMouseLeave, onNavigate }) {
  const { data: products = [], isLoading } = useCategoryProducts(category.slug, {
    enabled: isOpen && category.mega_menu_show_products,
    inStockOnly: category.mega_menu_in_stock_only,
  });

  const visibleProducts = useRotatingProducts(products, category.mega_menu_desktop_count, category.mega_menu_rotation_seconds, isOpen);
  const Icon = ICON_MAP[category.icon] || FolderOpen;

  return (
    <div
      id={panelId}
      role="region"
      aria-label={`תפריט קטגוריית ${category.name}`}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className="absolute inset-x-0 top-full z-30 border-b border-[#E7D8B8]/80 bg-[#FCFAF5] shadow-xl"
      dir="rtl"
    >
      <div className="mx-auto max-w-7xl px-4 py-6">
        <div className="mb-5 flex items-center justify-between gap-4 border-b border-[#E7D8B8]/60 pb-4">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-gold/12 border border-gold/20">
              <Icon className="h-5 w-5 text-gold" aria-hidden="true" />
            </span>
            <div>
              <h3 className="font-heading text-lg font-bold text-[#1F160F]">{category.name}</h3>
              {category.description ? (
                <p className="mt-0.5 max-w-md font-body text-xs text-[#6B5A45] line-clamp-1">{category.description}</p>
              ) : null}
            </div>
          </div>
          {category.mega_menu_show_view_all ? (
            <Link
              to={`/catalog?category=${category.slug}`}
              onClick={onNavigate}
              className="flex-shrink-0 whitespace-nowrap rounded-md border border-gold/40 px-3.5 py-1.5 font-body text-xs font-semibold text-[#3A2415] transition-colors hover:bg-gold/10 hover:text-gold"
            >
              לכל הקטגוריה ←
            </Link>
          ) : null}
        </div>

        {category.mega_menu_show_products ? (
          isLoading ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {Array(category.mega_menu_desktop_count || 4).fill(0).map((_, i) => (
                <div key={i} className="aspect-square animate-pulse rounded-lg bg-[#F0E9D8]" />
              ))}
            </div>
          ) : visibleProducts.length > 0 ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {visibleProducts.map((product) => (
                <MegaMenuProductCard key={product.id} product={product} showAddToCart={category.mega_menu_show_add_to_cart} />
              ))}
            </div>
          ) : (
            <p className="font-body text-xs text-[#6B5A45]">אין כרגע מוצרים מומלצים בקטגוריה זו.</p>
          )
        ) : null}
      </div>
    </div>
  );
}
