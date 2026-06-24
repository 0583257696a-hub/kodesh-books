ALTER TABLE chat_leads ADD COLUMN source TEXT DEFAULT 'lead';
ALTER TABLE chat_leads ADD COLUMN registration_date TEXT;
ALTER TABLE chat_leads ADD COLUMN last_activity_at TEXT;
ALTER TABLE chat_leads ADD COLUMN cart_value REAL DEFAULT 0;
ALTER TABLE chat_leads ADD COLUMN products_in_cart_json TEXT NOT NULL DEFAULT '[]';
ALTER TABLE chat_leads ADD COLUMN notes TEXT;

CREATE INDEX IF NOT EXISTS idx_chat_leads_status ON chat_leads(status);
CREATE INDEX IF NOT EXISTS idx_chat_leads_last_activity ON chat_leads(last_activity_at);
