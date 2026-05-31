export const CATEGORIES = [
  { id: 'chumashim', name: 'חומשים', icon: 'BookOpen' },
  { id: 'gemarot', name: 'גמרות ומשניות', icon: 'Library' },
  { id: 'halacha', name: 'הלכה', icon: 'Scale' },
  { id: 'chassidut', name: 'חסידות וקבלה', icon: 'Sparkles' },
  { id: 'kids', name: 'ספרי ילדים', icon: 'Baby' },
  { id: 'siddurim', name: 'סידורים ומחזורים', icon: 'BookHeart' },
  { id: 'tashmishei_kedusha', name: 'תשמישי קדושה', icon: 'Flame' },
  { id: 'gifts', name: 'מתנות יהודיות', icon: 'Gift' },
];

export const CATEGORY_MAP = CATEGORIES.reduce((acc, cat) => {
  acc[cat.id] = cat.name;
  return acc;
}, {});
