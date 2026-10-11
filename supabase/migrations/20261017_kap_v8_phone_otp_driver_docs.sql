-- KAP v8: phone number verification by SMS code (Supabase "send SMS" hook) and driver documents
-- (selfie, ID, licence, vehicle papers) stored privately and reviewed by admins.
-- Safe to run more than once.

CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- ================================================================ secrets & settings
CREATE UNIQUE INDEX IF NOT EXISTS kap_secrets_key_idx ON public.kap_secrets (key);
ALTER TABLE public.kap_secrets ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.kap_secrets FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.kap_secret(k text)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT NULLIF(value, '') FROM kap_secrets WHERE key = k;
$$;
REVOKE ALL ON FUNCTION public.kap_secret(text) FROM PUBLIC, anon, authenticated;

INSERT INTO settings (key, value, description)
SELECT 'otp_provider', 'off', 'SMS code delivery: off | smsgate (free Android SMS Gateway) | telegram (Telegram Gateway)'
WHERE NOT EXISTS (SELECT 1 FROM settings WHERE key = 'otp_provider');

-- what was sent (never the code itself)
CREATE TABLE IF NOT EXISTS public.sms_log (
  id          bigserial PRIMARY KEY,
  phone_masked text NOT NULL,
  provider    text NOT NULL,
  purpose     text NOT NULL DEFAULT 'otp',
  request_id  bigint,
  created_at  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.sms_log ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.sms_log FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.otp_ready()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE (SELECT value FROM settings WHERE key = 'otp_provider')
    WHEN 'smsgate'  THEN kap_secret('smsgate_user') IS NOT NULL AND kap_secret('smsgate_pass') IS NOT NULL
    WHEN 'telegram' THEN kap_secret('telegram_gateway_token') IS NOT NULL
    ELSE false END;
$$;
GRANT EXECUTE ON FUNCTION public.otp_ready() TO anon, authenticated;

-- one place that actually delivers a text message
CREATE OR REPLACE FUNCTION public.kap_send_sms(p_phone text, p_text text, p_code text DEFAULT NULL, p_purpose text DEFAULT 'otp')
RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE v_provider text; v_req bigint;
BEGIN
  SELECT value INTO v_provider FROM settings WHERE key = 'otp_provider';
  IF NOT otp_ready() THEN RAISE EXCEPTION 'sms_not_configured'; END IF;
  IF v_provider = 'smsgate' THEN
    SELECT net.http_post(
      url := COALESCE(kap_secret('smsgate_url'), 'https://api.sms-gate.app/3rdparty/v1/messages'),
      body := jsonb_build_object('textMessage', jsonb_build_object('text', p_text), 'phoneNumbers', jsonb_build_array(p_phone), 'ttl', 600),
      headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization',
                 'Basic ' || replace(encode(convert_to(kap_secret('smsgate_user') || ':' || kap_secret('smsgate_pass'), 'UTF8'), 'base64'), E'\n', '')),
      timeout_milliseconds := 15000) INTO v_req;
  ELSIF v_provider = 'telegram' THEN
    IF p_code IS NULL THEN RAISE EXCEPTION 'telegram_needs_code'; END IF;
    SELECT net.http_post(
      url := 'https://gatewayapi.telegram.org/sendVerificationMessage',
      body := jsonb_build_object('phone_number', p_phone, 'code', p_code, 'ttl', 300),
      headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || kap_secret('telegram_gateway_token')),
      timeout_milliseconds := 15000) INTO v_req;
  END IF;
  INSERT INTO sms_log (phone_masked, provider, purpose, request_id)
  VALUES (left(p_phone, 7) || '****' || right(p_phone, 2), v_provider, p_purpose, v_req);
  RETURN v_req;
END $$;
REVOKE ALL ON FUNCTION public.kap_send_sms(text, text, text, text) FROM PUBLIC, anon, authenticated;

-- Supabase Auth "send SMS" hook: Supabase generates and checks the code; we only deliver it.
CREATE OR REPLACE FUNCTION public.send_sms_hook(event jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE v_phone text := '+' || ltrim(event->'user'->>'phone', '+'); v_otp text := event->'sms'->>'otp';
BEGIN
  PERFORM kap_send_sms(v_phone, 'KAP: ' || v_otp || E' رمز التحقق — لا تشاركه مع أحد\nYour KAP code: ' || v_otp, v_otp, 'otp');
  RETURN '{}'::jsonb;
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('error', jsonb_build_object('http_code', 503, 'message', 'SMS delivery is not available right now'));
END $$;
REVOKE ALL ON FUNCTION public.send_sms_hook(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.send_sms_hook(jsonb) TO supabase_auth_admin;
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;

-- super admin connects the SMS gateway from the admin panel (values are write-only)
CREATE OR REPLACE FUNCTION public.admin_set_sms(p_provider text, p_user text DEFAULT NULL, p_pass text DEFAULT NULL, p_token text DEFAULT NULL, p_url text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin' AND COALESCE(is_active, true)) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF p_provider NOT IN ('off', 'smsgate', 'telegram') THEN RAISE EXCEPTION 'bad_provider'; END IF;
  UPDATE settings SET value = p_provider, updated_at = now() WHERE key = 'otp_provider';
  IF NULLIF(trim(p_user), '') IS NOT NULL THEN INSERT INTO kap_secrets (key, value) VALUES ('smsgate_user', trim(p_user)) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value; END IF;
  IF NULLIF(trim(p_pass), '') IS NOT NULL THEN INSERT INTO kap_secrets (key, value) VALUES ('smsgate_pass', trim(p_pass)) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value; END IF;
  IF NULLIF(trim(p_token), '') IS NOT NULL THEN INSERT INTO kap_secrets (key, value) VALUES ('telegram_gateway_token', trim(p_token)) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value; END IF;
  IF p_url IS NOT NULL THEN INSERT INTO kap_secrets (key, value) VALUES ('smsgate_url', trim(p_url)) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value; END IF;
  INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, new_value)
  VALUES (auth.uid(), 'sms_settings', 'settings', 'otp_provider', jsonb_build_object('provider', p_provider));
  RETURN admin_sms_status();
END $$;
GRANT EXECUTE ON FUNCTION public.admin_set_sms(text, text, text, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_sms_status()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, extensions AS $$
BEGIN
  IF NOT is_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN jsonb_build_object(
    'provider', (SELECT value FROM settings WHERE key = 'otp_provider'),
    'ready', otp_ready(),
    'has_smsgate', kap_secret('smsgate_user') IS NOT NULL AND kap_secret('smsgate_pass') IS NOT NULL,
    'has_telegram', kap_secret('telegram_gateway_token') IS NOT NULL,
    'log', COALESCE((SELECT jsonb_agg(x ORDER BY x.created_at DESC) FROM (
       SELECT l.created_at, l.phone_masked, l.provider, l.purpose, r.status_code, left(COALESCE(r.error_msg, r.content::text), 160) AS reply
       FROM sms_log l LEFT JOIN net._http_response r ON r.id = l.request_id
       ORDER BY l.created_at DESC LIMIT 15) x), '[]'::jsonb));
END $$;
GRANT EXECUTE ON FUNCTION public.admin_sms_status() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_sms_test(p_phone text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF p_phone !~ '^\+[1-9][0-9]{7,14}$' THEN RAISE EXCEPTION 'bad_phone'; END IF;
  PERFORM kap_send_sms(p_phone, 'KAP: رسالة تجربة — test message ✔', '000000', 'test');
  RETURN admin_sms_status();
END $$;
GRANT EXECUTE ON FUNCTION public.admin_sms_test(text) TO authenticated;

-- ================================================================ verified phone on the profile
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone_verified_at timestamptz;

-- copy the phone Supabase Auth has confirmed onto the profile
CREATE OR REPLACE FUNCTION public.sync_confirmed_phone()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.phone_confirmed_at IS NOT NULL AND COALESCE(NEW.phone, '') <> ''
     AND (TG_OP = 'INSERT' OR OLD.phone_confirmed_at IS DISTINCT FROM NEW.phone_confirmed_at OR OLD.phone IS DISTINCT FROM NEW.phone) THEN
    PERFORM set_config('kap.bypass_guard', 'on', true);
    INSERT INTO profiles (id, role, phone_number, phone_verified_at, is_verified)
    VALUES (NEW.id, 'customer', '+' || ltrim(NEW.phone, '+'), NEW.phone_confirmed_at, true)
    ON CONFLICT (id) DO UPDATE SET phone_number = EXCLUDED.phone_number, phone_verified_at = EXCLUDED.phone_verified_at, is_verified = true;
    PERFORM set_config('kap.bypass_guard', 'off', true);
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS zz_on_auth_phone_confirmed ON auth.users;
CREATE TRIGGER zz_on_auth_phone_confirmed AFTER INSERT OR UPDATE OF phone, phone_confirmed_at ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.sync_confirmed_phone();

-- users can't mark themselves verified; changing the number drops the verification
CREATE OR REPLACE FUNCTION public.guard_profile_privileges()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR current_setting('kap.bypass_guard', true) = 'on' THEN RETURN NEW; END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.role IN ('admin', 'super_admin') AND NOT is_admin() THEN NEW.role := 'customer'; END IF;
    IF NOT is_admin() THEN NEW.phone_verified_at := NULL; NEW.is_verified := false; END IF;
    RETURN NEW;
  END IF;

  IF NOT is_admin() THEN
    IF NEW.phone_number IS DISTINCT FROM OLD.phone_number THEN
      NEW.phone_verified_at := NULL;
      NEW.is_verified := false;
    ELSE
      NEW.phone_verified_at := OLD.phone_verified_at;
      NEW.is_verified := OLD.is_verified;
    END IF;
  END IF;

  IF (NEW.role IS DISTINCT FROM OLD.role OR NEW.is_active IS DISTINCT FROM OLD.is_active) THEN
    IF NOT is_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
    IF (NEW.role = 'super_admin' OR OLD.role = 'super_admin')
       AND NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin') THEN
      RAISE EXCEPTION 'forbidden';
    END IF;
    IF OLD.id = auth.uid() THEN RAISE EXCEPTION 'cannot_change_own_role'; END IF;
    INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, old_value, new_value)
    VALUES (auth.uid(), 'profile_privileges', 'profile', OLD.id::text,
            jsonb_build_object('role', OLD.role, 'is_active', OLD.is_active),
            jsonb_build_object('role', NEW.role, 'is_active', NEW.is_active));
  END IF;
  RETURN NEW;
END $$;

-- ================================================================ driver documents (private storage)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('driver-docs', 'driver-docs', false, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/pdf'])
ON CONFLICT (id) DO UPDATE SET public = false, file_size_limit = EXCLUDED.file_size_limit, allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "driver docs: own upload" ON storage.objects;
DROP POLICY IF EXISTS "driver docs: own read" ON storage.objects;
DROP POLICY IF EXISTS "driver docs: own replace" ON storage.objects;
DROP POLICY IF EXISTS "driver docs: admin read" ON storage.objects;
CREATE POLICY "driver docs: own upload" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'driver-docs' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "driver docs: own read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'driver-docs' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "driver docs: own replace" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'driver-docs' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "driver docs: admin read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'driver-docs' AND public.is_admin());

DELETE FROM driver_documents a USING driver_documents b
 WHERE a.driver_id = b.driver_id AND a.document_type = b.document_type AND a.id < b.id;
CREATE UNIQUE INDEX IF NOT EXISTS driver_documents_driver_type_idx ON public.driver_documents (driver_id, document_type);
ALTER TABLE public.driver_documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS driver_docs_own_read ON public.driver_documents;
CREATE POLICY driver_docs_own_read ON public.driver_documents FOR SELECT TO authenticated
  USING (driver_id IN (SELECT id FROM drivers WHERE profile_id = auth.uid()));

-- which papers each kind of vehicle needs
CREATE OR REPLACE FUNCTION public.driver_required_docs(p_type text)
RETURNS text[] LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN p_type = 'BICYCLE' THEN ARRAY['selfie', 'national_id_front', 'national_id_back', 'vehicle_photo']
    WHEN p_type = 'BIKE'    THEN ARRAY['selfie', 'national_id_front', 'national_id_back', 'driving_license', 'vehicle_registration', 'vehicle_photo']
    ELSE ARRAY['selfie', 'national_id_front', 'national_id_back', 'driving_license', 'vehicle_registration', 'insurance', 'vehicle_photo']
  END;
$$;
GRANT EXECUTE ON FUNCTION public.driver_required_docs(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.my_driver()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT to_jsonb(x) FROM (
    SELECT d.id, d.status, d.is_online, d.display_name, d.phone, d.rating, d.total_trips, d.admin_notes,
           d.current_lat, d.current_lng, d.city_id,
           v.vehicle_type, v.manufacturer, v.model, v.color, v.plate_number, v.year,
           p.phone_number AS verified_phone, p.phone_verified_at, p.profile_picture_url AS photo_path,
           driver_required_docs(COALESCE(v.vehicle_type, 'ECONOMY')) AS required_docs,
           COALESCE((SELECT jsonb_agg(jsonb_build_object('id', dd.id, 'type', dd.document_type, 'status', dd.status, 'path', dd.document_url,
                                                         'number', dd.document_number, 'expiry', dd.expiry_date, 'reason', dd.rejection_reason,
                                                         'updated_at', dd.updated_at))
                     FROM driver_documents dd WHERE dd.driver_id = d.id), '[]'::jsonb) AS docs
    FROM drivers d
    LEFT JOIN vehicles v ON v.id = d.vehicle_id
    LEFT JOIN profiles p ON p.id = d.profile_id
    WHERE d.profile_id = auth.uid()) x;
$$;
GRANT EXECUTE ON FUNCTION public.my_driver() TO authenticated;

CREATE OR REPLACE FUNCTION public.driver_doc_submit(p_type text, p_path text, p_number text DEFAULT NULL, p_expiry date DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE d drivers;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF p_type NOT IN ('selfie', 'national_id_front', 'national_id_back', 'driving_license', 'vehicle_registration', 'insurance', 'vehicle_photo') THEN
    RAISE EXCEPTION 'bad_document';
  END IF;
  IF p_path IS NULL OR split_part(p_path, '/', 1) <> auth.uid()::text OR p_path LIKE '%..%' THEN RAISE EXCEPTION 'bad_document'; END IF;
  IF NOT EXISTS (SELECT 1 FROM storage.objects WHERE bucket_id = 'driver-docs' AND name = p_path) THEN RAISE EXCEPTION 'upload_missing'; END IF;
  IF p_expiry IS NOT NULL AND p_expiry < current_date THEN RAISE EXCEPTION 'document_expired'; END IF;
  SELECT * INTO d FROM drivers WHERE profile_id = auth.uid();
  IF d.id IS NULL THEN RAISE EXCEPTION 'not_a_driver'; END IF;
  IF d.status = 'BLOCKED' THEN RAISE EXCEPTION 'forbidden'; END IF;

  INSERT INTO driver_documents (driver_id, document_type, document_number, document_url, status, expiry_date, rejection_reason, updated_at)
  VALUES (d.id, p_type, left(NULLIF(trim(p_number), ''), 60), p_path, 'pending', p_expiry, NULL, now())
  ON CONFLICT (driver_id, document_type) DO UPDATE
    SET document_number = EXCLUDED.document_number, document_url = EXCLUDED.document_url, status = 'pending',
        expiry_date = EXCLUDED.expiry_date, rejection_reason = NULL, updated_at = now();

  IF p_type = 'driving_license' THEN
    UPDATE drivers SET license_number = COALESCE(left(NULLIF(trim(p_number), ''), 60), license_number), license_expiry = p_expiry WHERE id = d.id;
  ELSIF p_type = 'vehicle_registration' THEN
    UPDATE vehicles SET registration_number = COALESCE(left(NULLIF(trim(p_number), ''), 60), registration_number), registration_expiry = p_expiry WHERE id = d.vehicle_id;
  ELSIF p_type = 'insurance' THEN
    UPDATE vehicles SET insurance_number = COALESCE(left(NULLIF(trim(p_number), ''), 60), insurance_number), insurance_expiry = p_expiry WHERE id = d.vehicle_id;
  ELSIF p_type = 'national_id_front' AND NULLIF(trim(p_number), '') IS NOT NULL THEN
    UPDATE drivers SET national_id = left(trim(p_number), 60) WHERE id = d.id;
  ELSIF p_type = 'selfie' THEN
    PERFORM set_config('kap.bypass_guard', 'on', true);
    UPDATE profiles SET profile_picture_url = p_path WHERE id = auth.uid();
    PERFORM set_config('kap.bypass_guard', 'off', true);
  END IF;
  -- a rejected application goes back into the review queue when papers are re-sent
  IF d.status = 'REJECTED' THEN UPDATE drivers SET status = 'PENDING' WHERE id = d.id; END IF;
  RETURN my_driver();
END $$;
GRANT EXECUTE ON FUNCTION public.driver_doc_submit(text, text, text, date) TO authenticated;

-- registration needs a confirmed phone number once SMS codes are switched on
CREATE OR REPLACE FUNCTION public.driver_register(p_name text, p_phone text, p_vehicle_type text, p_make text,
                                                  p_model text, p_color text, p_plate text, p_city_id bigint)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_driver bigint; v_vehicle bigint; v_plate text; v_phone text; v_verified timestamptz;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF p_vehicle_type NOT IN ('ECONOMY','COMFORT','XL','BIKE','BICYCLE') THEN RAISE EXCEPTION 'bad_vehicle'; END IF;
  SELECT phone_number, phone_verified_at INTO v_phone, v_verified FROM profiles WHERE id = auth.uid();
  IF otp_ready() AND v_verified IS NULL THEN RAISE EXCEPTION 'phone_not_verified'; END IF;
  IF v_verified IS NULL THEN v_phone := left(p_phone, 30); END IF;
  v_plate := CASE WHEN p_vehicle_type = 'BICYCLE' AND coalesce(trim(p_plate),'') = '' THEN 'BICYCLE' ELSE trim(coalesce(p_plate,'')) END;
  IF coalesce(trim(p_name),'') = '' OR v_plate = '' THEN RAISE EXCEPTION 'missing_fields'; END IF;
  IF p_city_id IS NULL THEN RAISE EXCEPTION 'missing_fields'; END IF;
  SELECT id INTO v_driver FROM drivers WHERE profile_id = auth.uid();
  IF v_driver IS NULL THEN
    INSERT INTO drivers (profile_id, status, display_name, phone, city_id, rating, total_trips, is_online)
    VALUES (auth.uid(), 'PENDING', left(p_name, 120), v_phone, p_city_id, 5, 0, false)
    RETURNING id INTO v_driver;
  ELSE
    UPDATE drivers SET display_name = left(p_name, 120), phone = v_phone, city_id = p_city_id,
           status = CASE WHEN status IN ('REJECTED') THEN 'PENDING'::driver_status ELSE status END
    WHERE id = v_driver;
  END IF;
  SELECT vehicle_id INTO v_vehicle FROM drivers WHERE id = v_driver;
  IF v_vehicle IS NULL THEN
    INSERT INTO vehicles (driver_id, plate_number, vehicle_type, manufacturer, model, color, seats)
    VALUES (v_driver, left(v_plate, 50) || CASE WHEN EXISTS (SELECT 1 FROM vehicles WHERE plate_number = left(v_plate, 50)) THEN ' #' || v_driver ELSE '' END,
            p_vehicle_type, left(p_make, 100), left(p_model, 100), left(p_color, 50),
            CASE p_vehicle_type WHEN 'XL' THEN 6 WHEN 'BIKE' THEN 1 WHEN 'BICYCLE' THEN 1 ELSE 4 END)
    RETURNING id INTO v_vehicle;
    UPDATE drivers SET vehicle_id = v_vehicle WHERE id = v_driver;
  ELSE
    UPDATE vehicles SET vehicle_type = p_vehicle_type, manufacturer = left(p_make, 100), model = left(p_model, 100),
           color = left(p_color, 50),
           plate_number = CASE WHEN plate_number = left(v_plate, 50) OR NOT EXISTS (SELECT 1 FROM vehicles WHERE plate_number = left(v_plate, 50))
                               THEN left(v_plate, 50) ELSE plate_number END,
           seats = CASE p_vehicle_type WHEN 'XL' THEN 6 WHEN 'BIKE' THEN 1 WHEN 'BICYCLE' THEN 1 ELSE 4 END
     WHERE id = v_vehicle;
  END IF;
  PERFORM set_config('kap.bypass_guard', 'on', true);
  UPDATE profiles SET first_name = COALESCE(NULLIF(first_name, ''), left(p_name, 120)) WHERE id = auth.uid();
  PERFORM set_config('kap.bypass_guard', 'off', true);
  RETURN my_driver();
END $$;
GRANT EXECUTE ON FUNCTION public.driver_register(text, text, text, text, text, text, text, bigint) TO authenticated;

-- ================================================================ admin review
CREATE OR REPLACE FUNCTION public.admin_driver_docs(p_driver bigint)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN jsonb_build_object(
    'required', (SELECT driver_required_docs(COALESCE(v.vehicle_type, 'ECONOMY')) FROM drivers d LEFT JOIN vehicles v ON v.id = d.vehicle_id WHERE d.id = p_driver),
    'phone_verified_at', (SELECT p.phone_verified_at FROM drivers d JOIN profiles p ON p.id = d.profile_id WHERE d.id = p_driver),
    'docs', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', id, 'type', document_type, 'status', status, 'path', document_url,
                                                          'number', document_number, 'expiry', expiry_date, 'reason', rejection_reason,
                                                          'updated_at', updated_at) ORDER BY document_type)
                      FROM driver_documents WHERE driver_id = p_driver), '[]'::jsonb));
END $$;
GRANT EXECUTE ON FUNCTION public.admin_driver_docs(bigint) TO authenticated;

-- every time an admin opens a document it is written to the audit log
CREATE OR REPLACE FUNCTION public.admin_doc_viewed(p_doc bigint)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  INSERT INTO audit_logs (actor_id, action, entity_type, entity_id) VALUES (auth.uid(), 'document_viewed', 'driver_document', p_doc::text);
END $$;
GRANT EXECUTE ON FUNCTION public.admin_doc_viewed(bigint) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_review_doc(p_doc bigint, p_status text, p_reason text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE dd driver_documents; v_profile uuid;
BEGIN
  IF NOT is_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF p_status NOT IN ('approved', 'rejected', 're_upload_required') THEN RAISE EXCEPTION 'bad_status'; END IF;
  IF p_status <> 'approved' AND NULLIF(trim(p_reason), '') IS NULL THEN RAISE EXCEPTION 'reason_required'; END IF;
  SELECT * INTO dd FROM driver_documents WHERE id = p_doc;
  IF dd.id IS NULL THEN RAISE EXCEPTION 'not_found'; END IF;
  UPDATE driver_documents SET status = p_status::document_status,
         rejection_reason = CASE WHEN p_status = 'approved' THEN NULL ELSE left(trim(p_reason), 300) END, updated_at = now()
   WHERE id = p_doc;
  INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, old_value, new_value)
  VALUES (auth.uid(), 'document_review', 'driver_document', p_doc::text,
          jsonb_build_object('status', dd.status), jsonb_build_object('status', p_status, 'reason', p_reason));
  IF p_status <> 'approved' THEN
    SELECT profile_id INTO v_profile FROM drivers WHERE id = dd.driver_id;
    INSERT INTO notifications (user_id, notification_type, title, title_ar, message, message_ar, reference_id, is_read)
    VALUES (v_profile, 'system', 'A document needs attention', 'مستمسك يحتاج تحديث',
            'Please upload your document again: ' || trim(p_reason), 'يرجى إعادة رفع المستمسك: ' || trim(p_reason), 'driver', false);
  END IF;
  RETURN admin_driver_docs(dd.driver_id);
END $$;
GRANT EXECUTE ON FUNCTION public.admin_review_doc(bigint, text, text) TO authenticated;

-- a captain is approved only when every required paper is approved
CREATE OR REPLACE FUNCTION public.guard_driver_approval()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_type text; v_missing int;
BEGIN
  IF NEW.status = 'APPROVED' AND OLD.status IS DISTINCT FROM 'APPROVED' AND auth.uid() IS NOT NULL THEN
    SELECT vehicle_type INTO v_type FROM vehicles WHERE id = NEW.vehicle_id;
    SELECT count(*) INTO v_missing FROM unnest(driver_required_docs(COALESCE(v_type, 'ECONOMY'))) t
     WHERE NOT EXISTS (SELECT 1 FROM driver_documents dd WHERE dd.driver_id = NEW.id AND dd.document_type = t AND dd.status = 'approved');
    IF v_missing > 0 THEN RAISE EXCEPTION 'documents_incomplete'; END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS guard_driver_approval ON public.drivers;
CREATE TRIGGER guard_driver_approval BEFORE UPDATE OF status ON public.drivers
  FOR EACH ROW EXECUTE FUNCTION public.guard_driver_approval();

-- expired licence / registration / insurance: the captain can't go online until it's renewed
CREATE OR REPLACE FUNCTION public.driver_set_online(p_online boolean, p_lat double precision, p_lng double precision)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE d drivers;
BEGIN
  SELECT * INTO d FROM drivers WHERE profile_id = auth.uid();
  IF d.id IS NULL THEN RAISE EXCEPTION 'not_a_driver'; END IF;
  IF p_online THEN
    UPDATE driver_documents SET status = 'expired', updated_at = now()
     WHERE driver_id = d.id AND status = 'approved' AND expiry_date IS NOT NULL AND expiry_date < current_date;
    IF EXISTS (SELECT 1 FROM driver_documents WHERE driver_id = d.id AND status = 'expired') THEN
      UPDATE drivers SET is_online = false WHERE id = d.id;
      RETURN my_driver() || jsonb_build_object('blocked', 'documents_expired');
    END IF;
  END IF;
  UPDATE drivers SET is_online = p_online AND status = 'APPROVED',
         last_online_at = CASE WHEN p_online THEN now() ELSE last_online_at END,
         current_lat = COALESCE(p_lat, current_lat), current_lng = COALESCE(p_lng, current_lng), location_at = now()
  WHERE id = d.id;
  RETURN my_driver();
END $$;
GRANT EXECUTE ON FUNCTION public.driver_set_online(boolean, double precision, double precision) TO authenticated;
