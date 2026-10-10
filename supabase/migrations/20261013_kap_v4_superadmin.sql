-- KAP v4: super admin (username login), broadcast notifications, system controls.
-- Safe to re-run. The one-time setup code is NOT stored here: it is inserted separately
-- as a SHA-256 hash in kap_secrets (a table the app can never read).

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE TABLE IF NOT EXISTS kap_secrets (key text PRIMARY KEY, value text NOT NULL DEFAULT '');
ALTER TABLE kap_secrets ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON kap_secrets FROM anon, authenticated;

-- usernames sign in through an internal e-mail address derived from the exact username
CREATE OR REPLACE FUNCTION public.username_email(p_username text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT 'u' || encode(convert_to(p_username, 'UTF8'), 'hex') || '@admin.kap.app';
$$;

-- One-time creation of the super admin account. Needs the setup code; the code is consumed on success.
CREATE OR REPLACE FUNCTION public.setup_super_admin(p_username text, p_password text, p_code text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE
  v_hash  text := (SELECT value FROM kap_secrets WHERE key = 'superadmin_setup_code');
  v_email text := username_email(p_username);
  v_id    uuid;
BEGIN
  IF v_hash IS NULL OR v_hash = '' THEN RETURN jsonb_build_object('error', 'setup_closed'); END IF;
  IF encode(digest(coalesce(p_code, ''), 'sha256'), 'hex') <> v_hash THEN
    RETURN jsonb_build_object('error', 'bad_code');
  END IF;
  IF length(coalesce(p_username, '')) < 4 OR length(coalesce(p_password, '')) < 8 THEN
    RETURN jsonb_build_object('error', 'weak');
  END IF;

  SELECT id INTO v_id FROM auth.users WHERE email = v_email;
  IF v_id IS NULL THEN
    v_id := gen_random_uuid();
    INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
                            raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
                            confirmation_token, recovery_token, email_change_token_new, email_change)
    VALUES ('00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated', v_email,
            crypt(p_password, gen_salt('bf')), now(),
            '{"provider":"email","providers":["email"]}', jsonb_build_object('username', p_username),
            now(), now(), '', '', '', '');
    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (gen_random_uuid(), v_id, v_id::text,
            jsonb_build_object('sub', v_id::text, 'email', v_email, 'email_verified', true),
            'email', now(), now(), now());
  ELSE
    UPDATE auth.users SET encrypted_password = crypt(p_password, gen_salt('bf')),
                          email_confirmed_at = coalesce(email_confirmed_at, now()), updated_at = now()
    WHERE id = v_id;
  END IF;

  PERFORM set_config('kap.bypass_guard', 'on', true);
  INSERT INTO profiles (id, first_name, role, is_active) VALUES (v_id, 'Super Admin', 'super_admin', true)
  ON CONFLICT (id) DO UPDATE SET role = 'super_admin', is_active = true;
  PERFORM set_config('kap.bypass_guard', 'off', true);

  DELETE FROM kap_secrets WHERE key = 'superadmin_setup_code';
  INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, new_value)
  VALUES (v_id, 'setup_super_admin', 'profile', v_id::text, jsonb_build_object('username', p_username));
  RETURN jsonb_build_object('ok', true, 'email', v_email);
END $$;
REVOKE ALL ON FUNCTION public.setup_super_admin(text, text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.setup_super_admin(text, text, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin' AND coalesce(is_active, true));
$$;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;

-- ------------------------------------------------------------ broadcast notifications
CREATE OR REPLACE FUNCTION public.admin_broadcast(p_title text, p_title_ar text, p_audience text DEFAULT 'all')
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n int;
BEGIN
  IF NOT is_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF coalesce(trim(p_title), '') = '' AND coalesce(trim(p_title_ar), '') = '' THEN RAISE EXCEPTION 'missing_fields'; END IF;
  INSERT INTO notifications (user_id, title, title_ar, is_read, reference_id)
  SELECT p.id, left(coalesce(nullif(p_title, ''), p_title_ar), 200), left(coalesce(nullif(p_title_ar, ''), p_title), 200), false, 'broadcast'
  FROM profiles p
  WHERE coalesce(p.is_active, true)
    AND (p_audience = 'all'
         OR (p_audience = 'drivers' AND EXISTS (SELECT 1 FROM drivers d WHERE d.profile_id = p.id AND d.status = 'APPROVED'))
         OR (p_audience = 'customers' AND NOT EXISTS (SELECT 1 FROM drivers d WHERE d.profile_id = p.id)));
  GET DIAGNOSTICS n = ROW_COUNT;
  INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, new_value)
  VALUES (auth.uid(), 'broadcast', 'notifications', p_audience, jsonb_build_object('title', p_title, 'title_ar', p_title_ar, 'count', n));
  RETURN n;
END $$;
GRANT EXECUTE ON FUNCTION public.admin_broadcast(text, text, text) TO authenticated;

-- ------------------------------------------------------------ audit log reader (super admin)
CREATE OR REPLACE FUNCTION public.admin_audit(p_limit int DEFAULT 200)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN COALESCE((SELECT jsonb_agg(x ORDER BY x.id DESC) FROM (
    SELECT a.id, a.action, a.entity_type, a.entity_id, a.old_value, a.new_value, a.created_at,
           coalesce(p.first_name, p.phone_number, a.actor_id::text) AS actor
    FROM audit_logs a LEFT JOIN profiles p ON p.id = a.actor_id
    ORDER BY a.id DESC LIMIT least(greatest(p_limit, 1), 500)) x), '[]'::jsonb);
END $$;
GRANT EXECUTE ON FUNCTION public.admin_audit(int) TO authenticated;

-- ------------------------------------------------------------ system settings
INSERT INTO settings (key, value, description) VALUES
  ('maintenance_mode', 'off', 'Show a maintenance screen to customers and drivers'),
  ('maintenance_message', '', 'Message shown during maintenance'),
  ('min_app_version', '1.0.0', 'Oldest supported app version'),
  ('support_whatsapp', '', 'Support WhatsApp number')
ON CONFLICT (key) DO NOTHING;

SELECT 'KAP v4 applied ✅' AS result;
