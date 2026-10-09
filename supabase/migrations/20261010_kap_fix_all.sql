-- KAP — align database with the web app (idempotent: safe to run more than once)
-- Adds: missing ride columns, pricing_rules + seed prices, auto-profile on sign-up,
--       RLS for customers, nearest_city / get_driver_public_profile RPCs,
--       demo driver + demo_assign_driver (behind DEMO_MODE flag), realtime.

-- ---------------------------------------------------------------- rides
ALTER TABLE rides ADD COLUMN IF NOT EXISTS pickup_location  geography(Point, 4326);
ALTER TABLE rides ADD COLUMN IF NOT EXISTS dropoff_location geography(Point, 4326);
ALTER TABLE rides ADD COLUMN IF NOT EXISTS currency_code    varchar(3);
ALTER TABLE rides ADD COLUMN IF NOT EXISTS distance_km      numeric(10,2);
ALTER TABLE rides ADD COLUMN IF NOT EXISTS duration_min     int;
ALTER TABLE rides ADD COLUMN IF NOT EXISTS country_id       bigint REFERENCES countries(id);
ALTER TABLE rides ADD COLUMN IF NOT EXISTS city_id          bigint REFERENCES cities(id);
ALTER TABLE rides ADD COLUMN IF NOT EXISTS requested_at     timestamptz DEFAULT now();
ALTER TABLE rides ADD COLUMN IF NOT EXISTS cancelled_by     varchar(20);
ALTER TABLE rides ALTER COLUMN pickup_address  TYPE text;
ALTER TABLE rides ALTER COLUMN dropoff_address TYPE text;
CREATE INDEX IF NOT EXISTS idx_rides_requested_at ON rides(requested_at DESC);

-- ---------------------------------------------------------------- drivers (public card + live position)
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS display_name varchar(255);
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS current_lat  numeric(10,8);
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS current_lng  numeric(11,8);

-- ---------------------------------------------------------------- unique keys needed for idempotent seeds
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cities_country_name_key') THEN
    DELETE FROM cities a USING cities b
      WHERE a.id > b.id AND a.country_id = b.country_id AND a.name = b.name;
    ALTER TABLE cities ADD CONSTRAINT cities_country_name_key UNIQUE (country_id, name);
  END IF;
END $$;

-- more cities for the launch countries
INSERT INTO cities (country_id, name, name_ar, latitude, longitude, is_active)
SELECT c.id, v.name, v.name_ar, v.lat, v.lng, true
FROM (VALUES
  ('IQ','Baghdad','بغداد',33.3128,44.3615), ('IQ','Basra','البصرة',30.5085,47.8078),
  ('IQ','Mosul','الموصل',36.3350,43.1189),  ('IQ','Erbil','أربيل',36.1911,44.0092),
  ('IQ','Najaf','النجف',32.0259,44.3462),   ('IQ','Karbala','كربلاء',32.6160,44.0249),
  ('IQ','Sulaymaniyah','السليمانية',35.5613,45.4374), ('IQ','Kirkuk','كركوك',35.4681,44.3922),
  ('AE','Dubai','دبي',25.2048,55.2708),     ('AE','Abu Dhabi','أبوظبي',24.4539,54.3773),
  ('AE','Sharjah','الشارقة',25.3463,55.4209),
  ('SY','Damascus','دمشق',33.5138,36.2765), ('SY','Aleppo','حلب',36.2021,37.1343),
  ('SY','Homs','حمص',34.7324,36.7137),      ('SY','Latakia','اللاذقية',35.5317,35.7900)
) AS v(cc, name, name_ar, lat, lng)
JOIN countries c ON c.code = v.cc
ON CONFLICT (country_id, name) DO NOTHING;

-- ---------------------------------------------------------------- pricing_rules
CREATE TABLE IF NOT EXISTS pricing_rules (
  id               bigserial PRIMARY KEY,
  service_key      varchar(30) NOT NULL DEFAULT 'RIDE',
  city_id          bigint NOT NULL REFERENCES cities(id) ON DELETE CASCADE,
  vehicle_type     varchar(30) NOT NULL,
  base_fare        numeric(12,2) NOT NULL,
  per_km           numeric(12,2) NOT NULL,
  per_min          numeric(12,2) NOT NULL,
  min_fare         numeric(12,2) NOT NULL,
  surge_multiplier numeric(4,2)  NOT NULL DEFAULT 1,
  cancellation_fee numeric(12,2) NOT NULL DEFAULT 0,
  is_active        boolean NOT NULL DEFAULT true,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now(),
  UNIQUE (service_key, city_id, vehicle_type)
);

-- Seed prices per country currency; COMFORT = x1.3, XL = x1.6
INSERT INTO pricing_rules (service_key, city_id, vehicle_type, base_fare, per_km, per_min, min_fare, cancellation_fee)
SELECT 'RIDE', ci.id, vt.t,
       round(p.base * vt.m), round(p.km * vt.m, 2), round(p.mn * vt.m, 2), round(p.minf * vt.m), p.cancel
FROM cities ci
JOIN countries co ON co.id = ci.country_id
JOIN (VALUES
  ('IQ', 1500::numeric, 400::numeric, 75::numeric, 3000::numeric, 1000::numeric),
  ('AE',    5,  1.8, 0.5,   12,    5),
  ('SY', 5000, 1500, 250, 10000, 3000)
) AS p(cc, base, km, mn, minf, cancel) ON p.cc = co.code
CROSS JOIN (VALUES ('ECONOMY', 1.0), ('COMFORT', 1.3), ('XL', 1.6)) AS vt(t, m)
ON CONFLICT (service_key, city_id, vehicle_type) DO NOTHING;

-- ---------------------------------------------------------------- auto-create profile for every new auth user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, role) VALUES (NEW.id, 'customer')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- backfill users created before this trigger existed
INSERT INTO public.profiles (id, role)
SELECT u.id, 'customer' FROM auth.users u
ON CONFLICT (id) DO NOTHING;

-- phone is informational during testing: several test sessions may share a number
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_phone_number_key;

-- ---------------------------------------------------------------- RLS
ALTER TABLE countries      ENABLE ROW LEVEL SECURITY;
ALTER TABLE cities         ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_rules  ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_flags  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS countries_read     ON countries;
DROP POLICY IF EXISTS cities_read        ON cities;
DROP POLICY IF EXISTS pricing_read       ON pricing_rules;
DROP POLICY IF EXISTS feature_flags_read ON feature_flags;
CREATE POLICY countries_read     ON countries     FOR SELECT USING (is_active);
CREATE POLICY cities_read        ON cities        FOR SELECT USING (is_active);
CREATE POLICY pricing_read       ON pricing_rules FOR SELECT USING (is_active);
CREATE POLICY feature_flags_read ON feature_flags FOR SELECT USING (true);

DROP POLICY IF EXISTS profiles_self_insert ON profiles;
CREATE POLICY profiles_self_insert ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS rides_own_insert ON rides;
DROP POLICY IF EXISTS rides_own_update ON rides;
CREATE POLICY rides_own_insert ON rides FOR INSERT
  WITH CHECK (auth.uid() = customer_id);
-- customers may only cancel their own ride while it is still being matched
CREATE POLICY rides_own_update ON rides FOR UPDATE
  USING (auth.uid() = customer_id AND status IN ('REQUESTED','SEARCHING','ASSIGNED'))
  WITH CHECK (auth.uid() = customer_id AND status = 'CANCELLED');

-- ---------------------------------------------------------------- RPC: nearest_city
CREATE OR REPLACE FUNCTION public.nearest_city(p_lat double precision, p_lng double precision)
RETURNS SETOF cities LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT c.* FROM cities c
  WHERE c.is_active AND c.latitude IS NOT NULL
  ORDER BY (c.latitude - p_lat)^2 + ((c.longitude - p_lng) * cos(radians(p_lat)))^2
  LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.nearest_city(double precision, double precision) TO anon, authenticated;

-- ---------------------------------------------------------------- RPC: get_driver_public_profile
-- Only exposes what a rider needs, and only to a rider who has an active ride with that driver.
DROP FUNCTION IF EXISTS public.get_driver_public_profile(text);
DROP FUNCTION IF EXISTS public.get_driver_public_profile(bigint);
CREATE OR REPLACE FUNCTION public.get_driver_public_profile(target_driver_id bigint)
RETURNS TABLE (full_name text, rating numeric, make text, model text, color text, plate_number text,
               current_lat numeric, current_lng numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(d.display_name::text, NULLIF(trim(concat(p.first_name,' ',p.last_name)),''), 'السائق'),
         d.rating::numeric, v.manufacturer::text, v.model::text, v.color::text, v.plate_number::text,
         d.current_lat::numeric, d.current_lng::numeric
  FROM drivers d
  LEFT JOIN profiles p ON p.id = d.profile_id
  LEFT JOIN vehicles v ON v.id = d.vehicle_id
  WHERE d.id = target_driver_id
    AND EXISTS (SELECT 1 FROM rides r WHERE r.driver_id = d.id AND r.customer_id = auth.uid());
$$;
GRANT EXECUTE ON FUNCTION public.get_driver_public_profile(bigint) TO authenticated;

-- ---------------------------------------------------------------- demo driver (testing only, behind DEMO_MODE)
INSERT INTO feature_flags (name, is_enabled, description)
VALUES ('DEMO_MODE', true, 'Auto-assign a demo driver to new rides (testing only — turn OFF before launch)')
ON CONFLICT (name) DO NOTHING;

DO $$
DECLARE v_driver bigint; v_vehicle bigint;
BEGIN
  SELECT id INTO v_driver FROM drivers WHERE license_number = 'DEMO-0001';
  IF v_driver IS NULL THEN
    INSERT INTO drivers (status, license_number, display_name, rating, total_trips, is_online, current_lat, current_lng)
    VALUES ('APPROVED', 'DEMO-0001', 'أحمد (سائق تجريبي)', 4.9, 1280, true, 33.3152, 44.3661)
    RETURNING id INTO v_driver;
  END IF;
  SELECT id INTO v_vehicle FROM vehicles WHERE plate_number = 'بغداد 12345';
  IF v_vehicle IS NULL THEN
    INSERT INTO vehicles (driver_id, plate_number, vehicle_type, manufacturer, model, year, color, seats)
    VALUES (v_driver, 'بغداد 12345', 'ECONOMY', 'Toyota', 'Camry', 2022, 'أبيض', 4)
    RETURNING id INTO v_vehicle;
  END IF;
  UPDATE drivers SET vehicle_id = v_vehicle WHERE id = v_driver;
END $$;

CREATE OR REPLACE FUNCTION public.demo_assign_driver(p_ride_id bigint)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_driver bigint;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM feature_flags WHERE name = 'DEMO_MODE' AND is_enabled) THEN RETURN; END IF;
  SELECT id INTO v_driver FROM drivers WHERE license_number = 'DEMO-0001';
  UPDATE rides SET driver_id = v_driver, status = 'ASSIGNED'
  WHERE id = p_ride_id AND customer_id = auth.uid() AND status = 'SEARCHING';
  INSERT INTO ride_status_history (ride_id, status, notes)
  SELECT p_ride_id, 'ASSIGNED', 'demo driver' WHERE FOUND;
END $$;
GRANT EXECUTE ON FUNCTION public.demo_assign_driver(bigint) TO authenticated;

-- ---------------------------------------------------------------- realtime for ride tracking
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables
                 WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'rides') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.rides;
  END IF;
END $$;

SELECT 'KAP fix applied ✅' AS result,
       (SELECT count(*) FROM cities) AS cities,
       (SELECT count(*) FROM pricing_rules) AS price_rules;
