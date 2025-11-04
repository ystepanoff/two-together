CREATE TABLE IF NOT EXISTS _migrations (
  id SERIAL PRIMARY KEY,
  migration_name VARCHAR(255) UNIQUE NOT NULL,
  applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO _migrations (migration_name, applied_at)
VALUES
  ('migration-001-add-couples-and-voting.sql', CURRENT_TIMESTAMP),
  ('migration-002-add-background-image.sql', CURRENT_TIMESTAMP),
  ('migration-003-add-admin-features.sql', CURRENT_TIMESTAMP),
  ('migration-004-add-calendar-events.sql', CURRENT_TIMESTAMP),
  ('migration-005-add-calendar-token.sql', CURRENT_TIMESTAMP),
  ('migration-006-add-google-calendar-tokens.sql', CURRENT_TIMESTAMP)
ON CONFLICT (migration_name) DO NOTHING;
