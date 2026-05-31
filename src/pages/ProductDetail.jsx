import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart, BookOpen, ArrowRight, Minus, Plus, X, ZoomIn } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { CATEGORY_MAP } from '@/lib/categories';
import { Skeleton } from '@/components/ui/skeleton';
import { trackEcommerceEvent } from '@/lib/ecommerceTracking';
import { buildWhatsappUrl, useSiteSettings } from '@/hooks/useSiteSettings';
import AlsoBought from '@/components/product/AlsoBought';

export default function ProductDetail() {
  const urlParams = new URLSearchParams(window.location.search);
  const productId = window.location.pathname.split('/product/')[1];
  const [quantity, setQuantity] = useState(1);
  const [imageOpen, setImageOpen] = useState(false);
  const { addItem } = useCart();
  const { settings } = useSiteSettings();

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', productId],
    queryFn: async () => {
      const products = await base44.entities.Product.filter({ id: productId });
      return products[0];
    },
    enabled: !!productId,
  });

  useEffect(() => {
    if (!product) return;
    trackEcommerceEvent({
      event_type: 'product_view',
      product_id: product.id,
      product_name: product.name,
      value: product.sale_price || product.price || 0,
    });
  }, [product]);

  useEffect(() => {
    if (!imageOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setImageOpen(false);
      }
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [imageOpen]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-cream py-10 px-4">
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-10">
          <Skeleton className="aspect-[3/4] rounded-xl" />
          <div className="space-y-4">
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-12 w-40" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="text-center">
          <h1 className="font-heading text-3xl font-bold text-foreground mb-4">המוצר לא נמצא</h1>
          <Button asChild className="bg-gold text-walnut hover:bg-gold/90 font-body">
            <Link to="/catalog">
              חזור לקטלוג
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const handleAddToCart = () => {
    for (let i = 0; i < quantity; i++) {
      addItem(product);
    }
  };

  return (
    <div className="min-h-screen bg-cream">
      {/* Breadcrumb */}
      <div className="max-w-5xl mx-auto px-4 py-4">
        <nav className="flex items-center gap-2 font-body text-sm text-muted-foreground" aria-label="פירורי לחם">
          <Link to="/" className="hover:text-gold transition-colors">ראשי</Link>
          <span aria-hidden="true">/</span>
          <Link to="/catalog" className="hover:text-gold transition-colors">קטלוג</Link>
          <span aria-hidden="true">/</span>
          <span className="text-foreground" aria-current="page">{product.name}</span>
        </nav>
      </div>

      {/* Product */}
      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="grid md:grid-cols-2 gap-10">
          {/* Image */}
          <div className="relative rounded-xl overflow-hidden bg-white shadow-sm border border-gold/10 aspect-[3/4]">
            {product.image_url ? (
              <button
                type="button"
                onClick={() => setImageOpen(true)}
                className="group h-full w-full cursor-zoom-in"
                aria-label={`פתח תמונה מוגדלת של ${product.name}`}
              >
                <img src={product.image_url} alt={product.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                <span className="absolute bottom-4 left-4 inline-flex items-center gap-2 rounded-lg bg-walnut/85 px-3 py-2 font-body text-sm font-semibold text-cream opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                  <ZoomIn className="h-4 w-4" aria-hidden="true" />
                  הגדל תמונה
                </span>
              </button>
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-secondary">
                <BookOpen className="h-24 w-24 text-gold/20" aria-hidden="true" />
              </div>
            )}
            <div className="absolute top-4 right-4 flex flex-col gap-2">
              {product.is_new && <Badge className="bg-gold text-walnut font-body">חדש</Badge>}
              {product.is_on_sale && <Badge className="bg-red-600 text-white font-body">מבצע</Badge>}
            </div>
          </div>

          {/* Info */}
          <div className="space-y-6">
            {product.category && (
              <span className="text-gold font-body text-sm">{CATEGORY_MAP[product.category]}</span>
            )}
            <h1 className="font-heading text-3xl md:text-4xl font-bold text-foreground">{product.name}</h1>
            {product.author && (
              <p className="text-muted-foreground font-body">{product.author}</p>
            )}

            {/* Price */}
            <div className="flex items-center gap-4">
              {product.is_on_sale && product.sale_price ? (
                <>
                  <span className="font-heading text-4xl font-bold text-gold">₪{product.sale_price}</span>
                  <span className="font-body text-xl text-muted-foreground line-through">₪{product.price}</span>
                </>
              ) : (
                <span className="font-heading text-4xl font-bold text-foreground">₪{product.price}</span>
              )}
            </div>

            {product.description && (
              <p className="font-body text-foreground/80 leading-relaxed border-t border-gold/10 pt-6">{product.description}</p>
            )}

            {/* Quantity & Add to cart */}
            <div className="flex items-center gap-4 pt-4">
              <div className="flex items-center border border-gold/20 rounded-lg overflow-hidden">
                <button onClick={() => setQuantity(q => Math.max(1, q - 1))} className="p-3 hover:bg-secondary transition-colors" aria-label={`הפחת כמות עבור ${product.name}`}>
                  <Minus className="h-4 w-4" aria-hidden="true" />
                </button>
                <span className="px-6 font-body font-bold text-lg" aria-live="polite">{quantity}</span>
                <button onClick={() => setQuantity(q => q + 1)} className="p-3 hover:bg-secondary transition-colors" aria-label={`הוסף כמות עבור ${product.name}`}>
                  <Plus className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>

              <Button onClick={handleAddToCart} className="flex-1 bg-gold text-walnut hover:bg-gold/90 font-body text-base py-6 rounded-lg gold-glow gold-glow-hover transition-all">
                <ShoppingCart className="h-5 w-5 ml-2" />
                הוסף לעגלה
              </Button>
            </div>

            {/* WhatsApp */}
            <Button asChild variant="outline" className="w-full border-gold/30 text-gold hover:bg-gold/10 font-body py-5 mt-2">
              <a href={buildWhatsappUrl(settings.whatsapp, `שלום, אני מעוניין ב: ${product.name}`)} target="_blank" rel="noopener noreferrer">
                שאל אותנו בוואצאפ
              </a>
            </Button>
          </div>
        </div>
      </div>

      {/* Also Bought */}
      <AlsoBought currentProductId={product.id} category={product.category} />

      {/* Back */}
      <div className="max-w-5xl mx-auto px-4 py-8">
        <Button asChild variant="ghost" className="font-body text-muted-foreground hover:text-gold">
          <Link to="/catalog">
            <ArrowRight className="h-4 w-4 ml-2" />
            חזור לקטלוג
          </Link>
        </Button>
      </div>

      {imageOpen && product.image_url && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-walnut/85 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={`תמונה מוגדלת של ${product.name}`}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setImageOpen(false);
            }
          }}
        >
          <div className="relative max-h-[92vh] w-full max-w-5xl rounded-xl bg-white p-3 shadow-2xl">
            <button
              type="button"
              onClick={() => setImageOpen(false)}
              className="absolute left-4 top-4 z-10 rounded-full bg-walnut p-2 text-cream shadow-lg transition-colors hover:bg-walnut/90"
              aria-label="סגור תמונה מוגדלת"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
            <img src={product.image_url} alt={product.name} className="max-h-[86vh] w-full rounded-lg object-contain" />
          </div>
        </div>
      )}
    </div>
  );
}