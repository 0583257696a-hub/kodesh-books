import React from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import ProductCard from '@/components/shared/ProductCard';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function FeaturedProducts() {
  const { data: products = [], isLoading } = useQuery({
    queryKey: ['featured-products'],
    queryFn: () => base44.entities.Product.filter({ is_featured: true }, '-created_date', 8),
  });

  return (
    <section className="py-20 px-4 bg-white/50">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-end justify-between mb-14">
          <div>
            <span className="text-gold font-body text-sm tracking-widest">הנבחרים שלנו</span>
            <h2 className="font-heading text-4xl md:text-5xl font-bold mt-3 text-foreground">מוצרים מובילים</h2>
            <div className="w-20 h-0.5 bg-gold mt-4" />
          </div>
          <Link to="/catalog">
            <Button variant="ghost" className="text-gold hover:text-gold/80 font-body hidden md:flex">
              לכל המוצרים
              <ArrowLeft className="h-4 w-4 mr-2" />
            </Button>
          </Link>
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {Array(8).fill(0).map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="aspect-[3/4] w-full rounded-xl" />
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-4 w-1/3" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {products.map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}

        {/* Mobile CTA */}
        <div className="text-center mt-10 md:hidden">
          <Link to="/catalog">
            <Button className="bg-gold text-walnut hover:bg-gold/90 font-body px-8 py-3">
              לכל המוצרים
              <ArrowLeft className="h-4 w-4 mr-2" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}