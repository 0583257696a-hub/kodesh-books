import React, { createContext, useContext, useState, useEffect } from 'react';
import { trackEcommerceEvent } from '@/lib/ecommerceTracking';
import { syncCart } from '@/services/cartService';

const CartContext = createContext();

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    const saved = localStorage.getItem('otzar_cart');
    return saved ? JSON.parse(saved) : [];
  });
  const [isCartOpen, setIsCartOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('otzar_cart', JSON.stringify(items));
    syncCart(items).catch((error) => {
      console.warn('Cart sync failed:', error);
    });
  }, [items]);

  const addItem = (product) => {
    trackEcommerceEvent({
      event_type: 'add_to_cart',
      product_id: product.id,
      product_name: product.name,
      value: product.sale_price || product.price || 0,
    });

    setItems(prev => {
      const existing = prev.find(i => i.product_id === product.id);
      if (existing) {
        return prev.map(i => i.product_id === product.id ? { ...i, quantity: i.quantity + 1, free_shipping: i.free_shipping || !!product.free_shipping } : i);
      }
      return [...prev, {
        product_id: product.id,
        product_name: product.name,
        price: product.sale_price || product.price,
        image_url: product.image_url,
        quantity: 1,
        free_shipping: !!product.free_shipping,
      }];
    });
    setIsCartOpen(true);
  };

  const removeItem = (productId) => {
    setItems(prev => prev.filter(i => i.product_id !== productId));
  };

  const updateQuantity = (productId, quantity) => {
    if (quantity <= 0) {
      removeItem(productId);
      return;
    }
    setItems(prev => prev.map(i => i.product_id === productId ? { ...i, quantity } : i));
  };

  const clearCart = () => setItems([]);

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
  const totalPrice = items.reduce((sum, i) => sum + (i.price * i.quantity), 0);
  const openCart = () => setIsCartOpen(true);
  const closeCart = () => setIsCartOpen(false);

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateQuantity, clearCart, totalItems, totalPrice, isCartOpen, openCart, closeCart }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
