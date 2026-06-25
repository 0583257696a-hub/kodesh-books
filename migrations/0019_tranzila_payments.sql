CREATE TABLE IF NOT EXISTS payment_transactions (
  id TEXT PRIMARY KEY NOT NULL,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'tranzila',
  provider_transaction_id TEXT,
  provider_confirmation_code TEXT,
  terminal_name TEXT,
  transaction_mode TEXT NOT NULL DEFAULT 'V',
  transaction_type TEXT NOT NULL DEFAULT 'j5_verification',
  currency TEXT NOT NULL DEFAULT '1',
  amount REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'initiated' CHECK (status IN (
    'initiated',
    'redirect_created',
    'verification_pending',
    'verified',
    'verification_failed',
    'capture_pending',
    'captured',
    'capture_failed',
    'cancelled'
  )),
  request_json TEXT NOT NULL DEFAULT '{}',
  response_json TEXT NOT NULL DEFAULT '{}',
  notify_payload_json TEXT NOT NULL DEFAULT '{}',
  error_message TEXT,
  verified_at TEXT,
  captured_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_order_id ON payment_transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_provider_transaction_id ON payment_transactions(provider_transaction_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON payment_transactions(status);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_created_at ON payment_transactions(created_at);
