import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import { useSiteSettings } from '@/hooks/useSiteSettings';

export default function AppLayout() {
  const { settings } = useSiteSettings();

  useEffect(() => {
    document.title = settings.seo_title || settings.store_name;

    let description = document.querySelector('meta[name="description"]');
    if (!description) {
      description = document.createElement('meta');
      description.setAttribute('name', 'description');
      document.head.appendChild(description);
    }
    description.setAttribute('content', settings.seo_description || '');
  }, [settings.seo_description, settings.seo_title, settings.store_name]);

  return (
    <div className="min-h-screen flex flex-col bg-cream">
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
