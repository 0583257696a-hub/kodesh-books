import React, { useEffect, useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import ProductCard from '@/components/shared/ProductCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, SlidersHorizontal, X, ChevronLeft, BookOpen, ArrowUpDown } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { trackEcommerceEvent } from '@/lib/ecommerceTracking';
import { useStoreCategories } from '@/hooks/useStoreCategories';
import { listProducts } from '@/services/catalogService';
import { motion } from 'framer-motion';

const SORT_OPTIONS = [
  { value: 'newest', label: 'חדש ביותר' },
  { value: 'popular', label: 'פופולריות' },
  { value: 'price_low', label: 'מחיר: נמוך לגבוה' },
  { value: 'price_high', label: 'מחיר: גבוה לנמוך' },
];

export default function Catalog() {
  const location = useLocation();
  const navigate = useNavigate();
  const urlParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const initialCategory = urlParams.get('category') === 'children' ? 'kids' : (urlParams.get('category') || '');
  const initialSearch = urlParams.get('search') || '';
  const isSale = urlParams.get('sale') === 'true';

  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [sortBy, setSortBy] = useState('newest');
  const { categories, categoryMap } = useStoreCategories();

  useEffect(() => {
    setSelectedCategory(initialCategory);
    setSearchQuery(initialSearch);
  }, [initialCategory, initialSearch]);

  useEffect(() => {
    if (urlParams.get('category') === 'children') {
      const nextParams = new URLSearchParams(location.search);
      nextParams.set('category', 'kids');
      navigate(`/catalog?${nextParams.toString()}`, { replace: true });
    }
  }, [location.search, navigate, urlParams]);

  const { data: allProducts = [], isLoading } = useQuery({
    queryKey: ['all-products'],
    queryFn: () => listProducts({ limit: 500 }),
  });

  const filteredProducts = useMemo(() => {
    let result = [...allProducts];
    if (selectedCategory) result = result.filter(p => p.category === selectedCategory);
    if (isSale) result = result.filter(p => p.is_on_sale);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(p =>
        p.name?.toLowerCase().includes(q) ||
        p.author?.toLowerCase().includes(q) ||
        p.rabbi?.toLowerCase().includes(q) ||
        p.publisher?.toLowerCase().includes(q) ||
        p.sku?.toLowerCase().includes(q) ||
        p.barcode?.toLowerCase().includes(q) ||
        p.sub_category?.toLowerCase().includes(q) ||
        categoryMap[p.category]?.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q)
      );
    }
    switch (sortBy) {
      case 'price_low': result.sort((a, b) => (a.sale_price || a.price) - (b.sale_price || b.price)); break;
      case 'price_high': result.sort((a, b) => (b.sale_price || b.price) - (a.sale_price || a.price)); break;
      default: break;
    }
    return result;
  }, [allProducts, selectedCategory, searchQuery, sortBy, isSale, categoryMap]);

  useEffect(() => {
    if (!searchQuery.trim() || isLoading) return;
    const timer = window.setTimeout(() => {
      trackEcommerceEvent({
        event_type: 'search',
        metadata: { term: searchQuery.trim(), results: filteredProducts.length, no_results: filteredProducts.length === 0 },
      });
    }, 700);
    return () => window.clearTimeout(timer);
  }, [filteredProducts.length, isLoading, searchQuery]);

  const pageTitle = isSale ? 'מבצעים חמים' : selectedCategory ? (categoryMap[selectedCategory] || selectedCategory) : 'קטלוג ספרים';

  const updateCategoryFilter = (categoryId) => {
    const nextParams = new URLSearchParams(location.search);
    nextParams.delete('sale');

    if (categoryId) {
      nextParams.set('category', categoryId);
    } else {
      nextParams.delete('category');
    }

    if (searchQuery.trim()) {
      nextParams.set('search', searchQuery.trim());
    } else {
      nextParams.delete('search');
    }

    const nextQuery = nextParams.toString();
    navigate(nextQuery ? `/catalog?${nextQuery}` : '/catalog');
  };

  const clearFilters = () => {
    setSelectedCategory('');
    setSearchQuery('');
    navigate('/catalog');
  };

  const FilterSidebar = () => (
    <div className="space-y-7">
      {/* Categories */}
      <div>
        <h3 className="font-heading text-base font-bold mb-4 text-[#1F160F] flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-gold" aria-hidden="true" />
          קטגוריות
        </h3>
        <div className="space-y-1">
          <button
            className={`w-full text-center px-3 py-2.5 rounded-lg font-body text-sm transition-all duration-200 ${!selectedCategory ? 'bg-[#2A160B] text-cream font-semibold' : 'text-[#3A2415] hover:bg-gold/8 hover:text-gold'}`}
            onClick={() => updateCategoryFilter('')}
          >
            <span className="flex items-center justify-center">
              <span>הכל</span>
            </span>
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              className={`w-full text-center px-3 py-2.5 rounded-lg font-body text-sm transition-all duration-200 ${selectedCategory === cat.id ? 'bg-[#2A160B] text-cream font-semibold' : 'text-[#3A2415] hover:bg-gold/8 hover:text-gold'}`}
              onClick={() => updateCategoryFilter(cat.id)}
            >
              <span className="flex items-center justify-center">
                <span>{cat.name}</span>
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Sort */}
      <div>
        <h3 className="font-heading text-base font-bold mb-4 text-[#1F160F] flex items-center gap-2">
          <ArrowUpDown className="h-4 w-4 text-gold" aria-hidden="true" />
          מיון
        </h3>
        <div className="space-y-1">
          {SORT_OPTIONS.map(opt => (
            <button
              key={opt.value}
              className={`w-full text-right px-3 py-2.5 rounded-lg font-body text-sm transition-all duration-200 ${sortBy === opt.value ? 'bg-[#2A160B] text-cream font-semibold' : 'text-[#3A2415] hover:bg-gold/8 hover:text-gold'}`}
              onClick={() => setSortBy(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Clear filters */}
      {(selectedCategory || searchQuery || isSale) && (
        <Button
          variant="outline"
          size="sm"
          className="w-full border-[#E7D8B8] text-[#6B5A45] hover:border-gold/50 hover:text-gold font-body text-xs"
          onClick={clearFilters}
        >
          <X className="h-3 w-3 ml-1" />
          ניקוי סינון
        </Button>
      )}
    </div>
  );

  return (
    <div className="min-h-screen" style={{ background: '#FCFAF5' }} dir="rtl">
      
      {/* Category Banner */}
      <div className="relative bg-[#1F1008] py-14 px-4 overflow-hidden">
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(ellipse at 50% 50%, #D4AF37 0%, transparent 70%)' }} aria-hidden="true" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold/40 to-transparent" aria-hidden="true" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold/20 to-transparent" aria-hidden="true" />

        <div className="max-w-7xl mx-auto text-center relative z-10">
          <h1 className="font-heading text-3xl md:text-5xl font-bold text-cream mb-4">{pageTitle}</h1>
          <div className="flex items-center justify-center gap-2 mb-5">
            <div className="h-px w-8 bg-gold/40" aria-hidden="true" />
            <div className="w-1.5 h-1.5 rounded-full bg-gold" aria-hidden="true" />
            <div className="h-px w-8 bg-gold/40" aria-hidden="true" />
          </div>
          {/* Breadcrumbs */}
          <nav aria-label="פירורי לחם">
            <ol className="flex items-center justify-center gap-2 font-body text-sm text-cream/50">
              <li><Link to="/" className="hover:text-gold transition-colors">ראשי</Link></li>
              {selectedCategory && (
                <>
                  <li aria-hidden="true"><ChevronLeft className="h-3.5 w-3.5" /></li>
                  <li className="text-gold">{categoryMap[selectedCategory] || selectedCategory}</li>
                </>
              )}
              {isSale && (
                <>
                  <li aria-hidden="true"><ChevronLeft className="h-3.5 w-3.5" /></li>
                  <li className="text-gold">מבצעים</li>
                </>
              )}
              {!selectedCategory && !isSale && (
                <>
                  <li aria-hidden="true"><ChevronLeft className="h-3.5 w-3.5" /></li>
                  <li className="text-gold">קטלוג ספרים</li>
                </>
              )}
            </ol>
          </nav>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Top bar: search + mobile filter + count */}
        <div className="flex items-center gap-3 mb-8">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6B5A45]" aria-hidden="true" />
            <Input
              placeholder="חיפוש בקטגוריה..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-10 font-body border-[#E7D8B8] bg-white text-[#1F160F] focus:ring-gold/30 focus:border-gold/40 rounded-lg"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B5A45] hover:text-gold transition-colors" aria-label="נקה חיפוש">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Mobile filter button */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" className="lg:hidden border-[#E7D8B8] text-[#3A2415] hover:border-gold/50 hover:text-gold font-body gap-2">
                <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
                סינון ומיון
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="bg-[#FCFAF5] w-80 overflow-y-auto border-l border-[#E7D8B8]" dir="rtl">
              <div className="pt-6 px-1">
                <FilterSidebar />
              </div>
            </SheetContent>
          </Sheet>

          {/* Product count */}
          <span className="text-sm text-[#6B5A45] font-body hidden md:block whitespace-nowrap">
            {filteredProducts.length} מוצרים
          </span>
        </div>

        <div className="flex gap-8">
          {/* Desktop sidebar */}
          <aside className="hidden lg:block w-56 flex-shrink-0">
            <div className="bg-white rounded-xl border border-[#E7D8B8] p-5 sticky top-28" style={{ boxShadow: '0 2px 12px rgba(42,22,11,0.05)' }}>
              <FilterSidebar />
            </div>
          </aside>

          {/* Products grid */}
          <div className="flex-1">
            {isLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
                {Array(9).fill(0).map((_, i) => (
                  <div key={i} className="space-y-3">
                    <Skeleton className="aspect-[3/4] w-full rounded-xl" />
                    <Skeleton className="h-3 w-1/2" />
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-5 w-1/3" />
                  </div>
                ))}
              </div>
            ) : filteredProducts.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-24"
              >
                <BookOpen className="h-16 w-16 text-gold/20 mx-auto mb-5" aria-hidden="true" />
                <p className="font-heading text-2xl text-[#3A2415]">לא נמצאו מוצרים</p>
                <p className="font-body text-[#6B5A45] mt-2 text-sm">נסה לשנות את החיפוש או הסינון</p>
                <Button
                  variant="outline"
                  className="mt-6 border-gold/40 text-[#3A2415] hover:border-gold hover:text-gold font-body"
                  onClick={clearFilters}
                >
                  הצג את כל המוצרים
                </Button>
              </motion.div>
            ) : (
              <>
                <p className="text-xs text-[#6B5A45] font-body mb-4 md:hidden">{filteredProducts.length} מוצרים</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-5">
                  {filteredProducts.map((product, i) => (
                    <motion.div
                      key={product.id}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(i * 0.04, 0.4), duration: 0.35 }}
                    >
                      <ProductCard product={product} />
                    </motion.div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
