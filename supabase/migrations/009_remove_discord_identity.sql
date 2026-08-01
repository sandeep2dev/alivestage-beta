-- Remove Discord identity columns (support webhook is env-only, no schema).
DROP INDEX IF EXISTS profiles_discord_username_idx;

ALTER TABLE profiles
  DROP COLUMN IF EXISTS discord_username,
  DROP COLUMN IF EXISTS discord_id,
  DROP COLUMN IF EXISTS verified_at;
