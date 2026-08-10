-- Voting timer for Planning Poker
-- The host can start a countdown for the current item; all clients render
-- it from estimation_timer_ends_at, and the host's client reveals votes
-- when it expires.

ALTER TABLE sessions
ADD COLUMN IF NOT EXISTS estimation_timer_ends_at TIMESTAMPTZ;

ALTER TABLE sessions
ADD COLUMN IF NOT EXISTS estimation_timer_duration INTEGER;

COMMENT ON COLUMN sessions.estimation_timer_ends_at IS 'When the current Planning Poker voting timer expires. NULL = no timer running.';
COMMENT ON COLUMN sessions.estimation_timer_duration IS 'Duration in seconds of the last started voting timer (for restart convenience).';
