-- KAP v6: in-app account deletion (Google Play + App Store requirement) and store-listing settings.
-- Trips, orders and payments are kept for legal/financial records but detached from personal data.

CREATE OR REPLACE FUNCTION public.delete_my_account(p_reason text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_role text;
  v_driver bigint;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  SELECT role::text INTO v_role FROM profiles WHERE id = v_uid;
  IF v_role IN ('admin', 'super_admin') THEN RAISE EXCEPTION 'admin_account'; END IF;

  -- an open trip or order must finish first
  IF EXISTS (SELECT 1 FROM rides WHERE customer_id = v_uid AND upper(status::text) NOT IN ('COMPLETED','CANCELLED'))
     OR EXISTS (SELECT 1 FROM deliveries WHERE customer_id = v_uid AND upper(status::text) NOT IN ('DELIVERED','COMPLETED','CANCELLED'))
     OR EXISTS (SELECT 1 FROM orders WHERE customer_id = v_uid AND upper(status::text) NOT IN ('DELIVERED','COMPLETED','CANCELLED')) THEN
    RAISE EXCEPTION 'active_job';
  END IF;

  PERFORM set_config('kap.bypass_guard', 'on', true);

  INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, new_value)
  VALUES (v_uid, 'account_deleted', 'profiles', v_uid::text, jsonb_build_object('reason', left(coalesce(p_reason, ''), 300)));

  -- personal data
  DELETE FROM addresses WHERE profile_id = v_uid;
  DELETE FROM notifications WHERE user_id = v_uid;
  DELETE FROM notification_preferences WHERE user_id = v_uid;

  SELECT id INTO v_driver FROM drivers WHERE profile_id = v_uid;
  IF v_driver IS NOT NULL THEN
    DELETE FROM driver_documents WHERE driver_id = v_driver;
    UPDATE drivers SET is_online = false, display_name = 'Deleted', phone = NULL, national_id = NULL, license_number = NULL, bank_account = NULL, iban = NULL,
      current_lat = NULL, current_lng = NULL, admin_notes = coalesce(admin_notes, '') || ' [account deleted ' || now()::date || ']'
    WHERE id = v_driver;
    UPDATE vehicles SET is_active = false, insurance_number = NULL, registration_number = NULL WHERE driver_id = v_driver;
  END IF;

  UPDATE profiles SET first_name = NULL, last_name = NULL, phone_number = NULL, email = NULL, profile_picture_url = NULL,
    is_active = false, updated_at = now()
  WHERE id = v_uid;

  -- sign-in identity: remove the phone/email and block the login
  DELETE FROM auth.identities WHERE user_id = v_uid;
  DELETE FROM auth.sessions WHERE user_id = v_uid;
  UPDATE auth.users SET phone = NULL, email = NULL, raw_user_meta_data = '{}'::jsonb, banned_until = 'infinity', updated_at = now()
  WHERE id = v_uid;

  RETURN jsonb_build_object('ok', true);
END $$;

REVOKE ALL ON FUNCTION public.delete_my_account(text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.delete_my_account(text) TO authenticated;

-- public contact details shown on /support and in the store listings (filled from the System page)
INSERT INTO settings (key, value, description) VALUES
  ('support_email', '', 'Public support email (required by Google Play and the App Store)'),
  ('company_name', 'KAP', 'Legal name of the operator shown in Terms and Privacy')
ON CONFLICT (key) DO NOTHING;
