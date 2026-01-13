-- Add created_by column to items table
-- This stores the name of the participant who created the item

ALTER TABLE items
ADD COLUMN IF NOT EXISTS created_by TEXT;

-- Update comment for documentation
COMMENT ON COLUMN items.created_by IS 'Name of the participant who created this item';
