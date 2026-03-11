-- Add capacity planning fields to sessions table
ALTER TABLE sessions ADD COLUMN capacity_team_size integer DEFAULT 5;
ALTER TABLE sessions ADD COLUMN capacity_working_days integer DEFAULT 65;
ALTER TABLE sessions ADD COLUMN capacity_focus_factor real DEFAULT 0.6;
ALTER TABLE sessions ADD COLUMN capacity_contingency real DEFAULT 0.3;
ALTER TABLE sessions ADD COLUMN capacity_unit text DEFAULT 'days' CHECK (capacity_unit IN ('days', 'hours', 'points'));

-- Add effort estimate field to items table
ALTER TABLE items ADD COLUMN effort_estimate real;
