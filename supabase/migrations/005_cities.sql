-- Cities master + FK-only location for artists and bookings

CREATE TABLE cities (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    state TEXT NOT NULL,
    tier TEXT NOT NULL CHECK (tier IN ('Tier 1', 'Tier 2', 'Tier 3')),
    CONSTRAINT cities_name_state_unique UNIQUE (name, state)
);

INSERT INTO cities (id, name, state, tier) VALUES
  ('1', 'Mumbai', 'Maharashtra', 'Tier 1'),
  ('2', 'Delhi', 'Delhi', 'Tier 1'),
  ('3', 'Bengaluru', 'Karnataka', 'Tier 1'),
  ('4', 'Ahmedabad', 'Gujarat', 'Tier 1'),
  ('5', 'Hyderabad', 'Telangana', 'Tier 1'),
  ('6', 'Chennai', 'Tamil Nadu', 'Tier 1'),
  ('7', 'Kolkata', 'West Bengal', 'Tier 1'),
  ('8', 'Pune', 'Maharashtra', 'Tier 1'),
  ('9', 'Jaipur', 'Rajasthan', 'Tier 2'),
  ('10', 'Lucknow', 'Uttar Pradesh', 'Tier 2'),
  ('11', 'Surat', 'Gujarat', 'Tier 2'),
  ('12', 'Nagpur', 'Maharashtra', 'Tier 2'),
  ('13', 'Indore', 'Madhya Pradesh', 'Tier 2'),
  ('14', 'Chandigarh', 'Chandigarh', 'Tier 2'),
  ('15', 'Coimbatore', 'Tamil Nadu', 'Tier 2'),
  ('16', 'Kochi', 'Kerala', 'Tier 2'),
  ('17', 'Visakhapatnam', 'Andhra Pradesh', 'Tier 2'),
  ('18', 'Bhopal', 'Madhya Pradesh', 'Tier 2'),
  ('19', 'Patna', 'Bihar', 'Tier 2'),
  ('20', 'Vadodara', 'Gujarat', 'Tier 2'),
  ('21', 'Ghaziabad', 'Uttar Pradesh', 'Tier 2'),
  ('22', 'Ludhiana', 'Punjab', 'Tier 2'),
  ('23', 'Agra', 'Uttar Pradesh', 'Tier 2'),
  ('24', 'Nashik', 'Maharashtra', 'Tier 2'),
  ('25', 'Faridabad', 'Haryana', 'Tier 2'),
  ('26', 'Jamshedpur', 'Jharkhand', 'Tier 2'),
  ('27', 'Udaipur', 'Rajasthan', 'Tier 3'),
  ('28', 'Bikaner', 'Rajasthan', 'Tier 3'),
  ('29', 'Meerut', 'Uttar Pradesh', 'Tier 3'),
  ('30', 'Roorkee', 'Uttarakhand', 'Tier 3'),
  ('31', 'Jhansi', 'Uttar Pradesh', 'Tier 3'),
  ('32', 'Mathura', 'Uttar Pradesh', 'Tier 3'),
  ('33', 'Cuttack', 'Odisha', 'Tier 3'),
  ('34', 'Salem', 'Tamil Nadu', 'Tier 3'),
  ('35', 'Hosur', 'Tamil Nadu', 'Tier 3'),
  ('36', 'Bhatinda', 'Punjab', 'Tier 3'),
  ('37', 'Hajipur', 'Bihar', 'Tier 3'),
  ('38', 'Rajahmundry', 'Andhra Pradesh', 'Tier 3'),
  ('39', 'Rohtak', 'Haryana', 'Tier 3'),
  ('40', 'Gandhinagar', 'Gujarat', 'Tier 3');

ALTER TABLE artist_details
  ADD COLUMN city_id TEXT REFERENCES cities(id);

UPDATE artist_details ad
SET city_id = c.id
FROM cities c
WHERE ad.city IS NOT NULL
  AND ad.city <> ''
  AND lower(trim(ad.city)) = lower(c.name);

ALTER TABLE artist_details DROP COLUMN IF EXISTS city;

ALTER TABLE bookings
  ADD COLUMN venue_city_id TEXT REFERENCES cities(id);

-- Backfill existing bookings with first city when address cannot be matched (nullable for legacy rows)
-- New bookings require venue_city_id at the application layer.

GRANT ALL ON TABLE cities TO postgres, anon, authenticated, service_role;

CREATE POLICY "Anyone can read cities" ON cities
  FOR SELECT USING (true);

ALTER TABLE cities ENABLE ROW LEVEL SECURITY;
