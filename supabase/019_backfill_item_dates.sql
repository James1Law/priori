-- Backfill items missing start/end dates with defaults:
-- start_date = today, end_date = today + 1 month
UPDATE items
SET start_date = CURRENT_DATE,
    end_date = CURRENT_DATE + INTERVAL '1 month'
WHERE start_date IS NULL OR end_date IS NULL;
