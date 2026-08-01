-- WhatsApp-verified phone + new booking lifecycle (commission token, no escrow)

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS whatsapp_verified_at TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN profiles.phone IS 'Indian mobile (10 digits). Must have WhatsApp; verified via WhatsApp OTP → whatsapp_verified_at';
COMMENT ON COLUMN profiles.whatsapp_verified_at IS 'Set when phone ownership confirmed via WhatsApp OTP; cleared if phone changes';

-- New statuses for request → confirm → pay-token → confirmed
-- (Legacy enum values kept for now; new bookings use the statuses below.)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'booking_status' AND e.enumlabel = 'requested'
  ) THEN
    ALTER TYPE booking_status ADD VALUE 'requested';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'booking_status' AND e.enumlabel = 'awaiting_token'
  ) THEN
    ALTER TYPE booking_status ADD VALUE 'awaiting_token';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'booking_status' AND e.enumlabel = 'declined'
  ) THEN
    ALTER TYPE booking_status ADD VALUE 'declined';
  END IF;
END $$;

-- Idempotency for Meta WhatsApp webhook deliveries
CREATE TABLE IF NOT EXISTS whatsapp_webhook_events (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL DEFAULT '',
  processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  meta JSONB
);

ALTER TABLE whatsapp_webhook_events ENABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE whatsapp_webhook_events TO postgres, service_role;

-- Default platform commission = 10% (token = commission for new bookings)
UPDATE platform_settings
SET commission_percentage = 10.00, updated_at = NOW()
WHERE id = 1;
