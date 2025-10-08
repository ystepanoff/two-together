ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT FALSE;

CREATE TABLE app_settings (
  id SERIAL PRIMARY KEY,
  setting_key VARCHAR(255) UNIQUE NOT NULL,
  setting_value TEXT NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO app_settings (setting_key, setting_value) VALUES ('allow_registration', 'true');
