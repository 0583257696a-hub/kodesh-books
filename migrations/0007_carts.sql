CREATE TABLE IF NOT EXISTS carts (
  id TEXT PRIMARY KEY NOT NULL,
  customer_id TEXT REFERENCES customers(id) ON DELETE SET NULL,
  visitor_id TEXT,
  session_id TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'checkout_started', 'abandoned', 'converted', 'expired')),
  subtotal REAL NOT NULL DEFAULT 0,
  total REAL NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'ILS',
  converted_order_id TEXT REFERENCES orders(id) ON DELETE SET NULL,
  expires_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_carts_customer_id ON carts(customer_id);
CREATE INDEX IF NOT EXISTS idx_carts_visitor_id ON carts(visitor_id);
CREATE INDEX IF NOT EXISTS idx_carts_status ON carts(status);

