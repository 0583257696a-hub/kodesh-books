import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, User, ShoppingCart, Menu, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useCart } from '@/context/CartContext';
import { motion, AnimatePresence } from 'framer-motion';

const NAV_ITEMS = [
  { label: 'ראשי', path: '/' },
  { label: 'ספרי קודש', path: '/catalog' },
  { label: 'גמרות', path: '/catalog?category=gemarot' },
  { label: 'הלכה', path: '/catalog?category=halacha' },
  { label: 'חסידות', path: '/catalog?category=chassidut' },
  { label: 'ילדים ונוער', path: '/catalog?category=kids' },
  { label: 'מתנות יהודיות', path: '/catalog?category=gifts' },
  { label: 'מבצעים', path: '/catalog?sale=true' },
  { label: 'צור קשר', path: '/contact' },
];

export default function Header() {
  const { totalItems } = useCart();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/catalog?search=${encodeURIComponent(searchQuery)}`;
      setSearchOpen(false);
      setSearchQuery('');
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-cream/95 backdrop-blur-md border-b border-gold/20">
      {/* Top bar */}
      <div className="bg-walnut text-cream text-center py-2 text-sm font-body">
        <span className="text-gold">✦</span> משלוח חינם בהזמנה מעל ₪200 <span className="text-gold">✦</span>
      </div>

      {/* Main header */}
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-20">
          {/* Mobile menu */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="bg-cream w-80">
              <nav className="flex flex-col gap-4 mt-8">
                {NAV_ITEMS.map(item => (
                  <Link key={item.path + item.label} to={item.path} className="text-lg font-heading text-foreground hover:text-gold transition-colors py-2 border-b border-border">
                    {item.label}
                  </Link>
                ))}
              </nav>
            </SheetContent>
          </Sheet>

          {/* Icons right */}
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setSearchOpen(!searchOpen)} className="hover:text-gold transition-colors">
              <Search className="h-5 w-5" />
            </Button>
            <Link to="/login">
              <Button variant="ghost" size="icon" className="hover:text-gold transition-colors">
                <User className="h-5 w-5" />
              </Button>
            </Link>

          </div>

          {/* Logo center */}
          <Link to="/" className="absolute left-1/2 -translate-x-1/2">
            <div className="text-center">
              <h1 className="font-heading text-2xl md:text-3xl font-bold text-foreground leading-tight">אוצר הקדושה</h1>
              <p className="text-xs text-gold font-body tracking-wider">הכל לבית היהודי</p>
            </div>
          </Link>

          {/* Cart */}
          <Link to="/cart" className="relative">
            <Button variant="ghost" size="icon" className="hover:text-gold transition-colors">
              <ShoppingCart className="h-5 w-5" />
              {totalItems > 0 && (
                <span className="absolute -top-1 -right-1 bg-gold text-walnut text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                  {totalItems}
                </span>
              )}
            </Button>
          </Link>
        </div>
      </div>

      {/* Desktop navigation */}
      <nav className="hidden lg:block border-t border-gold/10 bg-cream">
        <div className="max-w-7xl mx-auto px-4">
          <ul className="flex items-center justify-center gap-8 py-3">
            {NAV_ITEMS.map(item => (
              <li key={item.path + item.label}>
                <Link to={item.path} className="font-body text-sm text-foreground hover:text-gold transition-colors relative group">
                  {item.label}
                  <span className="absolute -bottom-1 right-0 w-0 h-0.5 bg-gold transition-all group-hover:w-full" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </nav>

      {/* Search overlay */}
      <AnimatePresence>
        {searchOpen && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="absolute top-full left-0 right-0 bg-cream border-b border-gold/20 p-4 shadow-lg z-50">
            <form onSubmit={handleSearch} className="max-w-2xl mx-auto flex gap-3">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="חפש ספרים, מחברים..."
                className="flex-1 px-4 py-3 rounded-lg border border-gold/30 bg-white focus:outline-none focus:ring-2 focus:ring-gold/50 font-body"
                autoFocus
              />
              <Button type="submit" className="bg-gold text-walnut hover:bg-gold/90 font-body">חיפוש</Button>
              <Button type="button" variant="ghost" size="icon" onClick={() => setSearchOpen(false)}>
                <X className="h-5 w-5" />
              </Button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}