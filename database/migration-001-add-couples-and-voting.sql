-- Migration script to update database schema for two-person shared system
-- This script migrates from single-user to couple-based system

-- Step 1: Add partner_id column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS partner_id INTEGER REFERENCES users(id) ON DELETE SET NULL;

-- Step 2: Create couples table
CREATE TABLE IF NOT EXISTS couples (
  id SERIAL PRIMARY KEY,
  user1_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  user2_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user1_id, user2_id)
);

-- Step 3: Create date_idea_votes table
CREATE TABLE IF NOT EXISTS date_idea_votes (
  id SERIAL PRIMARY KEY,
  date_idea_id INTEGER REFERENCES date_ideas(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(date_idea_id, user_id)
);

-- Step 4: Backup existing date_ideas data
CREATE TABLE IF NOT EXISTS date_ideas_backup AS SELECT * FROM date_ideas;

-- Step 5: Alter date_ideas table
-- Drop old constraint and add new columns
ALTER TABLE date_ideas DROP CONSTRAINT IF EXISTS date_ideas_user_id_fkey;
ALTER TABLE date_ideas ADD COLUMN IF NOT EXISTS couple_id INTEGER REFERENCES couples(id) ON DELETE CASCADE;
ALTER TABLE date_ideas ADD COLUMN IF NOT EXISTS created_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;

-- Copy user_id to created_by_user_id for existing records
UPDATE date_ideas SET created_by_user_id = user_id WHERE created_by_user_id IS NULL;

-- Step 6: Backup existing should_do_again data
CREATE TABLE IF NOT EXISTS should_do_again_backup AS SELECT * FROM should_do_again;

-- Step 7: Alter should_do_again table
ALTER TABLE should_do_again DROP CONSTRAINT IF EXISTS should_do_again_user_id_fkey;
ALTER TABLE should_do_again ADD COLUMN IF NOT EXISTS couple_id INTEGER REFERENCES couples(id) ON DELETE CASCADE;

-- Step 8: Create indexes for new tables
CREATE INDEX IF NOT EXISTS idx_date_ideas_couple_id ON date_ideas(couple_id);
CREATE INDEX IF NOT EXISTS idx_should_do_again_couple_id ON should_do_again(couple_id);
CREATE INDEX IF NOT EXISTS idx_date_idea_votes_date_idea_id ON date_idea_votes(date_idea_id);
CREATE INDEX IF NOT EXISTS idx_date_idea_votes_user_id ON date_idea_votes(user_id);

-- Note: After running this migration, you'll need to:
-- 1. Have both users register/login
-- 2. Have them pair with each other using the pairing feature
-- 3. Manually migrate their old date ideas to the new couple_id structure if needed
--
-- For a fresh start, you can drop the old user_id columns from date_ideas and should_do_again:
-- ALTER TABLE date_ideas DROP COLUMN IF EXISTS user_id;
-- ALTER TABLE should_do_again DROP COLUMN IF EXISTS user_id;
