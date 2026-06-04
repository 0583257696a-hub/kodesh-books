import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, User, ShoppingCart, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useCart } from '@/context/CartContext';
import { motion, AnimatePresence } from 'framer-motion';
import { useSiteSettings } from '@/hooks/useSiteSettings';
import { useStoreCategories } from '@/hooks/useStoreCategories';
import { STORE_LOGO_URL } from '@/lib/branding';

export default function Header() {
  const navigate = useNavigate();
  const { totalItems } = useCart();
  const { settings } = useSiteSettings();
  const { categories } = useStoreCategories();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const navItems = [
    { label: 'ראשי', path: '/' },
    { label: 'כל הספרים', path: '/catalog' },
    ...categories
      .filter((category) => category.show_in_nav)
      .map((category) => ({ label: category.name, path: `/catalog?category=${category.slug}` })),
    { label: 'מבצעים', path: '/catalog?sale=true' },
    { label: 'צור קשר', path: '/contact' },
  ];

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setSearchOpen(false);
      setSearchQuery('');
      navigate(`/catalog?search=${encodeURIComponent(searchQuery)}`);
    }
  };

  const handleMobileNavigation = (path) => {
    setMobileMenuOpen(false);
    setSearchOpen(false);
    navigate(path);
  };

  return (
    <header className="sticky top-0 z-50 bg-cream/95 backdrop-blur-md border-b border-gold/20">
      {/* Top bar */}
      <div className="bg-walnut text-cream text-center py-2 text-sm font-body">
        <span className="text-gold">✦</span> {settings.top_banner} <span className="text-gold">✦</span>
      </div>

      {/* Main header */}
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-28">
          {/* Mobile menu */}
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden" aria-label="פתיחת תפריט ניווט">
                <Menu className="h-6 w-6" aria-hidden="true" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="bg-cream w-80">
              <nav className="mt-8 flex max-h-[calc(100vh-5rem)] flex-col gap-3 overflow-y-auto pr-1" aria-label="תפריט ניווט לנייד">
                {navItems.map(item => (
                  <button
                    type="button"
                    key={item.path + item.label}
                    onClick={() => handleMobileNavigation(item.path)}
                    className="border-b border-border py-2 text-right font-heading text-lg text-foreground transition-colors hover:text-gold"
                  >
                    {item.label}
                  </button>
                ))}
              </nav>
            </SheetContent>
          </Sheet>

          {/* Icons right */}
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSearchOpen(!searchOpen)}
              className="hover:text-gold transition-colors"
              aria-label={searchOpen ? 'סגירת חיפוש' : 'פתיחת חיפוש'}
              aria-expanded={searchOpen}
              aria-controls="site-search"
            >
              <Search className="h-5 w-5" aria-hidden="true" />
            </Button>
            <Button asChild variant="ghost" size="icon" className="hover:text-gold transition-colors">
              <Link to="/login" aria-label="כניסה לחשבון">
                <User className="h-5 w-5" aria-hidden="true" />
              </Link>
            </Button>

          </div>

          {/* Logo center */}
          <Link to="/" className="absolute left-1/2 -translate-x-1/2">
            <img 
              src={STORE_LOGO_URL}
              alt={settings.store_name} 
              className="h-28 w-auto object-contain md:h-32"
            />
          </Link>

          {/* Cart */}
          <Button asChild variant="ghost" size="icon" className="relative hover:text-gold transition-colors">
            <Link to="/cart" aria-label={`עגלת קניות, ${totalItems} מוצרים`}>
              <ShoppingCart className="h-5 w-5" aria-hidden="true" />
              {totalItems > 0 && (
                <span className="absolute -top-1 -right-1 bg-gold text-walnut text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center" aria-hidden="true">
                  {totalItems}
                </span>
              )}
            </Link>
          </Button>
        </div>
      </div>

      {/* Desktop navigation */}
      <nav className="hidden lg:block border-t border-gold/10 bg-cream" aria-label="ניווט ראשי">
        <div className="max-w-7xl mx-auto px-4">
          <ul className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 py-3">
            {navItems.map(item => (
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
          <motion.div
            id="site-search"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 right-0 bg-cream border-b border-gold/20 p-4 shadow-lg z-50"
          >
            <form onSubmit={handleSearch} className="max-w-2xl mx-auto flex gap-3">
              <label htmlFor="site-search-input" className="sr-only">חיפוש באתר</label>
              <input
                id="site-search-input"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="חפש ספרים, מחברים..."
                className="flex-1 px-4 py-3 rounded-lg border border-gold/30 bg-white font-body"
                autoFocus
              />
              <Button type="submit" className="bg-gold text-walnut hover:bg-gold/90 font-body">חיפוש</Button>
              <Button type="button" variant="ghost" size="icon" onClick={() => setSearchOpen(false)} aria-label="סגירת חיפוש">
                <X className="h-5 w-5" aria-hidden="true" />
              </Button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
