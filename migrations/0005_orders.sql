CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY NOT NULL,
  base44_id TEXT UNIQUE,
  order_number TEXT UNIQUE,
  customer_id TEXT REFERENCES customers(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  city TEXT NOT NULL,
  shipping_address TEXT NOT NULL,
  subtotal REAL NOT NULL DEFAULT 0,
  shipping_cost REAL NOT NULL DEFAULT 0,
  shipping_method TEXT,
  discount_total REAL NOT NULL DEFAULT 0,
  coupon_id TEXT,
  coupon_code TEXT,
  total REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'pending_approval', 'approved', 'pending', 'confirmed', 'shipped', 'delivered', 'cancelled')),
  payment_status TEXT,
  payment_method TEXT,
  payment_reference TEXT,
  stock_reserved INTEGER NOT NULL DEFAULT 0 CHECK (stock_reserved IN (0, 1)),
  stock_restored INTEGER NOT NULL DEFAULT 0 CHECK (stock_restored IN (0, 1)),
  stock_reservations_json TEXT NOT NULL DEFAULT '[]',
  notes TEXT,
  internal_notes TEXT,
  approved_at TEXT,
  delivered_at TEXT,
  cancelled_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer_email ON orders(customer_email);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);

