import React from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '@/context/CartContext';
import { Button } from '@/components/ui/button';
import { Trash2, Minus, Plus, ShoppingCart, ArrowRight, BookOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { buildWhatsappUrl, getShippingCost, useSiteSettings } from '@/hooks/useSiteSettings';

export default function Cart() {
  const { items, removeItem, updateQuantity, totalPrice, clearCart } = useCart();
  const { settings } = useSiteSettings();
  const shipping = getShippingCost(settings, totalPrice, items);
  const orderTotal = totalPrice + shipping;
  const whatsappOrderText = `שלום, אני רוצה להזמין: ${items.map(i => `${i.product_name} (${i.quantity})`).join(', ')}. משלוח: ${shipping === 0 ? 'חינם' : `₪${shipping.toFixed(2)}`}. סה"כ: ₪${orderTotal.toFixed(2)}`;

  if (items.length === 0) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4" style={{ background: '#FCFAF5' }}>
        <div className="text-center">
          <ShoppingCart className="h-20 w-20 text-gold/25 mx-auto mb-6" aria-hidden="true" />
          <h1 className="font-heading text-3xl font-bold text-[#1F160F] mb-3">העגלה ריקה</h1>
          <p className="font-body text-[#6B5A45] mb-8">לא הוספת מוצרים עדיין</p>
          <Button asChild className="font-body px-8 py-3 rounded-lg" style={{ background: 'linear-gradient(135deg, #D4AF37, #C99722)', color: '#1F1008' }}>
            <Link to="/catalog">לקטלוג הספרים</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: '#FCFAF5' }} dir="rtl">
      <div className="bg-[#1F1008] py-10 px-4 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold/40 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold/20 to-transparent" />
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="font-heading text-3xl font-bold text-cream">עגלת קניות</h1>
          <div className="flex items-center justify-center gap-2 mt-3">
            <div className="h-px w-8 bg-gold/40" />
            <div className="w-1.5 h-1.5 rounded-full bg-gold" />
            <div className="h-px w-8 bg-gold/40" />
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-10">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Items */}
          <div className="lg:col-span-2 space-y-3">
            <AnimatePresence>
              {items.map(item => (
                <motion.div
                  key={item.product_id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="bg-white rounded-xl p-4 shadow-sm border border-[#E7D8B8] hover:border-gold/30 transition-colors flex gap-4"
                >
                  {/* Image */}
                  <div className="w-20 h-24 rounded-lg overflow-hidden bg-[#F8F3E8] flex-shrink-0 border border-[#E7D8B8]">
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.product_name} loading="lazy" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <BookOpen className="h-8 w-8 text-gold/20" aria-hidden="true" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="font-heading font-bold text-[#1F160F] leading-snug">{item.product_name}</h3>
                      <p className="text-gold-deep font-body text-sm mt-0.5">₪{Number(item.price).toLocaleString('he-IL')}</p>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center border border-[#E7D8B8] rounded-lg overflow-hidden">
                        <button type="button" onClick={() => updateQuantity(item.product_id, item.quantity - 1)} className="p-2 hover:bg-[#F8F3E8] transition-colors" aria-label={`הפחת כמות עבור ${item.product_name}`}>
                          <Minus className="h-3 w-3 text-[#3A2415]" aria-hidden="true" />
                        </button>
                        <span className="px-4 font-body font-bold text-sm text-[#1F160F]" aria-live="polite">{item.quantity}</span>
                        <button type="button" onClick={() => updateQuantity(item.product_id, item.quantity + 1)} className="p-2 hover:bg-[#F8F3E8] transition-colors" aria-label={`הוסף כמות עבור ${item.product_name}`}>
                          <Plus className="h-3 w-3 text-[#3A2415]" aria-hidden="true" />
                        </button>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="font-heading font-bold text-[#1F160F]">₪{(item.price * item.quantity).toLocaleString('he-IL')}</span>
                        <button type="button" onClick={() => removeItem(item.product_id)} className="text-red-400 hover:text-red-600 transition-colors" aria-label={`הסר את ${item.product_name} מהעגלה`}>
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Summary */}
          <div className="bg-white rounded-xl p-6 border border-[#E7D8B8] h-fit sticky top-28" style={{ boxShadow: '0 4px 20px rgba(42,22,11,0.08)' }}>
            <h2 className="font-heading text-xl font-bold text-[#1F160F] mb-6 pb-4 border-b border-[#E7D8B8]">סיכום הזמנה</h2>

            <div className="space-y-3 font-body text-sm">
              <div className="flex justify-between text-[#3A2415]">
                <span className="text-[#6B5A45]">סה"כ מוצרים</span>
                <span>{items.reduce((s, i) => s + i.quantity, 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6B5A45]">משלוח</span>
                <span className="text-gold-deep font-semibold">{shipping === 0 ? 'חינם' : `₪${shipping.toLocaleString('he-IL')}`}</span>
              </div>
              <div className="border-t border-[#E7D8B8] pt-3 flex justify-between">
                <span className="font-heading font-bold text-lg text-[#1F160F]">סה"כ</span>
                <span className="font-heading font-bold text-xl text-gold-deep">₪{orderTotal.toLocaleString('he-IL')}</span>
              </div>
            </div>

            <Button asChild className="w-full mt-6 font-body py-5 text-base rounded-lg" style={{ background: 'linear-gradient(135deg, #D4AF37, #C99722)', color: '#1F1008' }}>
              <Link to="/checkout">מעבר לתשלום</Link>
            </Button>

            <Button asChild variant="outline" className="w-full mt-3 border-[#E7D8B8] text-[#3A2415] hover:border-gold/50 hover:text-gold font-body py-4">
              <a href={buildWhatsappUrl(settings.whatsapp, whatsappOrderText)} target="_blank" rel="noopener noreferrer">
                הזמנה בוואטסאפ
              </a>
            </Button>

            <button type="button" onClick={clearCart} className="w-full text-center text-xs text-[#6B5A45] hover:text-red-500 mt-4 font-body transition-colors">
              ריקון העגלה
            </button>
          </div>
        </div>

        {/* Back */}
        <Button asChild variant="ghost" className="font-body text-[#6B5A45] hover:text-gold mt-8">
          <Link to="/catalog">
            <ArrowRight className="h-4 w-4 ml-2" aria-hidden="true" />
            המשך קניות
          </Link>
        </Button>
      </div>
    </div>
  );
}
