-- Optional local seed for Phase 3 public catalog testing.
-- Do not apply this to production if real catalog data already exists.

INSERT OR IGNORE INTO categories (
  id,
  name,
  slug,
  description,
  icon,
  display_order,
  show_in_home,
  show_in_nav,
  active
) VALUES
  ('cat_chumashim', 'חומשים', 'chumashim', 'חומשים ומקראות גדולות', 'BookOpen', 10, 1, 1, 1),
  ('cat_halacha', 'הלכה', 'halacha', 'ספרי הלכה ושו"ת', 'Scale', 20, 1, 1, 1),
  ('cat_siddurim', 'סידורים ומחזורים', 'siddurim', 'סידורים, מחזורים ותפילה', 'BookHeart', 30, 1, 1, 1);

INSERT OR IGNORE INTO products (
  id,
  name,
  slug,
  description,
  author,
  publisher,
  category_id,
  category_slug,
  price,
  sale_price,
  stock_quantity,
  language,
  is_new,
  is_on_sale,
  is_featured,
  in_stock,
  tags_json
) VALUES
  (
    'seed_product_chumash',
    'חומש מקראות גדולות',
    'chumash-mikraot-gedolot',
    'חומש לתצוגת בדיקה לאחר מעבר קטלוג ל-D1.',
    '',
    'מהדורת דוגמה',
    'cat_chumashim',
    'chumashim',
    89,
    NULL,
    20,
    'he',
    1,
    0,
    1,
    1,
    '["חומש","מקראות גדולות"]'
  ),
  (
    'seed_product_halacha',
    'ילקוט יוסף - שבת',
    'yalkut-yosef-shabbat',
    'ספר הלכה לדוגמה לצורך בדיקת חיפוש, קטגוריות וכרטיסי מוצר.',
    'הרב עובדיה יוסף',
    'מהדורת דוגמה',
    'cat_halacha',
    'halacha',
    72,
    65,
    12,
    'he',
    0,
    1,
    1,
    1,
    '["הלכה","שבת"]'
  ),
  (
    'seed_product_siddur',
    'סידור תפילת ישרים',
    'siddur-tefilat-yesharim',
    'סידור דוגמה לבדיקת קטלוג ציבורי.',
    '',
    'מהדורת דוגמה',
    'cat_siddurim',
    'siddurim',
    39,
    NULL,
    30,
    'he',
    0,
    0,
    0,
    1,
    '["סידור","תפילה"]'
  );
