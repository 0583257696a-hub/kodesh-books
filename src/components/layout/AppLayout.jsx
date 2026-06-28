import React, { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import CookieConsent from './CookieConsent';
import StoreChatBot from '@/components/chat/StoreChatBot';
import CartDrawer from '@/components/cart/CartDrawer';
import { normalizeBooleanValue, useSiteSettings } from '@/hooks/useSiteSettings';

const SITE_URL = 'https://otzar-hakodesh.shop';
const OG_IMAGE = `${SITE_URL}/images/otzar-logo-transparent.png`;

function setMeta(selector, attributes) {
  let element = document.head.querySelector(selector);
  if (!element) {
    element = document.createElement('meta');
    document.head.appendChild(element);
  }
  Object.entries(attributes).forEach(([key, value]) => {
    element.setAttribute(key, value);
  });
}

function setLink(selector, attributes) {
  let element = document.head.querySelector(selector);
  if (!element) {
    element = document.createElement('link');
    document.head.appendChild(element);
  }
  Object.entries(attributes).forEach(([key, value]) => {
    element.setAttribute(key, value);
  });
}

function syncGoogleAnalytics(measurementId) {
  const cleanId = String(measurementId || '').trim();
  const existingScript = document.getElementById('google-analytics-script');
  const existingInline = document.getElementById('google-analytics-inline');

  if (!cleanId) {
    existingScript?.remove();
    existingInline?.remove();
    return;
  }

  if (!existingScript) {
    const script = document.createElement('script');
    script.id = 'google-analytics-script';
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(cleanId)}`;
    document.head.appendChild(script);
  } else if (!existingScript.src.includes(cleanId)) {
    existingScript.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(cleanId)}`;
  }

  if (!existingInline) {
    const inline = document.createElement('script');
    inline.id = 'google-analytics-inline';
    inline.text = `
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', '${cleanId}');
    `;
    document.head.appendChild(inline);
  }
}

function syncPoptinPixel(pixelId, enabled) {
  const scriptId = 'pixel-script-poptin';
  const cleanId = String(pixelId || '').trim();
  const existingScript = document.getElementById(scriptId);

  if (!normalizeBooleanValue(enabled) || !cleanId) {
    existingScript?.remove();
    return;
  }

  const src = `https://cdn.popt.in/pixel.js?id=${encodeURIComponent(cleanId)}`;
  if (!existingScript) {
    const script = document.createElement('script');
    script.id = scriptId;
    script.src = src;
    script.async = true;
    document.head.appendChild(script);
    return;
  }

  if (existingScript.src !== src) {
    existingScript.src = src;
  }
}

export default function AppLayout() {
  const { settings } = useSiteSettings();
  const location = useLocation();

  useEffect(() => {
    if (['/accessibility', '/terms', '/privacy', '/shipping-returns'].includes(location.pathname)) return;

    const title = settings.seo_title || `${settings.store_name} | ספרי קודש לבית היהודי`;
    const description = settings.seo_description || 'אוצר הקדושה - חנות ספרי קודש, גמרות ומשניות, הלכה, חסידות וקבלה, ספרי ילדים ונוער ומוצרים לבית היהודי.';
    const canonicalUrl = `${SITE_URL}${location.pathname === '/' ? '/' : location.pathname}`;

    document.title = title;
    setMeta('meta[name="description"]', { name: 'description', content: description });
    setMeta('meta[name="robots"]', { name: 'robots', content: 'index, follow' });
    setMeta('meta[property="og:type"]', { property: 'og:type', content: 'website' });
    setMeta('meta[property="og:locale"]', { property: 'og:locale', content: 'he_IL' });
    setMeta('meta[property="og:site_name"]', { property: 'og:site_name', content: settings.store_name || 'אוצר הקדושה' });
    setMeta('meta[property="og:title"]', { property: 'og:title', content: title });
    setMeta('meta[property="og:description"]', { property: 'og:description', content: description });
    setMeta('meta[property="og:url"]', { property: 'og:url', content: canonicalUrl });
    setMeta('meta[property="og:image"]', { property: 'og:image', content: OG_IMAGE });
    setMeta('meta[name="twitter:card"]', { name: 'twitter:card', content: 'summary_large_image' });
    setMeta('meta[name="twitter:title"]', { name: 'twitter:title', content: title });
    setMeta('meta[name="twitter:description"]', { name: 'twitter:description', content: description });
    setMeta('meta[name="twitter:image"]', { name: 'twitter:image', content: OG_IMAGE });
    setLink('link[rel="canonical"]', { rel: 'canonical', href: canonicalUrl });
  }, [location.pathname, settings.seo_description, settings.seo_title, settings.store_name]);

  useEffect(() => {
    syncGoogleAnalytics(settings.google_analytics_id);
  }, [settings.google_analytics_id]);

  useEffect(() => {
    syncPoptinPixel(settings.poptin_pixel_id, settings.enable_poptin_pixel);
  }, [settings.enable_poptin_pixel, settings.poptin_pixel_id]);

  return (
    <div className="min-h-screen flex flex-col bg-cream">
      <a href="#main-content" className="skip-link">
        דלג לתוכן המרכזי
      </a>
      <Header />
      <main id="main-content" className="flex-1" tabIndex={-1}>
        <Outlet />
      </main>
      <Footer />
      <CookieConsent />
      <CartDrawer />
      <StoreChatBot />
    </div>
  );
}
