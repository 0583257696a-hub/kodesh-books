CREATE TABLE IF NOT EXISTS imports (
  id TEXT PRIMARY KEY NOT NULL,
  base44_id TEXT UNIQUE,
  file_name TEXT NOT NULL,
  import_type TEXT NOT NULL,
  categories_imported_json TEXT NOT NULL DEFAULT '[]',
  products_created INTEGER NOT NULL DEFAULT 0,
  products_updated INTEGER NOT NULL DEFAULT 0,
  products_skipped INTEGER NOT NULL DEFAULT 0,
  errors_json TEXT NOT NULL DEFAULT '[]',
  user_email TEXT,
  description TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_imports_created_at ON imports(created_at);
CREATE INDEX IF NOT EXISTS idx_imports_type ON imports(import_type);

