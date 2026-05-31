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
  top_banner: 'משלוח חינם בהזמנה מעל ₪200',
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
