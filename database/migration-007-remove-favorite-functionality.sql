-- Remove favorite functionality from date_ideas table
ALTER TABLE date_ideas DROP COLUMN IF EXISTS is_favorite;