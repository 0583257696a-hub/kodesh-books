ALTER TABLE products ADD COLUMN free_shipping INTEGER NOT NULL DEFAULT 0 CHECK (free_shipping IN (0, 1));

CREATE INDEX IF NOT EXISTS idx_products_free_shipping ON products(free_shipping);
