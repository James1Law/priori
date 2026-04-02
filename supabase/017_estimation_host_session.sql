-- Add host control and session tracking for estimation flow
ALTER TABLE sessions ADD COLUMN estimation_host text;
ALTER TABLE sessions ADD COLUMN estimation_session_id uuid;
