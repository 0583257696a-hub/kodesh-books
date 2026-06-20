CREATE TABLE IF NOT EXISTS analytics_events (
  id TEXT PRIMARY KEY NOT NULL,
  base44_id TEXT UNIQUE,
  event_type TEXT NOT NULL CHECK (event_type IN ('visit', 'product_view', 'cart_add', 'add_to_cart', 'checkout_start', 'checkout_started', 'purchase', 'order_created', 'search')),
  product_id TEXT,
  product_name TEXT,
  customer_id TEXT,
  customer_email TEXT,
  value REAL NOT NULL DEFAULT 0,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  description TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_analytics_events_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_product_id ON analytics_events(product_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_customer_email ON analytics_events(customer_email);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON analytics_events(created_at);
