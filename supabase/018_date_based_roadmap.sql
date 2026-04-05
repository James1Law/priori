-- Add date-based roadmap fields to items (replacing quadrant-based positioning)
ALTER TABLE items ADD COLUMN start_date date;
ALTER TABLE items ADD COLUMN end_date date;

-- Add roadmap view settings to sessions
ALTER TABLE sessions ADD COLUMN roadmap_zoom text DEFAULT 'fit';
ALTER TABLE sessions ADD COLUMN roadmap_start_date date;
ALTER TABLE sessions ADD COLUMN roadmap_end_date date;
