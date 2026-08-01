-- Max joiners per event (host sets at create time).
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS max_spots INT;

UPDATE events SET max_spots = 10 WHERE max_spots IS NULL;

ALTER TABLE events
  ALTER COLUMN max_spots SET NOT NULL;

ALTER TABLE events
  ADD CONSTRAINT events_max_spots_check CHECK (max_spots > 0 AND max_spots <= 100);
