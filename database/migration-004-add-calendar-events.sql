CREATE TABLE calendar_events (
  id SERIAL PRIMARY KEY,
  couple_id INTEGER REFERENCES couples(id) ON DELETE CASCADE NOT NULL,
  date_idea_id INTEGER REFERENCES date_ideas(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  start_datetime TIMESTAMP NOT NULL,
  end_datetime TIMESTAMP NOT NULL,
  is_all_day BOOLEAN DEFAULT FALSE,
  created_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_calendar_events_couple_id ON calendar_events(couple_id);
CREATE INDEX idx_calendar_events_date_range ON calendar_events(start_datetime, end_datetime);
CREATE INDEX idx_calendar_events_date_idea_id ON calendar_events(date_idea_id);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_calendar_events_updated_at BEFORE UPDATE
ON calendar_events FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
