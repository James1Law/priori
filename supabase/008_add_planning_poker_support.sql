-- Planning Poker Support - Phase 9.1
-- Add tables and columns for team estimation with Planning Poker

-- Add story_points column to items table
ALTER TABLE items
ADD COLUMN IF NOT EXISTS story_points INTEGER;

COMMENT ON COLUMN items.story_points IS 'Final agreed story point estimate from Planning Poker. NULL = not estimated.';

-- Add estimation state columns to sessions table
ALTER TABLE sessions
ADD COLUMN IF NOT EXISTS current_estimation_item_id UUID REFERENCES items(id) ON DELETE SET NULL;

ALTER TABLE sessions
ADD COLUMN IF NOT EXISTS estimation_revealed BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN sessions.current_estimation_item_id IS 'The item currently being estimated in Planning Poker. NULL = no active estimation.';
COMMENT ON COLUMN sessions.estimation_revealed IS 'Whether votes for current item have been revealed.';

-- Create estimation_votes table for tracking individual votes
CREATE TABLE IF NOT EXISTS estimation_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID REFERENCES items(id) ON DELETE CASCADE NOT NULL,
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE NOT NULL,
  participant_name TEXT NOT NULL,
  vote INTEGER, -- null = not voted, -1 = ?, -2 = coffee break
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(item_id, participant_name)
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_estimation_votes_item ON estimation_votes(item_id);
CREATE INDEX IF NOT EXISTS idx_estimation_votes_session ON estimation_votes(session_id);

-- Comments for documentation
COMMENT ON TABLE estimation_votes IS 'Stores individual Planning Poker votes. Votes are per item per participant.';
COMMENT ON COLUMN estimation_votes.vote IS 'Fibonacci value (0,1,2,3,5,8,13,21), -1 for uncertain (?), -2 for coffee break, NULL for not yet voted.';

-- Enable Row Level Security
ALTER TABLE estimation_votes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for estimation_votes (anyone can read/write - same pattern as other tables)
CREATE POLICY "Allow all operations on estimation_votes"
ON estimation_votes
FOR ALL
USING (true)
WITH CHECK (true);

-- Enable Realtime for estimation_votes
ALTER PUBLICATION supabase_realtime ADD TABLE estimation_votes;
