import React, { useEffect, useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import ProductCard from '@/components/shared/ProductCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { trackEcommerceEvent } from '@/lib/ecommerceTracking';
import { useStoreCategories } from '@/hooks/useStoreCategories';

export default function Catalog() {
  const location = useLocation();
  const urlParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const initialCategory = urlParams.get('category') || '';
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

  const { data: allProducts = [], isLoading } = useQuery({
    queryKey: ['all-products'],
    queryFn: () => base44.entities.Product.list('-created_date', 200),
  });

  const filteredProducts = useMemo(() => {
    let result = [...allProducts];

    if (selectedCategory) {
      result = result.filter(p => p.category === selectedCategory);
    }
    if (isSale) {
      result = result.filter(p => p.is_on_sale);
    }
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
        metadata: {
          term: searchQuery.trim(),
          results: filteredProducts.length,
          no_results: filteredProducts.length === 0,
        },
      });
    }, 700);

    return () => window.clearTimeout(timer);
  }, [filteredProducts.length, isLoading, searchQuery]);

  const FilterSidebar = () => (
    <div className="space-y-6">
      <div>
        <h3 className="font-heading text-lg font-bold mb-4 text-foreground">קטגוריות</h3>
        <div className="space-y-2">
          <Button
            variant={!selectedCategory ? 'default' : 'ghost'}
            className={`w-full justify-start font-body text-sm ${!selectedCategory ? 'bg-gold text-walnut hover:bg-gold/90' : ''}`}
            onClick={() => setSelectedCategory('')}
          >
            הכל
          </Button>
          {categories.map(cat => (
            <Button
              key={cat.id}
              variant={selectedCategory === cat.id ? 'default' : 'ghost'}
              className={`w-full justify-start font-body text-sm ${selectedCategory === cat.id ? 'bg-gold text-walnut hover:bg-gold/90' : ''}`}
              onClick={() => setSelectedCategory(cat.id)}
            >
              {cat.name}
            </Button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="font-heading text-lg font-bold mb-4 text-foreground">מיון</h3>
        <div className="space-y-2">
          {[
            { value: 'newest', label: 'חדש ביותר' },
            { value: 'price_low', label: 'מחיר: נמוך לגבוה' },
            { value: 'price_high', label: 'מחיר: גבוה לנמוך' },
          ].map(opt => (
            <Button
              key={opt.value}
              variant={sortBy === opt.value ? 'default' : 'ghost'}
              className={`w-full justify-start font-body text-sm ${sortBy === opt.value ? 'bg-gold text-walnut hover:bg-gold/90' : ''}`}
              onClick={() => setSortBy(opt.value)}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-cream">
      {/* Hero */}
      <div className="bg-walnut py-12 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="font-heading text-3xl md:text-4xl font-bold text-cream mb-2">
            {isSale ? 'מבצעים' : selectedCategory ? categoryMap[selectedCategory] : 'קטלוג ספרים'}
          </h1>
          <div className="w-16 h-0.5 bg-gold mx-auto" />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-10">
        {/* Search bar */}
        <div className="flex items-center gap-3 mb-8">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="חיפוש ספרים..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-10 font-body border-gold/20 focus:ring-gold/30"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute left-3 top-1/2 -translate-y-1/2">
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
          </div>

          {/* Mobile filter */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" className="lg:hidden border-gold/20">
                <SlidersHorizontal className="h-4 w-4 ml-2" />
                סינון
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="bg-cream w-80 overflow-y-auto">
              <div className="mt-6">
                <FilterSidebar />
              </div>
            </SheetContent>
          </Sheet>

          <span className="text-sm text-muted-foreground font-body hidden md:block">
            {filteredProducts.length} מוצרים
          </span>
        </div>

        <div className="flex gap-10">
          {/* Desktop sidebar */}
          <aside className="hidden lg:block w-56 flex-shrink-0">
            <FilterSidebar />
          </aside>

          {/* Products */}
          <div className="flex-1">
            {isLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                {Array(9).fill(0).map((_, i) => (
                  <div key={i} className="space-y-3">
                    <Skeleton className="aspect-[3/4] w-full rounded-xl" />
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-4 w-1/3" />
                  </div>
                ))}
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-20">
                <p className="font-heading text-2xl text-muted-foreground">לא נמצאו מוצרים</p>
                <p className="font-body text-muted-foreground mt-2">נסה לשנות את החיפוש או הסינון</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                {filteredProducts.map(product => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
