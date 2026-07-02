export const DEFAULT_BANNER_PLACEMENT = 'home_after_featured';

export const BANNER_PLACEMENTS = [
  {
    value: 'home_after_hero',
    label: 'דף הבית - אחרי אזור הפתיחה',
    recommendedSize: '1920x520px',
  },
  {
    value: 'home_after_categories',
    label: 'דף הבית - אחרי הקטגוריות',
    recommendedSize: '1920x420px',
  },
  {
    value: DEFAULT_BANNER_PLACEMENT,
    label: 'דף הבית - אחרי מוצרים מומלצים',
    recommendedSize: '1920x420px',
  },
  {
    value: 'home_after_testimonials',
    label: 'דף הבית - לפני הפוטר',
    recommendedSize: '1920x420px',
  },
];

export function bannerPlacementLabel(value) {
  return BANNER_PLACEMENTS.find((placement) => placement.value === value)?.label || BANNER_PLACEMENTS[0].label;
}

export function bannerPlacementSize(value) {
  return BANNER_PLACEMENTS.find((placement) => placement.value === value)?.recommendedSize || BANNER_PLACEMENTS[0].recommendedSize;
}
