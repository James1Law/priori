-- Enable Realtime for core tables
-- This ensures sessions, items, and scores sync in real-time across all participants

-- Enable Realtime for sessions table (framework changes, estimation state, etc.)
ALTER PUBLICATION supabase_realtime ADD TABLE sessions;

-- Enable Realtime for items table (backlog_position, roadmap positions, etc.)
ALTER PUBLICATION supabase_realtime ADD TABLE items;

-- Enable Realtime for scores table (RICE, ICE, weighted scores, etc.)
ALTER PUBLICATION supabase_realtime ADD TABLE scores;

-- Note: roadmap_periods and estimation_votes already have Realtime enabled
-- via migrations 006 and 008 respectively.
