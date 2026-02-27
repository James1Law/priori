-- Add estimation_item_ids column to sessions table
-- This stores the IDs of items selected for estimation, shared across all participants

ALTER TABLE sessions
ADD COLUMN IF NOT EXISTS estimation_item_ids UUID[] DEFAULT '{}';

COMMENT ON COLUMN sessions.estimation_item_ids IS 'Array of item IDs selected for Planning Poker estimation. Empty = all items.';
