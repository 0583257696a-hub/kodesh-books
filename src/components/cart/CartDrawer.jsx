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
  const shipping = getShippingCost(settings, totalPrice, items);
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
      <SheetContent side="left" className="flex w-[min(92vw,420px)] flex-col p-0" style={{ background: '#FCFAF5' }} dir="rtl">
       <SheetHeader className="border-b border-[#E7D8B8] px-5 py-4 text-right bg-white">
         <SheetTitle className="font-heading text-xl text-[#1F160F]">עגלת קניות</SheetTitle>
         <p className="font-body text-xs text-[#6B5A45]">{totalItems} מוצרים בעגלה</p>
       </SheetHeader>

       {items.length === 0 ? (
         <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
           <ShoppingCart className="mb-5 h-14 w-14 text-gold/25" aria-hidden="true" />
           <h3 className="font-heading text-xl font-bold text-[#1F160F]">העגלה ריקה</h3>
           <p className="mt-2 font-body text-sm text-[#6B5A45]">אפשר להתחיל לבחור ספרים מהקטלוג.</p>
           <Button asChild onClick={closeCart} className="mt-6 font-body rounded-lg" style={{ background: 'linear-gradient(135deg, #D4AF37, #C99722)', color: '#1F1008' }}>
             <Link to="/catalog">לקטלוג הספרים</Link>
           </Button>
         </div>
       ) : (
         <>
           <div className="flex-1 space-y-2.5 overflow-y-auto px-4 py-4">
             {items.map((item) => (
               <article key={item.product_id} className="rounded-xl border border-[#E7D8B8] bg-white p-3 hover:border-gold/30 transition-colors">
                 <div className="flex gap-3">
                   <Link
                     to={`/product/${item.product_id}`}
                     onClick={closeCart}
                     className="h-20 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-[#F8F3E8] border border-[#E7D8B8]"
                     aria-label={`פתח את ${item.product_name}`}
                   >
                     {item.image_url ? (
                       <img src={item.image_url} alt={item.product_name} loading="lazy" className="h-full w-full object-cover" />
                     ) : (
                       <span className="flex h-full w-full items-center justify-center">
                         <BookOpen className="h-6 w-6 text-gold/25" aria-hidden="true" />
                       </span>
                     )}
                   </Link>

                   <div className="min-w-0 flex-1">
                     <Link
                       to={`/product/${item.product_id}`}
                       onClick={closeCart}
                       className="line-clamp-2 font-heading text-sm font-bold text-[#1F160F] hover:text-gold transition-colors leading-snug"
                     >
                       {item.product_name}
                     </Link>
                     <p className="mt-1 font-body text-sm font-semibold text-gold-deep">₪{Number(item.price || 0).toLocaleString('he-IL')}</p>

                     <div className="mt-2.5 flex items-center justify-between gap-2">
                       <div className="flex items-center overflow-hidden rounded-lg border border-[#E7D8B8]">
                         <button type="button" onClick={() => updateQuantity(item.product_id, item.quantity - 1)} className="p-1.5 hover:bg-[#F8F3E8] transition-colors" aria-label={`הפחת כמות עבור ${item.product_name}`}>
                           <Minus className="h-3 w-3 text-[#3A2415]" aria-hidden="true" />
                         </button>
                         <span className="min-w-7 px-1.5 text-center font-body text-sm font-bold text-[#1F160F]">{item.quantity}</span>
                         <button type="button" onClick={() => updateQuantity(item.product_id, item.quantity + 1)} className="p-1.5 hover:bg-[#F8F3E8] transition-colors" aria-label={`הוסף כמות עבור ${item.product_name}`}>
                           <Plus className="h-3 w-3 text-[#3A2415]" aria-hidden="true" />
                         </button>
                       </div>
                       <button type="button" onClick={() => removeItem(item.product_id)} className="rounded-md p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors" aria-label={`הסר את ${item.product_name} מהעגלה`}>
                         <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                       </button>
                     </div>
                   </div>
                 </div>
               </article>
             ))}
           </div>

           <div className="border-t border-[#E7D8B8] bg-white px-5 py-5">
             <div className="space-y-2 font-body text-sm">
               <div className="flex justify-between text-[#3A2415]">
                 <span className="text-[#6B5A45]">סכום ביניים</span>
                 <span>₪{totalPrice.toLocaleString('he-IL')}</span>
               </div>
               <div className="flex justify-between">
                 <span className="text-[#6B5A45]">משלוח</span>
                 <span className="text-gold-deep font-semibold">{shipping === 0 ? 'חינם' : `₪${shipping.toLocaleString('he-IL')}`}</span>
               </div>
               <div className="flex justify-between border-t border-[#E7D8B8] pt-3 font-heading text-lg font-bold">
                 <span className="text-[#1F160F]">סה"כ</span>
                 <span className="text-gold-deep">₪{orderTotal.toLocaleString('he-IL')}</span>
               </div>
             </div>

             <div className="mt-4 grid gap-2">
               <Button asChild onClick={closeCart} className="py-5 font-body rounded-lg" style={{ background: 'linear-gradient(135deg, #D4AF37, #C99722)', color: '#1F1008' }}>
                 <Link to="/checkout">מעבר לתשלום</Link>
               </Button>
               <Button asChild onClick={closeCart} variant="outline" className="border-[#E7D8B8] py-4 text-[#3A2415] hover:border-gold/50 hover:text-gold font-body">
                 <Link to="/cart">צפייה בעגלה המלאה</Link>
               </Button>
             </div>
           </div>
         </>
       )}
      </SheetContent>
    </Sheet>
  );
}
