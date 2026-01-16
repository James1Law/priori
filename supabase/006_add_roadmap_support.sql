-- Add Roadmap View Support
-- Creates the roadmap_periods table and adds roadmap columns to items

-- Create roadmap_periods table for custom time buckets
CREATE TABLE IF NOT EXISTS roadmap_periods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  width INTEGER NOT NULL DEFAULT 4 CHECK (width >= 1 AND width <= 4),
  position INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for fast session lookups
CREATE INDEX IF NOT EXISTS idx_roadmap_periods_session ON roadmap_periods(session_id);

-- Create index for ordering by position
CREATE INDEX IF NOT EXISTS idx_roadmap_periods_position ON roadmap_periods(position);

-- Add roadmap columns to items table
ALTER TABLE items
ADD COLUMN IF NOT EXISTS roadmap_start_period UUID REFERENCES roadmap_periods(id) ON DELETE SET NULL;

ALTER TABLE items
ADD COLUMN IF NOT EXISTS roadmap_end_period UUID REFERENCES roadmap_periods(id) ON DELETE SET NULL;

-- Enable RLS on roadmap_periods (matching existing pattern)
ALTER TABLE roadmap_periods ENABLE ROW LEVEL SECURITY;

-- Create policy for public access (matching existing pattern from 002_enable_rls.sql)
CREATE POLICY "Allow public access to roadmap_periods"
ON roadmap_periods
FOR ALL
USING (true)
WITH CHECK (true);

-- Enable realtime for roadmap_periods
ALTER PUBLICATION supabase_realtime ADD TABLE roadmap_periods;

-- Comments for documentation
COMMENT ON TABLE roadmap_periods IS 'Custom time buckets for roadmap view (e.g., Q1, Sprint 1, Now/Next/Later)';
COMMENT ON COLUMN roadmap_periods.name IS 'Display name for the period (e.g., "Q1 2026", "Sprint 1", "Now")';
COMMENT ON COLUMN roadmap_periods.width IS 'Relative width 1-4, representing duration (4 = full-size, 1 = quarter-size)';
COMMENT ON COLUMN roadmap_periods.position IS 'Order position for displaying periods left to right';
COMMENT ON COLUMN items.roadmap_start_period IS 'Starting period for this item on the roadmap (null = unscheduled)';
COMMENT ON COLUMN items.roadmap_end_period IS 'Ending period for this item on the roadmap (same as start if single period)';
