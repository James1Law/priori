-- Add backlog_position column to items table
-- This column enables manual ordering in the backlog view

ALTER TABLE items
ADD COLUMN IF NOT EXISTS backlog_position INTEGER;

-- Create index for efficient ordering queries
CREATE INDEX IF NOT EXISTS idx_items_backlog_position ON items(backlog_position);

COMMENT ON COLUMN items.backlog_position IS 'Manual order position in backlog view. NULL = use score-based ordering.';
