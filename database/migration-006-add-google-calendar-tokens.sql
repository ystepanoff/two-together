ALTER TABLE users ADD COLUMN IF NOT EXISTS google_access_token TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_refresh_token TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_token_expiry TIMESTAMP;

ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS google_event_id VARCHAR(255);
CREATE INDEX IF NOT EXISTS idx_calendar_events_google_event_id ON calendar_events(google_event_id);
