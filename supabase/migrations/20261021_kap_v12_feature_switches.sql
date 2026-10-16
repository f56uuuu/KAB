-- KAP v12 — one switch for every customer-facing feature (super admin: Services & features).
-- Missing rows count as OFF in flag_on(), so every switch gets a row with its intended default.
INSERT INTO public.feature_flags (name, is_enabled, description) VALUES
  ('PHARMACY', true, 'Pharmacies tile on home'),
  ('HOME_SERVICES', false, 'Home services (coming soon)'),
  ('CAR_SERVICES', false, 'Car services (coming soon)'),
  ('HOME_HERO', true, 'Home hero carousel'),
  ('HOME_STORES', true, 'Nearby restaurants on home'),
  ('COUPONS', true, 'Promo codes at checkout (enforced in check_coupon)'),
  ('RATINGS', true, 'Ratings after a trip or order'),
  ('MY_MAP', true, 'Personal map and navigation'),
  ('NAV_REPORTS', true, 'Road reports'),
  ('DRIVER_SIGNUP', true, 'New captain applications (enforced in driver_register)'),
  ('STORE_DEVICE', true, 'Store order screen'),
  ('TOUR', true, 'Welcome tour')
ON CONFLICT (name) DO NOTHING;
-- the owner asked for voice commands to be on
UPDATE public.feature_flags SET is_enabled = true, description = 'Voice commands on the map' WHERE name = 'VOICE_SEARCH';

-- promo codes: rejected everywhere while switched off
DO $p$
DECLARE d text;
BEGIN
  d := pg_get_functiondef('public.check_coupon(text,text,numeric,numeric)'::regprocedure);
  IF position('COUPONS' in d) = 0 THEN
    d := replace(d,
$a$  IF p_code IS NULL OR trim(p_code) = '' THEN RETURN jsonb_build_object('ok', false, 'reason', 'empty'); END IF;$a$,
$b$  IF p_code IS NULL OR trim(p_code) = '' THEN RETURN jsonb_build_object('ok', false, 'reason', 'empty'); END IF;
  IF NOT flag_on('COUPONS') THEN RETURN jsonb_build_object('ok', false, 'reason', 'disabled'); END IF;$b$);
    IF position('COUPONS' in d) = 0 THEN RAISE EXCEPTION 'check_coupon patch did not apply'; END IF;
    EXECUTE d;
  END IF;
END $p$;

-- captain sign-up: closed to new applicants while switched off (existing captains can still update)
DO $p$
DECLARE d text;
BEGIN
  d := pg_get_functiondef('public.driver_register(text,text,text,text,text,text,text,bigint)'::regprocedure);
  IF position('DRIVER_SIGNUP' in d) = 0 THEN
    d := replace(d,
$a$  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;$a$,
$b$  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF NOT flag_on('DRIVER_SIGNUP') AND NOT EXISTS (SELECT 1 FROM drivers WHERE profile_id = auth.uid()) THEN
    RAISE EXCEPTION 'signup_closed';
  END IF;$b$);
    IF position('DRIVER_SIGNUP' in d) = 0 THEN RAISE EXCEPTION 'driver_register patch did not apply'; END IF;
    EXECUTE d;
  END IF;
END $p$;
