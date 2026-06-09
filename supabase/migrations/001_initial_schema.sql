-- Alivestage initial schema

CREATE TYPE user_role AS ENUM ('fan', 'artist', 'admin', 'superadmin');
CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'rejected', 'cancelled', 'completed_by_fan', 'settled');
CREATE TYPE payment_status AS ENUM ('token_paid', 'fully_paid', 'refunded', 'released_to_artist');

CREATE TABLE profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    name TEXT NOT NULL DEFAULT '',
    email TEXT UNIQUE NOT NULL,
    role user_role NOT NULL DEFAULT 'fan',
    phone TEXT,
    avatar_url TEXT,
    onboarding_complete BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE platform_settings (
    id INT PRIMARY KEY DEFAULT 1,
    commission_percentage NUMERIC(5, 2) NOT NULL DEFAULT 10.00,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by_id UUID REFERENCES profiles(id),
    CONSTRAINT singleton_row CHECK (id = 1)
);

CREATE TABLE artist_details (
    id UUID REFERENCES profiles(id) ON DELETE CASCADE PRIMARY KEY,
    bio TEXT,
    genres TEXT[],
    min_booking_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    hourly_rate NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    city TEXT NOT NULL DEFAULT '',
    youtube_links TEXT[],
    razorpay_linked_account_id TEXT,
    is_onboarded BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE bookings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    fan_id UUID REFERENCES profiles(id),
    artist_id UUID REFERENCES profiles(id),
    event_details TEXT NOT NULL,
    venue_location TEXT NOT NULL,
    event_date TIMESTAMP WITH TIME ZONE NOT NULL,
    duration_hours INT NOT NULL,
    total_amount NUMERIC(10, 2) NOT NULL,
    token_amount NUMERIC(10, 2) NOT NULL,
    remaining_amount NUMERIC(10, 2) NOT NULL,
    commission_rate_snapshot NUMERIC(5, 2) NOT NULL,
    artist_response_deadline TIMESTAMP WITH TIME ZONE NOT NULL,
    balance_due_deadline TIMESTAMP WITH TIME ZONE NOT NULL,
    status booking_status DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
    razorpay_order_id TEXT NOT NULL,
    razorpay_payment_id TEXT,
    razorpay_transfer_id TEXT,
    amount_captured NUMERIC(10, 2) NOT NULL,
    commission_rate_snapshot NUMERIC(5, 2) NOT NULL,
    platform_commission NUMERIC(10, 2) DEFAULT 0.00,
    artist_payout_amount NUMERIC(10, 2) DEFAULT 0.00,
    payment_type TEXT NOT NULL,
    status payment_status NOT NULL,
    processed_by_admin_id UUID REFERENCES profiles(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO platform_settings (id, commission_percentage) VALUES (1, 10.00);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1))
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE artist_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can read own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id)
    WITH CHECK (
        auth.uid() = id AND (
            role = (SELECT p.role FROM profiles p WHERE p.id = auth.uid())
            OR (SELECT p.onboarding_complete FROM profiles p WHERE p.id = auth.uid()) = false
        )
    );

CREATE POLICY "Admins can read all profiles" ON profiles
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'superadmin'))
    );

CREATE POLICY "Public can read artist profiles" ON profiles
    FOR SELECT USING (role = 'artist');

-- Artist details policies
CREATE POLICY "Anyone can read onboarded artists" ON artist_details
    FOR SELECT USING (is_onboarded = true);

CREATE POLICY "Artists can read own details" ON artist_details
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Artists can insert own details" ON artist_details
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Artists can update own details" ON artist_details
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can read all artist details" ON artist_details
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'superadmin'))
    );

-- Bookings policies
CREATE POLICY "Fans can read own bookings" ON bookings
    FOR SELECT USING (auth.uid() = fan_id);

CREATE POLICY "Artists can read own bookings" ON bookings
    FOR SELECT USING (auth.uid() = artist_id);

CREATE POLICY "Fans can insert bookings" ON bookings
    FOR INSERT WITH CHECK (auth.uid() = fan_id);

CREATE POLICY "Admins can read all bookings" ON bookings
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'superadmin'))
    );

-- Payments policies
CREATE POLICY "Users can read payments for own bookings" ON payments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM bookings b
            WHERE b.id = payments.booking_id
            AND (b.fan_id = auth.uid() OR b.artist_id = auth.uid())
        )
    );

CREATE POLICY "Admins can read all payments" ON payments
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'superadmin'))
    );

-- Platform settings policies
CREATE POLICY "Anyone authenticated can read settings" ON platform_settings
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Superadmins can update settings" ON platform_settings
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'superadmin')
    );

-- Storage bucket for avatars (run in Supabase dashboard or via API)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);
