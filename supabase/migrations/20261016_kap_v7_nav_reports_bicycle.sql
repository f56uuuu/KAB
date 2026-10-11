-- KAP v7: Waze-style road reports + bicycle captains
-- Safe to run more than once.

-- ---------------------------------------------------------------- road reports
CREATE TABLE IF NOT EXISTS public.road_reports (
  id          bigserial PRIMARY KEY,
  profile_id  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  kind        text NOT NULL CHECK (kind IN ('traffic','police','accident','hazard','closure','lane','map','weather','fuel','animal','help','place')),
  lat         double precision NOT NULL CHECK (lat BETWEEN -90 AND 90),
  lng         double precision NOT NULL CHECK (lng BETWEEN -180 AND 180),
  note        text CHECK (char_length(note) <= 200),
  confirms    int NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  expires_at  timestamptz NOT NULL DEFAULT now() + interval '2 hours'
);
CREATE INDEX IF NOT EXISTS road_reports_live_idx ON public.road_reports (expires_at, lat, lng);
ALTER TABLE public.road_reports ENABLE ROW LEVEL SECURITY;
-- no direct table access: everything goes through the functions below
REVOKE ALL ON public.road_reports FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.report_road(p_kind text, p_lat double precision, p_lng double precision, p_note text DEFAULT NULL)
RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id bigint; v_ttl interval;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  -- rate limit: 10 reports per user per 10 minutes
  IF (SELECT count(*) FROM road_reports WHERE profile_id = auth.uid() AND created_at > now() - interval '10 minutes') >= 10 THEN
    RAISE EXCEPTION 'rate_limited';
  END IF;
  v_ttl := CASE p_kind WHEN 'map' THEN interval '30 days' WHEN 'place' THEN interval '30 days' WHEN 'fuel' THEN interval '24 hours'
                       WHEN 'closure' THEN interval '12 hours' WHEN 'weather' THEN interval '6 hours' WHEN 'police' THEN interval '1 hour'
                       ELSE interval '2 hours' END;
  -- same kind already reported within ~150 m: count it as a confirmation instead of a duplicate pin
  UPDATE road_reports SET confirms = confirms + 1, expires_at = GREATEST(expires_at, now() + v_ttl)
   WHERE id = (SELECT id FROM road_reports WHERE kind = p_kind AND expires_at > now()
                 AND km_between(lat, lng, p_lat, p_lng) < 0.15 ORDER BY created_at DESC LIMIT 1)
  RETURNING id INTO v_id;
  IF v_id IS NOT NULL THEN RETURN v_id; END IF;
  INSERT INTO road_reports (profile_id, kind, lat, lng, note, expires_at)
  VALUES (auth.uid(), p_kind, p_lat, p_lng, NULLIF(left(trim(coalesce(p_note, '')), 200), ''), now() + v_ttl)
  RETURNING id INTO v_id;
  RETURN v_id;
END $$;
REVOKE ALL ON FUNCTION public.report_road(text, double precision, double precision, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.report_road(text, double precision, double precision, text) TO authenticated;

-- live reports around a point (no reporter identity is returned)
CREATE OR REPLACE FUNCTION public.road_reports_near(p_lat double precision, p_lng double precision, p_km double precision DEFAULT 25)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(jsonb_agg(jsonb_build_object('id', id, 'kind', kind, 'lat', lat, 'lng', lng, 'note', note,
                                               'confirms', confirms, 'created_at', created_at) ORDER BY created_at DESC), '[]'::jsonb)
  FROM (SELECT * FROM road_reports
         WHERE expires_at > now()
           AND lat BETWEEN p_lat - LEAST(p_km, 50) / 111.0 AND p_lat + LEAST(p_km, 50) / 111.0
           AND km_between(lat, lng, p_lat, p_lng) <= LEAST(p_km, 50)
         ORDER BY created_at DESC LIMIT 200) r;
$$;
REVOKE ALL ON FUNCTION public.road_reports_near(double precision, double precision, double precision) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.road_reports_near(double precision, double precision, double precision) TO authenticated;

-- ---------------------------------------------------------------- bicycle captains
-- allow BICYCLE wherever vehicle_type is constrained
DO $$
DECLARE c record; t text;
BEGIN
  SELECT format_type(atttypid, atttypmod) INTO t FROM pg_attribute
   WHERE attrelid = 'public.vehicles'::regclass AND attname = 'vehicle_type';
  IF t IS NOT NULL AND t NOT LIKE 'character%' AND t <> 'text' THEN
    EXECUTE format('ALTER TYPE %s ADD VALUE IF NOT EXISTS %L', t, 'BICYCLE');
  END IF;
  FOR c IN SELECT conname FROM pg_constraint
            WHERE conrelid = 'public.vehicles'::regclass AND contype = 'c' AND pg_get_constraintdef(oid) ILIKE '%vehicle_type%'
  LOOP
    EXECUTE format('ALTER TABLE public.vehicles DROP CONSTRAINT %I', c.conname);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.driver_register(p_name text, p_phone text, p_vehicle_type text, p_make text,
                                                  p_model text, p_color text, p_plate text, p_city_id bigint)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_driver bigint; v_vehicle bigint; v_plate text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF p_vehicle_type NOT IN ('ECONOMY','COMFORT','XL','BIKE','BICYCLE') THEN RAISE EXCEPTION 'bad_vehicle'; END IF;
  -- bicycles have no number plate
  v_plate := CASE WHEN p_vehicle_type = 'BICYCLE' AND coalesce(trim(p_plate),'') = '' THEN 'BICYCLE' ELSE trim(coalesce(p_plate,'')) END;
  IF coalesce(trim(p_name),'') = '' OR v_plate = '' THEN RAISE EXCEPTION 'missing_fields'; END IF;
  SELECT id INTO v_driver FROM drivers WHERE profile_id = auth.uid();
  IF v_driver IS NULL THEN
    INSERT INTO drivers (profile_id, status, display_name, phone, city_id, rating, total_trips, is_online)
    VALUES (auth.uid(), 'PENDING', left(p_name, 120), left(p_phone, 30), p_city_id, 5, 0, false)
    RETURNING id INTO v_driver;
  ELSE
    UPDATE drivers SET display_name = left(p_name, 120), phone = left(p_phone, 30), city_id = p_city_id,
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
           seats = CASE p_vehicle_type WHEN 'XL' THEN 6 WHEN 'BIKE' THEN 1 WHEN 'BICYCLE' THEN 1 ELSE 4 END
     WHERE id = v_vehicle;
  END IF;
  UPDATE profiles SET first_name = COALESCE(NULLIF(first_name, ''), left(p_name, 120)) WHERE id = auth.uid();
  RETURN my_driver();
END $$;
GRANT EXECUTE ON FUNCTION public.driver_register(text, text, text, text, text, text, text, bigint) TO authenticated;

-- two-wheelers (motorbike, bicycle) take deliveries and orders, not passenger rides;
-- bicycles stay within a short radius
CREATE OR REPLACE FUNCTION public.driver_jobs()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE d drivers; v_type text; v_radius numeric := setting_num('driver_search_radius_km', 30); v_two boolean;
BEGIN
  SELECT * INTO d FROM drivers WHERE profile_id = auth.uid();
  IF d.id IS NULL OR d.status <> 'APPROVED' OR NOT d.is_online OR d.current_lat IS NULL THEN RETURN '[]'::jsonb; END IF;
  SELECT vehicle_type INTO v_type FROM vehicles WHERE id = d.vehicle_id;
  v_two := v_type IN ('BIKE','BICYCLE');
  IF v_type = 'BICYCLE' THEN v_radius := LEAST(v_radius, setting_num('bicycle_search_radius_km', 5)); END IF;
  RETURN COALESCE((SELECT jsonb_agg(j ORDER BY (j->>'pickup_km')::numeric) FROM (
    SELECT jsonb_build_object('kind','ride','id',r.id,'title',r.vehicle_type,'from',r.pickup_address,'to',r.dropoff_address,
             'from_lat',r.pickup_latitude,'from_lng',r.pickup_longitude,'to_lat',r.dropoff_latitude,'to_lng',r.dropoff_longitude,
             'fare',r.estimated_fare,'currency',r.currency_code,'km',r.distance_km,
             'pickup_km',round(km_between(d.current_lat, d.current_lng, r.pickup_latitude, r.pickup_longitude)::numeric, 1),
             'created_at',r.requested_at) AS j
    FROM rides r
    WHERE r.status = 'SEARCHING' AND r.driver_id IS NULL AND NOT v_two
      AND (r.vehicle_type = v_type OR (v_type IN ('COMFORT','XL') AND r.vehicle_type = 'ECONOMY'))
      AND km_between(d.current_lat, d.current_lng, r.pickup_latitude, r.pickup_longitude) <= v_radius
    UNION ALL
    SELECT jsonb_build_object('kind','delivery','id',x.id,'title',x.package_description,'from',x.pickup_location,'to',x.dropoff_location,
             'from_lat',x.pickup_latitude,'from_lng',x.pickup_longitude,'to_lat',x.dropoff_latitude,'to_lng',x.dropoff_longitude,
             'fare',x.estimated_fare,'currency',x.currency_code,'km',x.distance_km,
             'pickup_km',round(km_between(d.current_lat, d.current_lng, x.pickup_latitude, x.pickup_longitude)::numeric, 1),
             'created_at',x.created_at)
    FROM deliveries x
    WHERE x.status = 'CREATED' AND x.driver_id IS NULL
      AND (x.delivery_type = 'BIKE' OR NOT v_two)
      AND km_between(d.current_lat, d.current_lng, x.pickup_latitude, x.pickup_longitude) <= v_radius
    UNION ALL
    SELECT jsonb_build_object('kind','order','id',o.id,'title',s.name_ar,'from',s.name_ar || ' — ' || COALESCE(s.address,''),'to',o.delivery_address,
             'from_lat',s.latitude,'from_lng',s.longitude,'to_lat',o.delivery_lat,'to_lng',o.delivery_lng,
             'fare',o.delivery_fee,'currency',o.currency_code,
             'km',round(km_between(s.latitude, s.longitude, o.delivery_lat, o.delivery_lng)::numeric, 1),
             'pickup_km',round(km_between(d.current_lat, d.current_lng, s.latitude, s.longitude)::numeric, 1),
             'created_at',o.created_at)
    FROM orders o JOIN stores s ON s.id = o.store_id
    WHERE o.status IN ('PLACED','PREPARING') AND o.driver_id IS NULL
      AND km_between(d.current_lat, d.current_lng, s.latitude, s.longitude) <= v_radius
  ) t), '[]'::jsonb);
END $$;
GRANT EXECUTE ON FUNCTION public.driver_jobs() TO authenticated;
