-- Add framework column to sessions table
-- This stores which prioritization framework the session is using

ALTER TABLE sessions
ADD COLUMN IF NOT EXISTS framework TEXT DEFAULT 'rice';

-- Add check constraint to ensure only valid frameworks are used
ALTER TABLE sessions
ADD CONSTRAINT sessions_framework_check
CHECK (framework IN ('rice', 'ice', 'value_effort', 'moscow', 'weighted'));

-- Create index for framework lookups (optional, for analytics later)
CREATE INDEX IF NOT EXISTS sessions_framework_idx ON sessions(framework);

-- Update comment for documentation
COMMENT ON COLUMN sessions.framework IS 'Prioritization framework: rice, ice, value_effort, moscow, or weighted';
