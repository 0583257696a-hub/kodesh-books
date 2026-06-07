import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

export const DEFAULT_SITE_SETTINGS = {
  store_name: 'אוצר הקדושה',
  phone: '03-123-4567',
  whatsapp: '050-123-4567',
  email: 'info@otzar-hakodesh.co.il',
  address: 'רחוב הרב קוק 12, ירושלים',
  seo_title: 'אוצר הקדושה | ספרי קודש',
  seo_description: 'החנות המובילה לספרי קודש, תשמישי קדושה ומתנות יהודיות.',
  facebook: '',
  instagram: '',
  top_banner: 'משלוחים לכל הארץ',
  shipping_cost: '30',
  free_shipping_threshold: '0',
  admin_email: 'info@otzar-hakodesh.co.il',
  enable_order_emails: 'true',
  enable_approval_emails: 'true',
  enable_delivery_emails: 'true',
  enable_abandoned_cart_emails: 'false',
  enforce_stock_limit: 'false',
};

export function settingsArrayToMap(settings = []) {
  return settings.reduce((map, setting) => {
    if (setting?.key) {
      map[setting.key] = setting.value || '';
    }
    return map;
  }, {});
}

export function useSiteSettings() {
  const query = useQuery({
    queryKey: ['site-settings'],
    queryFn: () => base44.entities.SiteSettings.list(),
    staleTime: 1000 * 60 * 5,
  });

  return {
    ...query,
    settings: {
      ...DEFAULT_SITE_SETTINGS,
      ...settingsArrayToMap(query.data || []),
    },
  };
}

export function normalizeWhatsappNumber(value = '') {
  const digits = String(value).replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('972')) return digits;
  if (digits.startsWith('0')) return `972${digits.slice(1)}`;
  return digits;
}

export function buildWhatsappUrl(number, text = '') {
  const normalized = normalizeWhatsappNumber(number);
  if (!normalized) return '#';
  const message = text ? `?text=${encodeURIComponent(text)}` : '';
  return `https://wa.me/${normalized}${message}`;
}

export function normalizePhoneNumber(value = '') {
  return String(value).replace(/[^\d+]/g, '');
}

export function buildPhoneUrl(number) {
  const normalized = normalizePhoneNumber(number);
  return normalized ? `tel:${normalized}` : '#';
}

export function buildMailUrl(email, subject = '') {
  const cleanEmail = String(email || '').trim();
  if (!cleanEmail) return '#';
  const query = subject ? `?subject=${encodeURIComponent(subject)}` : '';
  return `mailto:${cleanEmail}${query}`;
}

export function getShippingCost(settings = DEFAULT_SITE_SETTINGS, subtotal = 0) {
  const cost = Number(settings.shipping_cost ?? DEFAULT_SITE_SETTINGS.shipping_cost) || 0;
  const freeThreshold = Number(settings.free_shipping_threshold ?? DEFAULT_SITE_SETTINGS.free_shipping_threshold) || 0;
  if (freeThreshold > 0 && subtotal >= freeThreshold) return 0;
  return cost;
}
