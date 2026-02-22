-- TURFUP Database Schema
-- Run this SQL in your PostgreSQL database

-- Drop tables if they exist (be careful in production!)
DROP TABLE IF EXISTS players CASCADE;
DROP TABLE IF EXISTS matches CASCADE;

-- Create matches table
CREATE TABLE matches (
  id SERIAL PRIMARY KEY,
  location VARCHAR(255) NOT NULL,
  date DATE NOT NULL,
  time TIME,
  players_needed INTEGER NOT NULL CHECK (players_needed > 0 AND players_needed <= 20),
  creator_name VARCHAR(255) NOT NULL,
  creator_contact VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create players table
CREATE TABLE players (
  id SERIAL PRIMARY KEY,
  match_id INTEGER NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  contact VARCHAR(255) NOT NULL,
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_matches_date ON matches(date);
CREATE INDEX idx_matches_created_at ON matches(created_at);
CREATE INDEX idx_players_match_id ON players(match_id);

-- Add unique constraint to prevent duplicate joins
CREATE UNIQUE INDEX idx_unique_player_per_match ON players(match_id, name);

-- Insert some test data (optional - remove in production)
INSERT INTO matches (location, date, time, players_needed, creator_name, creator_contact)
VALUES 
  ('Imphal Stadium', '2026-02-25', '18:00', 5, 'Rahul Kumar', '+91 9876543210'),
  ('Shillong Sports Complex', '2026-02-26', '17:30', 8, 'Priya Singh', '@priya_sports');

-- Verify tables were created
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
