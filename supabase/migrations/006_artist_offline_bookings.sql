-- Artist-created offline bookings (no fan / no Razorpay)
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS guest_name TEXT,
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'platform';

ALTER TABLE bookings
  DROP CONSTRAINT IF EXISTS bookings_source_check;

ALTER TABLE bookings
  ADD CONSTRAINT bookings_source_check
  CHECK (source IN ('platform', 'artist_manual'));

COMMENT ON COLUMN bookings.guest_name IS 'Display name when fan_id is null (artist_manual bookings)';
COMMENT ON COLUMN bookings.source IS 'platform = fan booking flow; artist_manual = offline self-record';
