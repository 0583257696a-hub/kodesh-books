ALTER TABLE customers ADD COLUMN email_verification_code_hash TEXT;
ALTER TABLE customers ADD COLUMN email_verification_expires_at TEXT;
ALTER TABLE customers ADD COLUMN email_verification_sent_at TEXT;
ALTER TABLE customers ADD COLUMN email_verification_attempts INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_customers_email_verification_expires_at
  ON customers(email_verification_expires_at);
