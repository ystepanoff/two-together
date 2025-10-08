-- Create database
CREATE DATABASE twotogether;

-- Connect to the database
\c twotogether;

-- Users table
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  partner_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Couples table to track partner relationships
CREATE TABLE couples (
  id SERIAL PRIMARY KEY,
  user1_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  user2_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user1_id, user2_id)
);

-- Date ideas table (shared between partners)
CREATE TABLE date_ideas (
  id SERIAL PRIMARY KEY,
  couple_id INTEGER REFERENCES couples(id) ON DELETE CASCADE,
  created_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  is_completed BOOLEAN DEFAULT FALSE,
  is_favorite BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP
);

-- Votes for moving date ideas to "should do again"
CREATE TABLE date_idea_votes (
  id SERIAL PRIMARY KEY,
  date_idea_id INTEGER REFERENCES date_ideas(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(date_idea_id, user_id)
);

-- Should do again list table (shared between partners)
CREATE TABLE should_do_again (
  id SERIAL PRIMARY KEY,
  couple_id INTEGER REFERENCES couples(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  original_date_idea_id INTEGER REFERENCES date_ideas(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_date_ideas_couple_id ON date_ideas(couple_id);
CREATE INDEX idx_should_do_again_couple_id ON should_do_again(couple_id);
CREATE INDEX idx_date_idea_votes_date_idea_id ON date_idea_votes(date_idea_id);
CREATE INDEX idx_date_idea_votes_user_id ON date_idea_votes(user_id);
