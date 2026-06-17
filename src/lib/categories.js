export const CATEGORIES = [
  { id: 'chumashim', name: 'חומשים', icon: 'BookOpen' },
  { id: 'gemarot', name: 'גמרות ומשניות', icon: 'Library' },
  { id: 'halacha', name: 'הלכה', icon: 'Scale' },
  { id: 'chassidut', name: 'חסידות וקבלה', icon: 'Sparkles' },
  { id: 'kids', name: 'ספרי ילדים ונוער', icon: 'Baby' },
  { id: 'musar_machshava', name: 'מוסר ומחשבה', icon: 'BookHeart' },
  { id: 'rav_ovadya_yosef', name: 'ספרי הרב עובדיה יוסף', icon: 'BookOpen' },
  { id: 'chabad', name: 'ספרי חב״ד', icon: 'Sparkles' },
  { id: 'siddurim', name: 'סידורים ומחזורים', icon: 'BookHeart' },
  { id: 'gifts', name: 'מתנות יהודיות', icon: 'Gift' },
  { id: 'other', name: 'שונות', icon: 'Boxes' },
];

export const CATEGORY_MAP = CATEGORIES.reduce((acc, cat) => {
  acc[cat.id] = cat.name;
  return acc;
}, {});

export const CATEGORY_NAME_TO_ID = CATEGORIES.reduce((acc, cat) => {
  acc[cat.name] = cat.id;
  return acc;
}, {
  'ספרי ילדים ונוער': 'kids',
  'ספרי חב"ד': 'chabad',
  'ספרי חב״ד': 'chabad',
  'אחר': 'other',
  'אחרים': 'other',
  'כללי': 'other',
  'שונות': 'other',
});
