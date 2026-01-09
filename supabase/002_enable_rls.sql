-- Enable Row Level Security (RLS)
-- This allows public access since Priori has no authentication

-- Enable RLS on all tables
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE scores ENABLE ROW LEVEL SECURITY;

-- Create policies for public access
-- Sessions: Anyone can read and create sessions
CREATE POLICY "Allow public read access to sessions"
  ON sessions FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert to sessions"
  ON sessions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public update to sessions"
  ON sessions FOR UPDATE
  USING (true);

-- Items: Anyone can read, create, update, and delete items
CREATE POLICY "Allow public read access to items"
  ON items FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert to items"
  ON items FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public update to items"
  ON items FOR UPDATE
  USING (true);

CREATE POLICY "Allow public delete to items"
  ON items FOR DELETE
  USING (true);

-- Scores: Anyone can read, create, update, and delete scores
CREATE POLICY "Allow public read access to scores"
  ON scores FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert to scores"
  ON scores FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public update to scores"
  ON scores FOR UPDATE
  USING (true);

CREATE POLICY "Allow public delete to scores"
  ON scores FOR DELETE
  USING (true);
