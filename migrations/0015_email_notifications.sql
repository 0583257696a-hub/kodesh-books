DROP TABLE IF EXISTS email_logs_new;

CREATE TABLE email_logs_new (
  id TEXT PRIMARY KEY NOT NULL,
  base44_id TEXT UNIQUE,
  dedupe_key TEXT UNIQUE,
  type TEXT NOT NULL,
  recipient TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  provider TEXT NOT NULL DEFAULT 'resend',
  provider_message_id TEXT,
  related_type TEXT NOT NULL DEFAULT 'order',
  related_id TEXT,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  sent_at TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

INSERT INTO email_logs_new (
  id,
  base44_id,
  type,
  recipient,
  subject,
  body,
  status,
  provider,
  related_id,
  error_message,
  created_at,
  updated_at
)
SELECT
  id,
  base44_id,
  type,
  recipient,
  subject,
  body,
  CASE status WHEN 'queued' THEN 'pending' ELSE status END,
  COALESCE(provider, 'resend'),
  related_id,
  error,
  created_at,
  updated_at
FROM email_logs;

DROP TABLE email_logs;
ALTER TABLE email_logs_new RENAME TO email_logs;

CREATE INDEX IF NOT EXISTS idx_email_logs_status ON email_logs(status);
CREATE INDEX IF NOT EXISTS idx_email_logs_type ON email_logs(type);
CREATE INDEX IF NOT EXISTS idx_email_logs_related_id ON email_logs(related_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_dedupe_key ON email_logs(dedupe_key);
CREATE INDEX IF NOT EXISTS idx_email_logs_sent_at ON email_logs(sent_at);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY NOT NULL,
  type TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'email',
  recipient TEXT,
  title TEXT NOT NULL,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'read')),
  related_type TEXT NOT NULL DEFAULT 'order',
  related_id TEXT,
  email_log_id TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_related_id ON notifications(related_id);
CREATE INDEX IF NOT EXISTS idx_notifications_email_log_id ON notifications(email_log_id);
