-- KAP v11 — the store app reports the terminal it runs on (model, printer service, last print result),
-- so printing on new terminal models can be supported without asking the store for screenshots.
ALTER TABLE public.store_staff ADD COLUMN IF NOT EXISTS device_info jsonb;
ALTER TABLE public.store_staff ADD COLUMN IF NOT EXISTS device_seen_at timestamptz;

CREATE OR REPLACE FUNCTION public.merchant_device_report(p_info jsonb)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR jsonb_typeof(p_info) <> 'object' OR length(p_info::text) > 8000 THEN RETURN false; END IF;
  UPDATE store_staff SET device_info = COALESCE(device_info, '{}'::jsonb) || p_info, device_seen_at = now()
   WHERE user_id = auth.uid();
  RETURN FOUND;
END $$;
REVOKE EXECUTE ON FUNCTION public.merchant_device_report(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.merchant_device_report(jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_store_staff(p_store bigint)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN COALESCE((
    SELECT jsonb_agg(jsonb_build_object('user_id', ss.user_id, 'label', ss.label, 'role', ss.role,
             'phone', p.phone_number, 'created_at', ss.created_at,
             'device', NULLIF(trim(coalesce(ss.device_info->>'manufacturer', '') || ' ' || coalesce(ss.device_info->>'model', '')), ''),
             'last_print', ss.device_info->>'last_print', 'seen_at', ss.device_seen_at) ORDER BY ss.created_at)
    FROM store_staff ss LEFT JOIN profiles p ON p.id = ss.user_id WHERE ss.store_id = p_store), '[]'::jsonb);
END $$;
REVOKE EXECUTE ON FUNCTION public.admin_store_staff(bigint) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_store_staff(bigint) TO authenticated;
