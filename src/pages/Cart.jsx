import React from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '@/context/CartContext';
import { Button } from '@/components/ui/button';
import { Trash2, Minus, Plus, ShoppingCart, ArrowRight, BookOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Cart() {
  const { items, removeItem, updateQuantity, totalPrice, clearCart } = useCart();

  if (items.length === 0) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center bg-cream px-4">
        <div className="text-center">
          <ShoppingCart className="h-20 w-20 text-gold/30 mx-auto mb-6" />
          <h1 className="font-heading text-3xl font-bold text-foreground mb-3">העגלה ריקה</h1>
          <p className="font-body text-muted-foreground mb-8">לא הוספת מוצרים עדיין</p>
          <Link to="/catalog">
            <Button className="bg-gold text-walnut hover:bg-gold/90 font-body px-8 py-3">
              לקטלוג הספרים
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream">
      <div className="bg-walnut py-10 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="font-heading text-3xl font-bold text-cream">עגלת קניות</h1>
          <div className="w-16 h-0.5 bg-gold mx-auto mt-3" />
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-10">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Items */}
          <div className="lg:col-span-2 space-y-1">
            <AnimatePresence>
              {items.map(item => (
                <motion.div
                  key={item.product_id}
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -30 }}
                  className="bg-white rounded-xl p-4 shadow-sm border border-gold/10 flex gap-4"
                >
                  {/* Image */}
                  <div className="w-20 h-24 rounded-lg overflow-hidden bg-secondary flex-shrink-0">
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.product_name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <BookOpen className="h-8 w-8 text-gold/20" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="font-heading font-bold text-foreground">{item.product_name}</h3>
                      <p className="text-gold font-body text-sm">₪{item.price}</p>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center border border-gold/20 rounded-lg overflow-hidden">
                        <button onClick={() => updateQuantity(item.product_id, item.quantity - 1)} className="p-2 hover:bg-secondary transition-colors">
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="px-4 font-body font-bold text-sm">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.product_id, item.quantity + 1)} className="p-2 hover:bg-secondary transition-colors">
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="font-heading font-bold">₪{(item.price * item.quantity).toFixed(2)}</span>
                        <button onClick={() => removeItem(item.product_id)} className="text-destructive hover:text-destructive/80 transition-colors">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Summary */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gold/10 h-fit sticky top-28">
            <h2 className="font-heading text-xl font-bold text-foreground mb-6">סיכום הזמנה</h2>

            <div className="space-y-3 font-body text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">סה"כ מוצרים</span>
                <span>{items.reduce((s, i) => s + i.quantity, 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">משלוח</span>
                <span className="text-gold">{totalPrice >= 200 ? 'חינם' : '₪30'}</span>
              </div>
              <div className="border-t border-gold/10 pt-3 flex justify-between">
                <span className="font-heading font-bold text-lg">סה"כ</span>
                <span className="font-heading font-bold text-lg text-gold">₪{(totalPrice + (totalPrice >= 200 ? 0 : 30)).toFixed(2)}</span>
              </div>
            </div>

            <Link to="/checkout">
              <Button className="w-full mt-6 bg-gold text-walnut hover:bg-gold/90 font-body py-5 text-base rounded-lg animate-gold-pulse">
                מעבר לתשלום
              </Button>
            </Link>

            <a href={`https://wa.me/972501234567?text=שלום, אני רוצה להזמין: ${items.map(i => `${i.product_name} (${i.quantity})`).join(', ')}. סה"כ: ₪${totalPrice.toFixed(2)}`} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" className="w-full mt-3 border-gold/30 text-gold hover:bg-gold/10 font-body py-5">
                הזמנה בוואצאפ
              </Button>
            </a>

            <button onClick={clearCart} className="w-full text-center text-xs text-muted-foreground hover:text-destructive mt-4 font-body transition-colors">
              ריקון העגלה
            </button>
          </div>
        </div>

        {/* Back */}
        <Link to="/catalog">
          <Button variant="ghost" className="font-body text-muted-foreground hover:text-gold mt-8">
            <ArrowRight className="h-4 w-4 ml-2" />
            המשך קניות
          </Button>
        </Link>
      </div>
    </div>
  );
}