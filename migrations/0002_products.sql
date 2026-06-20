CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY NOT NULL,
  base44_id TEXT UNIQUE,
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  description TEXT,
  long_description TEXT,
  author TEXT,
  rabbi TEXT,
  publisher TEXT,
  sku TEXT,
  barcode TEXT,
  category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
  category_slug TEXT NOT NULL,
  sub_category TEXT,
  additional_categories_json TEXT NOT NULL DEFAULT '[]',
  price REAL NOT NULL DEFAULT 0,
  sale_price REAL,
  cost_price REAL,
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  weight REAL,
  language TEXT,
  image_url TEXT,
  gallery_urls_json TEXT NOT NULL DEFAULT '[]',
  tags_json TEXT NOT NULL DEFAULT '[]',
  seo_title TEXT,
  meta_description TEXT,
  imported_at TEXT,
  is_new INTEGER NOT NULL DEFAULT 0 CHECK (is_new IN (0, 1)),
  is_on_sale INTEGER NOT NULL DEFAULT 0 CHECK (is_on_sale IN (0, 1)),
  is_featured INTEGER NOT NULL DEFAULT 0 CHECK (is_featured IN (0, 1)),
  in_stock INTEGER NOT NULL DEFAULT 1 CHECK (in_stock IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_products_category_slug ON products(category_slug);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
CREATE INDEX IF NOT EXISTS idx_products_featured ON products(is_featured);
CREATE INDEX IF NOT EXISTS idx_products_in_stock ON products(in_stock);

