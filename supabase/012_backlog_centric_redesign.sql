-- Phase 1.1: Backlog-Centric Redesign - Schema Changes
-- This migration adds support for the new backlog-centric UX

-- =====================================================
-- 1. Add status column to items table
-- =====================================================
ALTER TABLE items
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'todo';

-- Add constraint for valid status values
ALTER TABLE items
ADD CONSTRAINT items_status_check
CHECK (status IN ('todo', 'in_progress', 'done'));

-- Create index for filtering by status
CREATE INDEX IF NOT EXISTS idx_items_status ON items(status);

COMMENT ON COLUMN items.status IS 'Item workflow status: todo, in_progress, or done';


-- =====================================================
-- 2. Create cutoffs table (multiple cutoff lines)
-- =====================================================
CREATE TABLE IF NOT EXISTS cutoffs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  label TEXT NOT NULL DEFAULT 'Cutoff',
  color TEXT NOT NULL DEFAULT 'red',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for session-based queries
CREATE INDEX IF NOT EXISTS idx_cutoffs_session_id ON cutoffs(session_id);

-- Create index for ordering
CREATE INDEX IF NOT EXISTS idx_cutoffs_position ON cutoffs(position);

-- Add constraint for valid colours
ALTER TABLE cutoffs
ADD CONSTRAINT cutoffs_color_check
CHECK (color IN ('red', 'amber', 'blue', 'green'));

COMMENT ON TABLE cutoffs IS 'Multiple cutoff lines for backlog, each with position, label, and colour';
COMMENT ON COLUMN cutoffs.position IS 'Position in the backlog (between items)';
COMMENT ON COLUMN cutoffs.label IS 'Display label for the cutoff line';
COMMENT ON COLUMN cutoffs.color IS 'Colour: red, amber, blue, or green';


-- =====================================================
-- 3. Enable Row Level Security on cutoffs
-- =====================================================
ALTER TABLE cutoffs ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read cutoffs (URL-based access)
CREATE POLICY "Anyone can read cutoffs" ON cutoffs
FOR SELECT USING (true);

-- Allow anyone to insert cutoffs
CREATE POLICY "Anyone can insert cutoffs" ON cutoffs
FOR INSERT WITH CHECK (true);

-- Allow anyone to update cutoffs
CREATE POLICY "Anyone can update cutoffs" ON cutoffs
FOR UPDATE USING (true);

-- Allow anyone to delete cutoffs
CREATE POLICY "Anyone can delete cutoffs" ON cutoffs
FOR DELETE USING (true);


-- =====================================================
-- 4. Enable Realtime for cutoffs table
-- =====================================================
ALTER PUBLICATION supabase_realtime ADD TABLE cutoffs;


-- =====================================================
-- 5. Migration: Copy existing cutoff to new table
-- =====================================================
-- Migrate existing single cutoffs from sessions to new cutoffs table
INSERT INTO cutoffs (session_id, position, label, color)
SELECT id, cutoff_position, COALESCE(cutoff_label, 'Cutoff'), 'red'
FROM sessions
WHERE cutoff_position IS NOT NULL;


-- =====================================================
-- Notes for future migrations:
-- =====================================================
-- The existing sessions.view column supports: 'scoring', 'estimates', 'backlog', 'roadmap'
-- After this feature is complete, we may want to update the CHECK constraint to only allow: 'list', 'roadmap'
-- For now, keep both to support gradual rollout
