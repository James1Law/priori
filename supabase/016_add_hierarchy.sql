-- Add hierarchy support to items table
-- parent_item_id: references another item in the same session (nullable = top-level)
-- item_level: 0=Goal, 1=Initiative, 2=Epic, 3=Story, 4=Subtask
ALTER TABLE items ADD COLUMN parent_item_id uuid REFERENCES items(id) ON DELETE CASCADE;
ALTER TABLE items ADD COLUMN item_level integer NOT NULL DEFAULT 0;

-- Index for efficient tree queries
CREATE INDEX idx_items_parent ON items(parent_item_id);
CREATE INDEX idx_items_session_level ON items(session_id, item_level);

-- Ensure item_level is within valid range
ALTER TABLE items ADD CONSTRAINT items_level_range CHECK (item_level >= 0 AND item_level <= 4);
