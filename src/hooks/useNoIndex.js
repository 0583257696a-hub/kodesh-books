import { useEffect } from 'react';
import { setMeta } from '@/lib/pageMeta';

// Account, admin, cart/checkout, and error pages carry no unique indexable
// content and should never compete with real pages in search results.
//
// No dependency array: AppLayout's own meta effect resets robots to
// "index, follow" whenever site settings finish loading (an async change
// that lands after this page has already mounted), so this has to
// re-assert on every render to reliably win last, not just once on mount.
export function useNoIndex() {
  useEffect(() => {
    setMeta('meta[name="robots"]', { name: 'robots', content: 'noindex, nofollow' });
    return () => setMeta('meta[name="robots"]', { name: 'robots', content: 'index, follow' });
  });
}
