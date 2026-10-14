-- KAP v10 — one store per device, and the device shows which city's branch it serves.
-- (Demo data has the same store name in every city, so the city must always be visible.)

CREATE OR REPLACE FUNCTION public.merchant_pair(p_code text, p_label text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE c store_pair_codes; v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not_signed_in'; END IF;
  IF (SELECT count(*) FROM store_pair_attempts WHERE user_id = v_uid AND at > now() - interval '10 minutes') >= 8 THEN
    RAISE EXCEPTION 'too_many_attempts';
  END IF;
  INSERT INTO store_pair_attempts (user_id) VALUES (v_uid);
  SELECT * INTO c FROM store_pair_codes
   WHERE code_hash = encode(digest(regexp_replace(coalesce(p_code, ''), '\D', '', 'g'), 'sha256'), 'hex')
     AND used_at IS NULL AND expires_at > now()
   FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'invalid_code'; END IF;
  UPDATE store_pair_codes SET used_at = now(), used_by = v_uid WHERE code_hash = c.code_hash;
  -- a device serves one store: a new code moves it
  DELETE FROM store_staff WHERE user_id = v_uid AND store_id <> c.store_id;
  INSERT INTO store_staff (store_id, user_id, label) VALUES (c.store_id, v_uid, left(p_label, 60))
  ON CONFLICT (store_id, user_id) DO UPDATE SET label = COALESCE(EXCLUDED.label, store_staff.label);
  RETURN (SELECT jsonb_build_object('store_id', s.id, 'name', s.name, 'name_ar', s.name_ar) FROM stores s WHERE s.id = c.store_id);
END $$;
REVOKE EXECUTE ON FUNCTION public.merchant_pair(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.merchant_pair(text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.merchant_stores()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(jsonb_agg(jsonb_build_object('id', s.id, 'name', s.name, 'name_ar', s.name_ar, 'is_open', s.is_open,
           'address', s.address, 'currency', co.currency_code, 'city', ci.name, 'city_ar', ci.name_ar) ORDER BY ss.created_at DESC), '[]'::jsonb)
  FROM store_staff ss JOIN stores s ON s.id = ss.store_id
  JOIN cities ci ON ci.id = s.city_id JOIN countries co ON co.id = ci.country_id
  WHERE ss.user_id = auth.uid();
$$;
REVOKE EXECUTE ON FUNCTION public.merchant_stores() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.merchant_stores() TO authenticated;
