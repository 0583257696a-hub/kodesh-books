import React from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Minus, Plus, ShoppingCart, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useCart } from '@/context/CartContext';
import { getShippingCost, useSiteSettings } from '@/hooks/useSiteSettings';

export default function CartDrawer() {
  const {
    items,
    isCartOpen,
    openCart,
    closeCart,
    removeItem,
    updateQuantity,
    totalItems,
    totalPrice,
  } = useCart();
  const { settings } = useSiteSettings();
  const shipping = getShippingCost(settings, totalPrice);
  const orderTotal = totalPrice + shipping;

  const handleOpenChange = (open) => {
    if (open) {
      openCart();
      return;
    }
    closeCart();
  };

  return (
    <Sheet open={isCartOpen} onOpenChange={handleOpenChange}>
      <SheetContent side="left" className="flex w-[min(92vw,420px)] flex-col bg-cream p-0" dir="rtl">
        <SheetHeader className="border-b border-gold/20 px-5 py-5 text-right">
          <SheetTitle className="font-heading text-2xl text-walnut">עגלת קניות</SheetTitle>
          <p className="font-body text-sm text-muted-foreground">{totalItems} מוצרים בעגלה</p>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
            <ShoppingCart className="mb-5 h-16 w-16 text-gold/30" aria-hidden="true" />
            <h3 className="font-heading text-2xl font-bold text-walnut">העגלה ריקה</h3>
            <p className="mt-2 font-body text-muted-foreground">אפשר להתחיל לבחור ספרים מהקטלוג.</p>
            <Button asChild onClick={closeCart} className="mt-6 bg-gold text-walnut hover:bg-gold/90">
              <Link to="/catalog">לקטלוג הספרים</Link>
            </Button>
          </div>
        ) : (
          <>
            <div className="flex-1 space-y-3 overflow-y-auto px-4 py-5">
              {items.map((item) => (
                <article key={item.product_id} className="rounded-xl border border-gold/15 bg-white p-3 shadow-sm">
                  <div className="flex gap-3">
                    <Link
                      to={`/product/${item.product_id}`}
                      onClick={closeCart}
                      className="h-24 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-secondary"
                      aria-label={`פתח את ${item.product_name}`}
                    >
                      {item.image_url ? (
                        <img src={item.image_url} alt={item.product_name} className="h-full w-full object-cover" />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center">
                          <BookOpen className="h-8 w-8 text-gold/25" aria-hidden="true" />
                        </span>
                      )}
                    </Link>

                    <div className="min-w-0 flex-1">
                      <Link
                        to={`/product/${item.product_id}`}
                        onClick={closeCart}
                        className="line-clamp-2 font-heading text-base font-bold text-foreground hover:text-gold"
                      >
                        {item.product_name}
                      </Link>
                      <p className="mt-1 font-body text-sm font-semibold text-gold">₪{Number(item.price || 0).toFixed(2)}</p>

                      <div className="mt-3 flex items-center justify-between gap-2">
                        <div className="flex items-center overflow-hidden rounded-lg border border-gold/20">
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.product_id, item.quantity - 1)}
                            className="p-2 transition hover:bg-secondary"
                            aria-label={`הפחת כמות עבור ${item.product_name}`}
                          >
                            <Minus className="h-3 w-3" aria-hidden="true" />
                          </button>
                          <span className="min-w-8 px-2 text-center font-body text-sm font-bold">{item.quantity}</span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
                            className="p-2 transition hover:bg-secondary"
                            aria-label={`הוסף כמות עבור ${item.product_name}`}
                          >
                            <Plus className="h-3 w-3" aria-hidden="true" />
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => removeItem(item.product_id)}
                          className="rounded-md p-2 text-destructive transition hover:bg-destructive/10"
                          aria-label={`הסר את ${item.product_name} מהעגלה`}
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            <div className="border-t border-gold/20 bg-white px-5 py-5 shadow-[0_-8px_20px_rgba(0,0,0,0.04)]">
              <div className="space-y-2 font-body text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">סכום ביניים</span>
                  <span>₪{totalPrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">משלוח</span>
                  <span className="text-gold">{shipping === 0 ? 'חינם' : `₪${shipping.toFixed(2)}`}</span>
                </div>
                <div className="flex justify-between border-t border-gold/10 pt-3 font-heading text-lg font-bold">
                  <span>סה"כ</span>
                  <span className="text-gold">₪{orderTotal.toFixed(2)}</span>
                </div>
              </div>

              <div className="mt-5 grid gap-2">
                <Button asChild onClick={closeCart} className="bg-gold py-5 text-walnut hover:bg-gold/90">
                  <Link to="/checkout">מעבר לתשלום</Link>
                </Button>
                <Button asChild onClick={closeCart} variant="outline" className="border-gold/30 py-5 text-walnut hover:bg-gold/10">
                  <Link to="/cart">צפייה בעגלה מלאה</Link>
                </Button>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
