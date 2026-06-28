import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Search, User, ShoppingCart, Menu, X, Phone, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useCart } from '@/context/CartContext';
import { motion, AnimatePresence } from 'framer-motion';
import { buildWhatsappUrl, buildPhoneUrl, useSiteSettings } from '@/hooks/useSiteSettings';
import { useStoreCategories } from '@/hooks/useStoreCategories';
import { STORE_LOGO_URL } from '@/lib/branding';

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const { totalItems, openCart } = useCart();
  const { settings } = useSiteSettings();
  const { categories } = useStoreCategories();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchToggleRef = useRef(null);

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

  useEffect(() => {
    if (!searchOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setSearchOpen(false);
        searchToggleRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [searchOpen]);

  const isActiveNavItem = (item) => {
    const [itemPath, itemQuery = ''] = item.path.split('?');
    if (location.pathname !== itemPath) return false;
    if (item.path === '/') return location.pathname === '/';

    const currentParams = new URLSearchParams(location.search);
    const itemParams = new URLSearchParams(itemQuery);

    if (item.path === '/catalog') {
      return !currentParams.has('category') && !currentParams.has('sale') && !currentParams.has('search');
    }

    if (itemParams.has('category')) {
      return currentParams.get('category') === itemParams.get('category');
    }

    if (itemParams.has('sale')) {
      return currentParams.get('sale') === itemParams.get('sale');
    }

    return location.search === itemQuery;
  };

  return (
    <header className="relative z-40 shadow-sm" dir="rtl">
      {/* Top announcement bar */}
      <div className="bg-[#1F1008] px-3 py-2 text-center">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 text-xs font-body">
          {settings.phone && (
            <a
              href={buildPhoneUrl(settings.phone)}
              className="hidden md:flex items-center gap-1.5 text-cream/60 hover:text-gold transition-colors"
              aria-label={`טלפון: ${settings.phone}`}
            >
              <Phone className="h-3 w-3 text-gold/60" aria-hidden="true" />
              <span>{settings.phone}</span>
            </a>
          )}
          <p className="flex-1 text-center text-cream/70">
            <span className="text-gold ml-1">✦</span>
            {settings.top_banner || 'משלוח חינם בקנייה מעל ₪299 | משלוחים עד הבית 2–5 ימי עסקים'}
            <span className="text-gold mr-1">✦</span>
          </p>
          {settings.whatsapp && (
            <a
              href={buildWhatsappUrl(settings.whatsapp, 'שלום, אשמח לקבל עזרה')}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden md:flex items-center gap-1.5 text-cream/60 hover:text-gold transition-colors"
              aria-label="שירות לקוחות בוואטסאפ"
            >
              <MessageCircle className="h-3 w-3 text-gold/60" aria-hidden="true" />
              <span>שירות לקוחות</span>
            </a>
          )}
        </div>
      </div>

      {/* Main header */}
      <div className="bg-[#FCFAF5]/97 backdrop-blur-md border-b border-[#E7D8B8]/60 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4">
          <div className="relative flex h-16 md:h-24 items-center justify-between">
            {/* Right side: Mobile menu + Search + User */}
            <div className="flex items-center gap-1">
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="lg:hidden text-[#3A2415] hover:text-gold hover:bg-gold/8 transition-colors" aria-label="פתח תפריט ניווט" aria-expanded={mobileMenuOpen} aria-controls="mobile-navigation-menu">
                    <Menu className="h-5 w-5" aria-hidden="true" />
                  </Button>
                </SheetTrigger>
                <SheetContent id="mobile-navigation-menu" side="right" className="bg-[#FCFAF5] w-80 border-l border-[#E7D8B8] p-0" dir="rtl">
                  <SheetHeader>
                    <SheetTitle className="sr-only">תפריט ניווט</SheetTitle>
                  </SheetHeader>
                  <div className="flex items-center justify-between p-4 border-b border-[#E7D8B8]">
                    <img src={STORE_LOGO_URL} alt="לוגו אוצר הקדושה" className="h-12 w-auto object-contain" />
                  </div>
                  <nav className="flex flex-col overflow-y-auto" aria-label="תפריט ניווט לנייד">
                    {navItems.map((item) => {
                      const active = isActiveNavItem(item);
                      return (
                        <button
                          key={item.path + item.label}
                          type="button"
                          onClick={() => handleMobileNavigation(item.path)}
                          className={`flex items-center gap-3 px-5 py-3.5 text-right font-body text-sm border-b border-[#E7D8B8]/60 transition-colors ${active ? 'bg-gold/10 text-[#1F160F] font-semibold' : 'text-[#3A2415] hover:bg-gold/5 hover:text-gold'}`}
                          aria-current={active ? 'page' : undefined}
                        >
                          {active && <span className="w-1 h-4 rounded-full bg-gold flex-shrink-0" aria-hidden="true" />}
                          {item.label}
                        </button>
                      );
                    })}
                  </nav>
                  <div className="p-4 mt-2 space-y-2">
                    {settings.phone && (
                      <a href={buildPhoneUrl(settings.phone)} className="flex items-center gap-3 text-sm text-[#6B5A45] hover:text-gold font-body transition-colors">
                        <Phone className="h-4 w-4 text-gold/60" aria-hidden="true" />
                        {settings.phone}
                      </a>
                    )}
                    {settings.whatsapp && (
                      <a href={buildWhatsappUrl(settings.whatsapp, 'שלום, אשמח לקבל עזרה')} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-sm text-[#6B5A45] hover:text-gold font-body transition-colors">
                        <MessageCircle className="h-4 w-4 text-gold/60" aria-hidden="true" />
                        {settings.whatsapp}
                      </a>
                    )}
                  </div>
                </SheetContent>
              </Sheet>

              <Button
                variant="ghost"
                size="icon"
                ref={searchToggleRef}
                onClick={() => setSearchOpen(!searchOpen)}
                className="text-[#3A2415] hover:text-gold hover:bg-gold/8 transition-colors"
                aria-label={searchOpen ? 'סגור חיפוש' : 'פתח חיפוש'}
                aria-expanded={searchOpen}
                aria-controls="site-search"
              >
                <Search className="h-5 w-5" aria-hidden="true" />
              </Button>

              <Button asChild variant="ghost" size="icon" className="text-[#3A2415] hover:text-gold hover:bg-gold/8 transition-colors">
                <Link to="/login" aria-label="כניסה לחשבון">
                  <User className="h-5 w-5" aria-hidden="true" />
                </Link>
              </Button>
            </div>

            {/* Center: Logo */}
            <Link to="/" className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 flex-shrink-0" aria-label="לדף הבית של אוצר הקדושה">
              <img
                src={STORE_LOGO_URL}
                alt={settings.store_name || 'אוצר הקדושה'}
                className="h-12 md:h-20 w-auto object-contain transition-all duration-300"
              />
            </Link>

            {/* Left side: Cart */}
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={openCart}
                className="relative text-[#3A2415] hover:text-gold hover:bg-gold/8 transition-colors"
                aria-label={`עגלת קניות, ${totalItems} מוצרים`}
              >
                <ShoppingCart className="h-5 w-5" aria-hidden="true" />
                {totalItems > 0 && (
                  <span
                    className="absolute -top-1 -right-1 flex items-center justify-center h-5 w-5 rounded-full text-xs font-bold font-body"
                    style={{ background: 'linear-gradient(135deg, #D4AF37, #C99722)', color: '#1F1008' }}
                    aria-hidden="true"
                  >
                    {totalItems}
                  </span>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop navigation */}
      <nav className="hidden lg:block bg-[#FCFAF5] border-b border-[#E7D8B8]/80" aria-label="ניווט ראשי" dir="rtl">
        <div className="max-w-7xl mx-auto px-4">
          <ul className="flex flex-wrap items-center justify-center gap-x-1 py-2">
            {navItems.map((item) => {
              const active = isActiveNavItem(item);
              return (
                <li key={item.path + item.label}>
                  <Link
                    to={item.path}
                    className={`font-body text-sm px-4 py-2 rounded-md transition-all duration-200 relative group ${
                      active ? 'text-[#1F160F] font-semibold bg-gold/10' : 'text-[#3A2415] hover:text-gold hover:bg-gold/6'
                    }`}
                    aria-current={active ? 'page' : undefined}
                  >
                    {item.label}
                    <span className={`absolute bottom-0 left-3 right-3 h-0.5 bg-gold rounded-full transition-opacity ${active ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`} aria-hidden="true" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </nav>

      {/* Search overlay */}
      <AnimatePresence>
        {searchOpen && (
          <motion.div
            id="site-search"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="absolute top-full left-0 right-0 bg-[#FCFAF5] border-b border-[#E7D8B8] shadow-lg z-50 p-4"
            dir="rtl"
          >
            <form onSubmit={handleSearch} className="max-w-2xl mx-auto flex gap-3" role="search">
              <label htmlFor="site-search-input" className="sr-only">חיפוש באתר</label>
              <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6B5A45]" aria-hidden="true" />
                <input
                  id="site-search-input"
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="חפש ספרים, מחברים, נושאים..."
                  className="w-full pr-10 pl-4 py-3 rounded-lg border border-[#E7D8B8] bg-white font-body text-[#1F160F] placeholder:text-[#6B5A45]/60 focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold/40 transition-all"
                  autoFocus
                />
              </div>
              <Button
                type="submit"
                className="font-body px-6 rounded-lg"
                style={{ background: 'linear-gradient(135deg, #D4AF37, #C99722)', color: '#1F1008' }}
              >
                חיפוש
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setSearchOpen(false)}
                className="text-[#6B5A45] hover:text-gold"
                aria-label="סגור חיפוש"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </Button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
