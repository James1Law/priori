-- Add hours per day setting for capacity planning
ALTER TABLE sessions ADD COLUMN capacity_hours_per_day integer DEFAULT 8;

-- Remove 'points' from unit options, keep only 'days' and 'hours'
ALTER TABLE sessions DROP CONSTRAINT sessions_capacity_unit_check;
ALTER TABLE sessions ADD CONSTRAINT sessions_capacity_unit_check CHECK (capacity_unit IN ('days', 'hours'));

-- Migrate any existing 'points' sessions to 'days'
UPDATE sessions SET capacity_unit = 'days' WHERE capacity_unit = 'points';
