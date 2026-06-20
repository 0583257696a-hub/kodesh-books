CREATE TABLE IF NOT EXISTS product_images (
  id TEXT PRIMARY KEY NOT NULL,
  product_id TEXT,
  base44_url TEXT,
  image_key TEXT NOT NULL UNIQUE,
  image_url TEXT NOT NULL,
  alt_text TEXT,
  file_name TEXT,
  content_type TEXT,
  image_role TEXT NOT NULL DEFAULT 'gallery' CHECK (image_role IN ('main', 'gallery')),
  sort_order INTEGER NOT NULL DEFAULT 100,
  width INTEGER,
  height INTEGER,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON product_images(product_id);
CREATE INDEX IF NOT EXISTS idx_product_images_image_key ON product_images(image_key);
CREATE INDEX IF NOT EXISTS idx_product_images_role_sort ON product_images(product_id, image_role, sort_order);
