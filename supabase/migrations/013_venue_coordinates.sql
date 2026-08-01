-- Precise venue coordinates for maps / directions (nullable for existing rows).
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS venue_lat DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS venue_lng DOUBLE PRECISION;
