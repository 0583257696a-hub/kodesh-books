import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import ProductCard from '@/components/shared/ProductCard';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { motion } from 'framer-motion';
import { listProducts } from '@/services/catalogService';

export default function FeaturedProducts() {
  const { data: products = [], isLoading } = useQuery({
    queryKey: ['featured-products'],
    queryFn: () => listProducts({ featured: true, limit: 8 }),
  });

  return (
    <section className="py-20 px-4 bg-[#FCFAF5]">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex items-end justify-between mb-14"
        >
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="h-px w-12 bg-gold/50" />
              <span className="text-gold font-body text-xs tracking-[0.2em]">הנבחרים שלנו</span>
            </div>
            <h2 className="font-heading text-4xl md:text-5xl font-bold text-[#1F160F]">מוצרים מובילים</h2>
            <div className="flex items-center gap-2 mt-4">
              <div className="h-px w-8 bg-gold/40" />
              <div className="w-2 h-2 rounded-full bg-gold" />
              <div className="h-px w-8 bg-gold/40" />
            </div>
          </div>
          <Link to="/catalog" className="hidden md:block">
            <Button variant="ghost" className="text-[#6B5A45] hover:text-gold font-body gap-1 group transition-colors">
              לכל המוצרים
              <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
            </Button>
          </Link>
        </motion.div>

        {/* Grid */}
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {Array(8).fill(0).map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="aspect-[3/4] w-full rounded-xl" />
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-5 w-1/3" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {products.map((product, i) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06, duration: 0.45 }}
              >
                <ProductCard product={product} />
              </motion.div>
            ))}
          </div>
        )}

        {/* Mobile CTA */}
        <div className="text-center mt-10 md:hidden">
          <Link to="/catalog">
            <Button
              className="font-body px-8 py-3 rounded-lg"
              style={{ background: 'linear-gradient(135deg, #D4AF37, #C99722)', color: '#1F1008' }}
            >
              לכל המוצרים
              <ArrowLeft className="h-4 w-4 mr-2" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
