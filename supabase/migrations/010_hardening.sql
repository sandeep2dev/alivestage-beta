-- Persist OTP + pending payment drafts; soft-ban; cities for autocomplete.

-- ---------------------------------------------------------------------------
-- OTP challenges (replaces in-memory Map)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS otp_challenges (
    key TEXT PRIMARY KEY,
    hash TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    attempts INT NOT NULL DEFAULT 0,
    sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS otp_challenges_expires_idx ON otp_challenges (expires_at);

-- ---------------------------------------------------------------------------
-- Pending Razorpay order drafts (replaces in-memory Map)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pending_orders (
    order_id TEXT PRIMARY KEY,
    payload JSONB NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS pending_orders_expires_idx ON pending_orders (expires_at);

-- ---------------------------------------------------------------------------
-- Soft-ban
-- ---------------------------------------------------------------------------
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS banned_at TIMESTAMP WITH TIME ZONE;

-- ---------------------------------------------------------------------------
-- Cities master (autocomplete)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cities (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    state TEXT NOT NULL DEFAULT '',
    UNIQUE (name, state)
);

CREATE INDEX IF NOT EXISTS cities_name_lower_idx ON cities (lower(name));

INSERT INTO cities (name, state) VALUES
  ('Mumbai', 'Maharashtra'),
  ('Pune', 'Maharashtra'),
  ('Nagpur', 'Maharashtra'),
  ('Nashik', 'Maharashtra'),
  ('Delhi', 'Delhi'),
  ('New Delhi', 'Delhi'),
  ('Bengaluru', 'Karnataka'),
  ('Mysuru', 'Karnataka'),
  ('Mangaluru', 'Karnataka'),
  ('Hyderabad', 'Telangana'),
  ('Chennai', 'Tamil Nadu'),
  ('Coimbatore', 'Tamil Nadu'),
  ('Madurai', 'Tamil Nadu'),
  ('Kolkata', 'West Bengal'),
  ('Ahmedabad', 'Gujarat'),
  ('Surat', 'Gujarat'),
  ('Vadodara', 'Gujarat'),
  ('Jaipur', 'Rajasthan'),
  ('Udaipur', 'Rajasthan'),
  ('Jodhpur', 'Rajasthan'),
  ('Lucknow', 'Uttar Pradesh'),
  ('Kanpur', 'Uttar Pradesh'),
  ('Noida', 'Uttar Pradesh'),
  ('Ghaziabad', 'Uttar Pradesh'),
  ('Chandigarh', 'Chandigarh'),
  ('Amritsar', 'Punjab'),
  ('Ludhiana', 'Punjab'),
  ('Indore', 'Madhya Pradesh'),
  ('Bhopal', 'Madhya Pradesh'),
  ('Kochi', 'Kerala'),
  ('Thiruvananthapuram', 'Kerala'),
  ('Goa', 'Goa'),
  ('Panaji', 'Goa'),
  ('Visakhapatnam', 'Andhra Pradesh'),
  ('Vijayawada', 'Andhra Pradesh'),
  ('Bhubaneswar', 'Odisha'),
  ('Guwahati', 'Assam'),
  ('Patna', 'Bihar'),
  ('Ranchi', 'Jharkhand'),
  ('Dehradun', 'Uttarakhand'),
  ('Shimla', 'Himachal Pradesh'),
  ('Srinagar', 'Jammu and Kashmir'),
  ('Gurgaon', 'Haryana'),
  ('Faridabad', 'Haryana'),
  ('Thane', 'Maharashtra'),
  ('Navi Mumbai', 'Maharashtra'),
  ('Aurangabad', 'Maharashtra'),
  ('Rajkot', 'Gujarat'),
  ('Varanasi', 'Uttar Pradesh'),
  ('Agra', 'Uttar Pradesh')
ON CONFLICT (name, state) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE ON otp_challenges TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON pending_orders TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON cities TO service_role;
GRANT USAGE, SELECT ON SEQUENCE cities_id_seq TO service_role;
