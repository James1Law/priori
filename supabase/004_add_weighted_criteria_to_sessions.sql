-- Add weighted_criteria column to sessions table
-- This stores the custom criteria definitions for weighted scoring framework

ALTER TABLE sessions
ADD COLUMN IF NOT EXISTS weighted_criteria JSONB DEFAULT '[]'::jsonb;

-- Update comment for documentation
COMMENT ON COLUMN sessions.weighted_criteria IS 'Custom criteria definitions for weighted scoring: [{id, name, weight}]';
