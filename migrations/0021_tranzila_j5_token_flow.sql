ALTER TABLE orders ADD COLUMN manager_approval_status TEXT NOT NULL DEFAULT 'waiting';
ALTER TABLE orders ADD COLUMN manager_approved_by TEXT;
ALTER TABLE orders ADD COLUMN manager_approved_at TEXT;
ALTER TABLE orders ADD COLUMN tranzila_token TEXT;
ALTER TABLE orders ADD COLUMN card_last4 TEXT;
ALTER TABLE orders ADD COLUMN verified_at TEXT;
ALTER TABLE orders ADD COLUMN charged_at TEXT;
ALTER TABLE orders ADD COLUMN payment_provider TEXT;
ALTER TABLE orders ADD COLUMN payment_error TEXT;
ALTER TABLE orders ADD COLUMN final_amount REAL;
ALTER TABLE orders ADD COLUMN currency TEXT NOT NULL DEFAULT '1';

ALTER TABLE payment_transactions ADD COLUMN payment_stage TEXT NOT NULL DEFAULT 'verification';
ALTER TABLE payment_transactions ADD COLUMN response_code TEXT;
ALTER TABLE payment_transactions ADD COLUMN response_message TEXT;
ALTER TABLE payment_transactions ADD COLUMN tranzila_index TEXT;
ALTER TABLE payment_transactions ADD COLUMN tranzila_token TEXT;
ALTER TABLE payment_transactions ADD COLUMN card_last4 TEXT;
ALTER TABLE payment_transactions ADD COLUMN card_type TEXT;
ALTER TABLE payment_transactions ADD COLUMN card_issuer TEXT;
ALTER TABLE payment_transactions ADD COLUMN card_acquirer TEXT;
ALTER TABLE payment_transactions ADD COLUMN auth_number TEXT;
ALTER TABLE payment_transactions ADD COLUMN raw_payload_json TEXT NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_manager_approval_status ON orders(manager_approval_status);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_payment_stage ON payment_transactions(payment_stage);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_response_code ON payment_transactions(response_code);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_tranzila_index ON payment_transactions(tranzila_index);
