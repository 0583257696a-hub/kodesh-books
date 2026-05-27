import React from 'react';
import HeroSection from '@/components/home/HeroSection';
import CategoriesSection from '@/components/home/CategoriesSection';
import FeaturedProducts from '@/components/home/FeaturedProducts';
import PromoBanner from '@/components/home/PromoBanner';
import TestimonialsSection from '@/components/home/TestimonialsSection';

export default function Home() {
  return (
    <div>
      <HeroSection />
      <CategoriesSection />
      <FeaturedProducts />
      <PromoBanner />
      <TestimonialsSection />
    </div>
  );
}