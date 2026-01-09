-- Priori Initial Database Schema
-- Run this in Supabase SQL Editor to create all necessary tables

-- Enable UUID extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Sessions table
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on slug for fast lookups
CREATE INDEX IF NOT EXISTS sessions_slug_idx ON sessions(slug);

-- Items table
CREATE TABLE IF NOT EXISTS items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on session_id for fast filtering
CREATE INDEX IF NOT EXISTS items_session_id_idx ON items(session_id);

-- Create index on position for ordering
CREATE INDEX IF NOT EXISTS items_position_idx ON items(position);

-- Scores table (for future prioritization frameworks)
CREATE TABLE IF NOT EXISTS scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  framework TEXT NOT NULL,
  criteria JSONB NOT NULL DEFAULT '{}',
  calculated_score NUMERIC
);

-- Create index on item_id for fast filtering
CREATE INDEX IF NOT EXISTS scores_item_id_idx ON scores(item_id);

-- Create index on framework for filtering by framework type
CREATE INDEX IF NOT EXISTS scores_framework_idx ON scores(framework);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at on sessions table
CREATE TRIGGER update_sessions_updated_at
  BEFORE UPDATE ON sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE sessions IS 'Prioritization sessions - accessed via unique slug';
COMMENT ON TABLE items IS 'Items to be prioritized within a session';
COMMENT ON TABLE scores IS 'Scores for items based on different prioritization frameworks';

COMMENT ON COLUMN sessions.slug IS 'Unique 6-character alphanumeric identifier for URL';
COMMENT ON COLUMN items.position IS 'Order position for manual sorting';
COMMENT ON COLUMN scores.framework IS 'Framework type: rice, ice, moscow, value_effort, weighted';
COMMENT ON COLUMN scores.criteria IS 'JSON object containing framework-specific scoring data';
