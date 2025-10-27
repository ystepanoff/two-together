CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE couples ADD COLUMN IF NOT EXISTS calendar_token VARCHAR(255) UNIQUE;

CREATE OR REPLACE FUNCTION generate_calendar_token()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.calendar_token IS NULL THEN
    NEW.calendar_token = encode(gen_random_bytes(32), 'hex');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_calendar_token_on_insert ON couples;

CREATE TRIGGER set_calendar_token_on_insert
BEFORE INSERT ON couples
FOR EACH ROW
EXECUTE FUNCTION generate_calendar_token();

UPDATE couples SET calendar_token = encode(gen_random_bytes(32), 'hex')
WHERE calendar_token IS NULL;
