-- AliVeStage community pivot: drop booking marketplace, create jam/community schema.
-- Clean cut — no booking data migration.

-- ---------------------------------------------------------------------------
-- Tear down booking-era objects
-- ---------------------------------------------------------------------------
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS bookings CASCADE;
DROP TABLE IF EXISTS artist_details CASCADE;
DROP TABLE IF EXISTS platform_settings CASCADE;
DROP TABLE IF EXISTS whatsapp_webhook_events CASCADE;
DROP TABLE IF EXISTS cities CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

DROP TYPE IF EXISTS booking_status CASCADE;
DROP TYPE IF EXISTS payment_status CASCADE;
DROP TYPE IF EXISTS user_role CASCADE;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
CREATE TYPE user_role AS ENUM ('member', 'admin');
CREATE TYPE event_visibility AS ENUM ('public');
CREATE TYPE event_status AS ENUM ('created', 'live', 'completed', 'cancelled');
CREATE TYPE payment_type AS ENUM ('host_create_fee', 'join_fee');
CREATE TYPE community_payment_status AS ENUM ('paid', 'refunded_full', 'refunded_partial', 'failed');
CREATE TYPE refund_reason AS ENUM ('host_cancelled', 'joiner_cancelled');
CREATE TYPE rating_type AS ENUM ('host_rating', 'joiner_rating');

-- ---------------------------------------------------------------------------
-- Profiles (community User)
-- ---------------------------------------------------------------------------
CREATE TABLE profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL DEFAULT '',
    email TEXT UNIQUE NOT NULL,
    role user_role NOT NULL DEFAULT 'member',
    avatar_url TEXT,
    discord_username TEXT,
    discord_id TEXT UNIQUE,
    city TEXT NOT NULL DEFAULT '',
    pincode TEXT NOT NULL DEFAULT '',
    reputation_score NUMERIC(4, 2),
    rating_count INT NOT NULL DEFAULT 0,
    verified_at TIMESTAMP WITH TIME ZONE,
    onboarding_complete BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX profiles_city_idx ON profiles (city);
CREATE INDEX profiles_discord_username_idx ON profiles (discord_username);

-- ---------------------------------------------------------------------------
-- Events
-- ---------------------------------------------------------------------------
CREATE TABLE events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    host_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    summary TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    city TEXT NOT NULL,
    precise_address TEXT NOT NULL,
    start_at TIMESTAMP WITH TIME ZONE NOT NULL,
    duration_minutes INT NOT NULL CHECK (duration_minutes > 0),
    end_at TIMESTAMP WITH TIME ZONE NOT NULL,
    visibility event_visibility NOT NULL DEFAULT 'public',
    status event_status NOT NULL DEFAULT 'created',
    completed_at TIMESTAMP WITH TIME ZONE,
    rating_window_closes_at TIMESTAMP WITH TIME ZONE,
    rating_prompts_sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX events_status_start_idx ON events (status, start_at);
CREATE INDEX events_city_idx ON events (city);
CREATE INDEX events_host_idx ON events (host_id);

-- ---------------------------------------------------------------------------
-- Payments (collection-only fees)
-- ---------------------------------------------------------------------------
CREATE TABLE payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    event_id UUID REFERENCES events(id) ON DELETE SET NULL,
    type payment_type NOT NULL,
    status community_payment_status NOT NULL DEFAULT 'paid',
    amount NUMERIC(10, 2) NOT NULL,
    razorpay_payment_id TEXT,
    razorpay_order_id TEXT NOT NULL,
    refund_amount NUMERIC(10, 2),
    refund_reason refund_reason,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX payments_user_idx ON payments (user_id);
CREATE INDEX payments_event_idx ON payments (event_id);
CREATE INDEX payments_order_idx ON payments (razorpay_order_id);

-- ---------------------------------------------------------------------------
-- Event memberships (joiners)
-- ---------------------------------------------------------------------------
CREATE TABLE event_memberships (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    payment_id UUID NOT NULL REFERENCES payments(id),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    host_marked_attended BOOLEAN NOT NULL DEFAULT FALSE,
    self_marked_present BOOLEAN NOT NULL DEFAULT FALSE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    UNIQUE (event_id, user_id)
);

CREATE INDEX event_memberships_event_idx ON event_memberships (event_id)
  WHERE cancelled_at IS NULL;
CREATE INDEX event_memberships_user_idx ON event_memberships (user_id)
  WHERE cancelled_at IS NULL;

-- ---------------------------------------------------------------------------
-- Ratings (host + joiner-to-joiner only; no event-level ratings)
-- ---------------------------------------------------------------------------
CREATE TABLE ratings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    rater_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    ratee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    rating_type rating_type NOT NULL,
    score INT NOT NULL CHECK (score >= 1 AND score <= 5),
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (event_id, rater_id, ratee_id),
    CHECK (rater_id <> ratee_id)
);

CREATE INDEX ratings_ratee_idx ON ratings (ratee_id);
CREATE INDEX ratings_event_idx ON ratings (event_id);

-- ---------------------------------------------------------------------------
-- RLS: enabled with no anon/authenticated policies.
-- Express uses the service role key, which bypasses RLS.
-- ---------------------------------------------------------------------------
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;

GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
