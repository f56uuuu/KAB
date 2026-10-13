-- KAP v9 — restaurant / store device (Android POS terminal with a built-in printer)
-- A store gets staff accounts. The admin creates a short-lived pairing code for a store;
-- the device signs in, enters the code and becomes that store's order screen.
-- Orders for a store with staff wait for the store to accept them (no demo auto-accept).

-- ---------- staff ----------
CREATE TABLE IF NOT EXISTS public.store_staff (
  store_id   bigint NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  user_id    uuid   NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role       text   NOT NULL DEFAULT 'staff' CHECK (role IN ('owner','staff')),
  label      text,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (store_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_store_staff_user ON public.store_staff(user_id);
ALTER TABLE public.store_staff ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.store_staff FROM anon;
DROP POLICY IF EXISTS store_staff_self ON public.store_staff;
CREATE POLICY store_staff_self ON public.store_staff FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin());

-- ---------- pairing codes (only a hash is stored) ----------
CREATE TABLE IF NOT EXISTS public.store_pair_codes (
  code_hash  text PRIMARY KEY,
  store_id   bigint NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  created_by uuid,
  used_at    timestamptz,
  used_by    uuid
);
ALTER TABLE public.store_pair_codes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.store_pair_codes FROM anon, authenticated;

CREATE TABLE IF NOT EXISTS public.store_pair_attempts (
  id      bigserial PRIMARY KEY,
  user_id uuid NOT NULL,
  at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pair_attempts_user ON public.store_pair_attempts(user_id, at);
ALTER TABLE public.store_pair_attempts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.store_pair_attempts FROM anon, authenticated;

-- ---------- order timestamps set by the store ----------
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS accepted_at   timestamptz;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS ready_at      timestamptz;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS reject_reason text;
CREATE INDEX IF NOT EXISTS idx_orders_store_created ON public.orders(store_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.is_store_staff(p_store bigint)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM store_staff WHERE store_id = p_store AND user_id = auth.uid());
$$;
REVOKE EXECUTE ON FUNCTION public.is_store_staff(bigint) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_store_staff(bigint) TO authenticated;

-- ---------- admin: pairing code, staff list, unlink ----------
CREATE OR REPLACE FUNCTION public.admin_store_pair_code(p_store bigint)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE v_code text;
BEGIN
  IF NOT is_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF NOT EXISTS (SELECT 1 FROM stores WHERE id = p_store) THEN RAISE EXCEPTION 'not_found'; END IF;
  DELETE FROM store_pair_codes WHERE store_id = p_store AND used_at IS NULL;
  v_code := lpad((floor(random() * 1000000))::int::text, 6, '0');
  INSERT INTO store_pair_codes (code_hash, store_id, expires_at, created_by)
  VALUES (encode(digest(v_code, 'sha256'), 'hex'), p_store, now() + interval '30 minutes', auth.uid());
  RETURN v_code;
END $$;
REVOKE EXECUTE ON FUNCTION public.admin_store_pair_code(bigint) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_store_pair_code(bigint) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_store_staff(p_store bigint)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN COALESCE((
    SELECT jsonb_agg(jsonb_build_object('user_id', ss.user_id, 'label', ss.label, 'role', ss.role,
             'phone', p.phone_number, 'created_at', ss.created_at) ORDER BY ss.created_at)
    FROM store_staff ss LEFT JOIN profiles p ON p.id = ss.user_id WHERE ss.store_id = p_store), '[]'::jsonb);
END $$;
REVOKE EXECUTE ON FUNCTION public.admin_store_staff(bigint) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_store_staff(bigint) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_store_staff_remove(p_store bigint, p_user uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  DELETE FROM store_staff WHERE store_id = p_store AND user_id = p_user;
  RETURN FOUND;
END $$;
REVOKE EXECUTE ON FUNCTION public.admin_store_staff_remove(bigint, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_store_staff_remove(bigint, uuid) TO authenticated;

-- ---------- device: pair with a code ----------
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
  INSERT INTO store_staff (store_id, user_id, label) VALUES (c.store_id, v_uid, left(p_label, 60))
  ON CONFLICT (store_id, user_id) DO NOTHING;
  RETURN (SELECT jsonb_build_object('store_id', s.id, 'name', s.name, 'name_ar', s.name_ar) FROM stores s WHERE s.id = c.store_id);
END $$;
REVOKE EXECUTE ON FUNCTION public.merchant_pair(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.merchant_pair(text, text) TO authenticated;

-- ---------- device: my stores, orders, actions ----------
CREATE OR REPLACE FUNCTION public.merchant_stores()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(jsonb_agg(jsonb_build_object('id', s.id, 'name', s.name, 'name_ar', s.name_ar, 'is_open', s.is_open,
           'address', s.address, 'currency', co.currency_code) ORDER BY s.name), '[]'::jsonb)
  FROM store_staff ss JOIN stores s ON s.id = ss.store_id
  JOIN cities ci ON ci.id = s.city_id JOIN countries co ON co.id = ci.country_id
  WHERE ss.user_id = auth.uid();
$$;
REVOKE EXECUTE ON FUNCTION public.merchant_stores() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.merchant_stores() TO authenticated;

-- Active orders plus the last 24 hours of finished ones. Customer details are limited to a first name.
CREATE OR REPLACE FUNCTION public.merchant_orders(p_store bigint)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_store_staff(p_store) THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'id', o.id, 'status', o.status, 'created_at', o.created_at AT TIME ZONE 'UTC',
      'accepted_at', o.accepted_at, 'ready_at', o.ready_at,
      'subtotal', o.subtotal, 'delivery_fee', o.delivery_fee, 'discount', o.discount, 'total', o.total_amount,
      'currency', o.currency_code, 'payment_method', o.payment_method, 'notes', o.notes,
      'customer', NULLIF(split_part(coalesce(p.first_name, ''), ' ', 1), ''),
      'driver_assigned', o.driver_id IS NOT NULL,
      'items', (SELECT COALESCE(jsonb_agg(jsonb_build_object('name', i.product_name, 'qty', i.quantity, 'price', i.price) ORDER BY i.id), '[]'::jsonb)
                FROM order_items i WHERE i.order_id = o.id)
    ) ORDER BY o.created_at DESC)
    FROM orders o LEFT JOIN profiles p ON p.id = o.customer_id
    WHERE o.store_id = p_store
      AND (o.status IN ('PLACED','PREPARING','DRIVER_ASSIGNED','PICKED_UP','ON_THE_WAY')
           OR o.created_at > (now() AT TIME ZONE 'UTC') - interval '24 hours')
    ), '[]'::jsonb);
END $$;
REVOKE EXECUTE ON FUNCTION public.merchant_orders(bigint) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.merchant_orders(bigint) TO authenticated;

-- accept: PLACED -> PREPARING · reject: PLACED -> CANCELLED · ready: marks the food ready for the captain
CREATE OR REPLACE FUNCTION public.merchant_order_action(p_order bigint, p_action text, p_reason text DEFAULT NULL)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE o orders;
BEGIN
  SELECT * INTO o FROM orders WHERE id = p_order FOR UPDATE;
  IF NOT FOUND OR NOT is_store_staff(o.store_id) THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF p_action = 'accept' THEN
    IF o.status <> 'PLACED' THEN RETURN o.status; END IF;
    UPDATE orders SET status = 'PREPARING', accepted_at = now(), updated_at = now() WHERE id = p_order;
    RETURN 'PREPARING';
  ELSIF p_action = 'reject' THEN
    IF o.status <> 'PLACED' THEN RAISE EXCEPTION 'too_late'; END IF;
    UPDATE orders SET status = 'CANCELLED', cancelled_at = now(), updated_at = now(),
                      reject_reason = left(NULLIF(trim(p_reason), ''), 200) WHERE id = p_order;
    RETURN 'CANCELLED';
  ELSIF p_action = 'ready' THEN
    IF o.status NOT IN ('PREPARING','DRIVER_ASSIGNED') THEN RETURN o.status; END IF;
    UPDATE orders SET ready_at = COALESCE(ready_at, now()), updated_at = now() WHERE id = p_order;
    RETURN o.status;
  END IF;
  RAISE EXCEPTION 'bad_action';
END $$;
REVOKE EXECUTE ON FUNCTION public.merchant_order_action(bigint, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.merchant_order_action(bigint, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.merchant_set_open(p_store bigint, p_open boolean)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_store_staff(p_store) THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE stores SET is_open = p_open WHERE id = p_store;
  RETURN p_open;
END $$;
REVOKE EXECUTE ON FUNCTION public.merchant_set_open(bigint, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.merchant_set_open(bigint, boolean) TO authenticated;

-- ---------- demo mode must not accept orders on behalf of a store that has its own device ----------
DO $patch$
DECLARE d text;
BEGIN
  d := pg_get_functiondef('public.demo_tick(text,bigint)'::regprocedure);
  IF position('store_staff' in d) = 0 THEN
    d := replace(d,
$a$    IF o.status = 'PLACED' THEN
      IF o.created_at > now() - interval '5 seconds' THEN RETURN 'waiting'; END IF;$a$,
$b$    IF o.status = 'PLACED' THEN
      IF EXISTS (SELECT 1 FROM store_staff WHERE store_id = o.store_id) THEN RETURN 'PLACED'; END IF;
      IF o.created_at > now() - interval '5 seconds' THEN RETURN 'waiting'; END IF;$b$);
    IF position('store_staff' in d) = 0 THEN RAISE EXCEPTION 'demo_tick patch did not apply'; END IF;
    EXECUTE d;
  END IF;
END $patch$;
