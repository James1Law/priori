-- Team Chat Support - Phase 9.2
-- Add messages table for real-time team chat

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE NOT NULL,
  participant_name TEXT NOT NULL,
  content TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'user', -- 'user' | 'system'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id);
CREATE INDEX IF NOT EXISTS idx_messages_session_created ON messages(session_id, created_at DESC);

-- Comments for documentation
COMMENT ON TABLE messages IS 'Stores chat messages for team communication during planning sessions.';
COMMENT ON COLUMN messages.message_type IS 'Type of message: "user" for participant messages, "system" for join/leave events.';
COMMENT ON COLUMN messages.content IS 'The message text content.';

-- Enable Row Level Security
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for messages (anyone can read/write - same pattern as other tables)
CREATE POLICY "Allow all operations on messages"
ON messages
FOR ALL
USING (true)
WITH CHECK (true);

-- Enable Realtime for messages
-- Note: If table was already added to publication, this will fail silently in a DO block
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE messages;
EXCEPTION
  WHEN duplicate_object THEN
    NULL; -- Table already in publication
END $$;

-- Set replica identity to FULL for realtime to work with all columns
ALTER TABLE messages REPLICA IDENTITY FULL;
