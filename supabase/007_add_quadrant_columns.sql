-- Add Quadrant-Based Positioning for Roadmap Items
-- Phase 3 Enhancement: Items can now be positioned at quadrant boundaries instead of period boundaries
-- Each period = 4 quadrants, allowing finer-grained positioning

-- Add quadrant columns to items table
ALTER TABLE items
ADD COLUMN IF NOT EXISTS roadmap_start_quadrant INTEGER;

ALTER TABLE items
ADD COLUMN IF NOT EXISTS roadmap_end_quadrant INTEGER;

-- Add row column for swimlane support (items on same row if they don't overlap)
ALTER TABLE items
ADD COLUMN IF NOT EXISTS roadmap_row INTEGER DEFAULT 0;

-- Migrate existing period-based data to quadrant-based
-- Items spanning period at position N to period at position M become:
-- start_quadrant = N * 4 (first quadrant of start period)
-- end_quadrant = (M + 1) * 4 - 1 (last quadrant of end period)
UPDATE items
SET
  roadmap_start_quadrant = (
    SELECT p.position * 4
    FROM roadmap_periods p
    WHERE p.id = items.roadmap_start_period
  ),
  roadmap_end_quadrant = (
    SELECT (p.position + 1) * 4 - 1
    FROM roadmap_periods p
    WHERE p.id = items.roadmap_end_period
  )
WHERE roadmap_start_period IS NOT NULL;

-- Create index for efficient querying of scheduled items
CREATE INDEX IF NOT EXISTS idx_items_roadmap_quadrants
ON items(roadmap_start_quadrant, roadmap_end_quadrant)
WHERE roadmap_start_quadrant IS NOT NULL;

-- Comments for documentation
COMMENT ON COLUMN items.roadmap_start_quadrant IS 'Starting quadrant index for this item (0-based, null = unscheduled). Each period = 4 quadrants.';
COMMENT ON COLUMN items.roadmap_end_quadrant IS 'Ending quadrant index for this item (inclusive). Can span across period boundaries.';
COMMENT ON COLUMN items.roadmap_row IS 'Row number for swimlane positioning (0 = auto-assign based on overlap)';

-- Note: Old columns (roadmap_start_period, roadmap_end_period) are kept for now
-- They can be dropped in a future migration once the new system is verified:
-- ALTER TABLE items DROP COLUMN roadmap_start_period;
-- ALTER TABLE items DROP COLUMN roadmap_end_period;
