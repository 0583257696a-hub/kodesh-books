CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY NOT NULL,
  base44_id TEXT UNIQUE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  image_url TEXT,
  r2_key TEXT,
  icon TEXT NOT NULL DEFAULT 'FolderOpen',
  display_order INTEGER NOT NULL DEFAULT 100,
  show_in_home INTEGER NOT NULL DEFAULT 1 CHECK (show_in_home IN (0, 1)),
  show_in_nav INTEGER NOT NULL DEFAULT 1 CHECK (show_in_nav IN (0, 1)),
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_categories_display_order ON categories(display_order);
CREATE INDEX IF NOT EXISTS idx_categories_active ON categories(active);

