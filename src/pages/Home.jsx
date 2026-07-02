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
      <PromoBanner placement="home_after_hero" />
      <CategoriesSection />
      <PromoBanner placement="home_after_categories" />
      <FeaturedProducts />
      <PromoBanner />
      <TestimonialsSection />
      <PromoBanner placement="home_after_testimonials" />
    </div>
  );
}
