-- Allow event_full when a join payment is refunded after capacity is reached.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'refund_reason' AND e.enumlabel = 'event_full'
  ) THEN
    ALTER TYPE refund_reason ADD VALUE 'event_full';
  END IF;
END $$;
