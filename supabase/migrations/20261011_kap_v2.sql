-- KAP v2 — food & market, package delivery, real driver flow, admin control, notifications.
-- Idempotent: safe to run more than once. Every price is computed on the server.

-- ============================================================ enums
ALTER TYPE driver_status ADD VALUE IF NOT EXISTS 'REJECTED';

-- ============================================================ helpers
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM profiles
                 WHERE id = auth.uid() AND role IN ('admin','super_admin') AND COALESCE(is_active, true));
$$;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

CREATE OR REPLACE FUNCTION public.km_between(lat1 double precision, lng1 double precision,
                                             lat2 double precision, lng2 double precision)
RETURNS double precision LANGUAGE sql IMMUTABLE AS $$
  SELECT 6371 * 2 * asin(sqrt(
    power(sin(radians(lat2 - lat1) / 2), 2) +
    cos(radians(lat1)) * cos(radians(lat2)) * power(sin(radians(lng2 - lng1) / 2), 2)));
$$;

CREATE OR REPLACE FUNCTION public.round_money(amount numeric, currency text)
RETURNS numeric LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE WHEN currency IN ('IQD','SYP') THEN ceil(GREATEST(amount, 0) / 250) * 250
              ELSE round(GREATEST(amount, 0), 2) END;
$$;

CREATE OR REPLACE FUNCTION public.flag_on(p_name text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT is_enabled FROM feature_flags WHERE name = p_name LIMIT 1), false);
$$;

CREATE OR REPLACE FUNCTION public.setting_num(p_key text, p_default numeric)
RETURNS numeric LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT value::numeric FROM settings WHERE key = p_key LIMIT 1), p_default);
$$;

-- ============================================================ settings & flags
INSERT INTO settings (key, value, description) VALUES
  ('platform_commission_pct', '15', 'Platform commission taken from each completed job (%)'),
  ('driver_search_radius_km', '30', 'How far away drivers see open jobs'),
  ('support_phone', '+9647700000000', 'Support phone shown in the app'),
  ('app_name', 'KAP', 'App name')
ON CONFLICT (key) DO NOTHING;

INSERT INTO feature_flags (name, is_enabled, description) VALUES
  ('RIDE', true, 'Taxi rides'),
  ('DELIVERY', true, 'Send a package'),
  ('FOOD', true, 'Restaurants & cafes'),
  ('MARKET', true, 'Groceries, pharmacy & shops'),
  ('OFFERS', true, 'Offers & coupons'),
  ('DEMO_MODE', true, 'Demo driver auto-accepts and completes jobs (testing only — turn OFF before launch)')
ON CONFLICT (name) DO NOTHING;

-- ============================================================ drivers & vehicles
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS admin_notes  text;
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS city_id      bigint REFERENCES cities(id);
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS phone        varchar(30);
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS location_at  timestamptz;
CREATE INDEX IF NOT EXISTS idx_drivers_online ON drivers(is_online) WHERE is_online;

-- ============================================================ stores & products
CREATE TABLE IF NOT EXISTS stores (
  id              bigserial PRIMARY KEY,
  city_id         bigint NOT NULL REFERENCES cities(id) ON DELETE CASCADE,
  name            varchar(120) NOT NULL,
  name_ar         varchar(120) NOT NULL,
  category        varchar(30)  NOT NULL DEFAULT 'restaurant', -- restaurant|cafe|sweets|grocery|pharmacy|flowers
  emoji           varchar(16)  NOT NULL DEFAULT '🍽️',
  color           varchar(16)  NOT NULL DEFAULT '#FFD100',
  rating          numeric(2,1) NOT NULL DEFAULT 4.6,
  delivery_minutes int         NOT NULL DEFAULT 30,
  delivery_fee    numeric(12,2) NOT NULL DEFAULT 0,
  min_order       numeric(12,2) NOT NULL DEFAULT 0,
  latitude        double precision NOT NULL,
  longitude       double precision NOT NULL,
  address         text,
  is_open         boolean NOT NULL DEFAULT true,
  is_active       boolean NOT NULL DEFAULT true,
  sort            int NOT NULL DEFAULT 0,
  created_at      timestamptz DEFAULT now(),
  UNIQUE (city_id, name)
);
CREATE INDEX IF NOT EXISTS idx_stores_city ON stores(city_id, category);

CREATE TABLE IF NOT EXISTS products (
  id           bigserial PRIMARY KEY,
  store_id     bigint NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name         varchar(120) NOT NULL,
  name_ar      varchar(120) NOT NULL,
  description  text,
  section      varchar(60) NOT NULL DEFAULT 'Menu',
  price        numeric(12,2) NOT NULL CHECK (price >= 0),
  emoji        varchar(16) NOT NULL DEFAULT '🍽️',
  is_available boolean NOT NULL DEFAULT true,
  sort         int NOT NULL DEFAULT 0,
  created_at   timestamptz DEFAULT now(),
  UNIQUE (store_id, name)
);
CREATE INDEX IF NOT EXISTS idx_products_store ON products(store_id);

-- ============================================================ orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS store_id         bigint REFERENCES stores(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS driver_id        bigint REFERENCES drivers(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS city_id          bigint REFERENCES cities(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS currency_code    varchar(3);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS subtotal         numeric(12,2);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_fee     numeric(12,2);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount         numeric(12,2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS coupon_code      varchar(40);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_address text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_lat     double precision;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_lng     double precision;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS notes            text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method   varchar(20) DEFAULT 'cash';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS completed_at     timestamptz;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancelled_at     timestamptz;
ALTER TABLE orders ALTER COLUMN status SET DEFAULT 'PLACED';
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status   ON orders(status);

ALTER TABLE order_items ADD COLUMN IF NOT EXISTS product_id bigint REFERENCES products(id);
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS emoji      varchar(16);

-- ============================================================ deliveries (send a package)
ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS currency_code varchar(3);
ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS distance_km   numeric(10,2);
ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS duration_min  int;
ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS city_id       bigint REFERENCES cities(id);
ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS discount      numeric(12,2) DEFAULT 0;
ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS coupon_code   varchar(40);
ALTER TABLE deliveries ALTER COLUMN pickup_location  TYPE text;
ALTER TABLE deliveries ALTER COLUMN dropoff_location TYPE text;
CREATE INDEX IF NOT EXISTS idx_deliveries_customer ON deliveries(customer_id, created_at DESC);

ALTER TABLE rides ADD COLUMN IF NOT EXISTS discount    numeric(12,2) DEFAULT 0;
ALTER TABLE rides ADD COLUMN IF NOT EXISTS coupon_code varchar(40);

-- ============================================================ banners, coupons, ratings, audit
ALTER TABLE banners ADD COLUMN IF NOT EXISTS color  varchar(16) DEFAULT '#FFD100';
ALTER TABLE banners ADD COLUMN IF NOT EXISTS emoji  varchar(16) DEFAULT '🎁';
ALTER TABLE banners ADD COLUMN IF NOT EXISTS link   varchar(120);
ALTER TABLE banners ADD COLUMN IF NOT EXISTS sort   int DEFAULT 0;

ALTER TABLE coupons ADD COLUMN IF NOT EXISTS description    text;
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS description_ar text;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'coupons_code_key') THEN
    ALTER TABLE coupons ADD CONSTRAINT coupons_code_key UNIQUE (code);
  END IF;
END $$;

ALTER TABLE ratings ADD COLUMN IF NOT EXISTS job_kind varchar(10);
ALTER TABLE ratings ADD COLUMN IF NOT EXISTS job_id   bigint;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ratings_job_unique') THEN
    ALTER TABLE ratings ADD CONSTRAINT ratings_job_unique UNIQUE (job_kind, job_id);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS audit_logs (
  id          bigserial PRIMARY KEY,
  actor_id    uuid,
  action      varchar(60) NOT NULL,
  entity_type varchar(40),
  entity_id   varchar(60),
  old_value   jsonb,
  new_value   jsonb,
  created_at  timestamptz DEFAULT now()
);

-- ============================================================ seed: delivery pricing, coupons, banners
INSERT INTO pricing_rules (service_key, city_id, vehicle_type, base_fare, per_km, per_min, min_fare, cancellation_fee)
SELECT 'DELIVERY', ci.id, vt.t, round(p.base * vt.m), round(p.km * vt.m, 2), 0, round(p.minf * vt.m), 0
FROM cities ci
JOIN countries co ON co.id = ci.country_id
JOIN (VALUES ('IQ', 2000::numeric, 300::numeric, 3000::numeric),
             ('AE', 8, 1.5, 10),
             ('SY', 6000, 1200, 10000)) AS p(cc, base, km, minf) ON p.cc = co.code
CROSS JOIN (VALUES ('BIKE', 1.0), ('CAR', 1.4)) AS vt(t, m)
ON CONFLICT (service_key, city_id, vehicle_type) DO NOTHING;

INSERT INTO coupons (code, discount_type, discount_value, service_type, maximum_uses, uses_count, is_active, expiry_date, description, description_ar)
VALUES
  ('KAP10',   'PERCENT', 10,  'ALL',      10000, 0, true, current_date + 365, '10% off any order', 'خصم 10% على أي طلب'),
  ('RIDE15',  'PERCENT', 15,  'RIDE',     10000, 0, true, current_date + 365, '15% off your ride', 'خصم 15% على رحلتك'),
  ('FOOD20',  'PERCENT', 20,  'FOOD',     10000, 0, true, current_date + 365, '20% off food orders', 'خصم 20% على طلبات الطعام'),
  ('FREEDEL', 'FREE_DELIVERY', 0, 'FOOD', 10000, 0, true, current_date + 365, 'Free delivery on food & market', 'توصيل مجاني للطعام والمتجر')
ON CONFLICT (code) DO NOTHING;

INSERT INTO banners (title, title_ar, description, description_ar, is_active, color, emoji, link, sort)
SELECT * FROM (VALUES
  ('20% off your first meal', 'خصم 20% على أول وجبة', 'Use code FOOD20', 'استخدم الكود FOOD20', true, '#FFD100', '🍔', '/food', 1),
  ('Rides 15% off this week', 'رحلاتك أرخص 15% هذا الأسبوع', 'Use code RIDE15', 'استخدم الكود RIDE15', true, '#0D0D0F', '🚖', '/ride/new', 2),
  ('Send anything, fast', 'أرسل أي شيء بسرعة', 'Door-to-door in minutes', 'من الباب إلى الباب بدقائق', true, '#2E7D5B', '📦', '/send', 3)
) AS v(title, title_ar, description, description_ar, is_active, color, emoji, link, sort)
WHERE NOT EXISTS (SELECT 1 FROM banners);

-- ============================================================ seed: stores & products (Baghdad, Basra, Erbil, Dubai, Damascus)
INSERT INTO stores (city_id, name, name_ar, category, emoji, color, rating, delivery_minutes, delivery_fee, min_order, latitude, longitude, address, sort)
SELECT c.id, v.name, v.name_ar, v.cat, v.emoji, v.color, v.rating, v.mins, v.fee, v.minord, v.lat, v.lng, v.addr, v.sort
FROM (VALUES
  ('Baghdad','Mansour Grill','مشويات المنصور','restaurant','🍢','#E4572E',4.8,30,1500,5000,33.3163,44.3470,'المنصور، بغداد',1),
  ('Baghdad','Karrada Burger','برغر الكرادة','restaurant','🍔','#F2A541',4.6,25,1500,5000,33.3070,44.4250,'الكرادة، بغداد',2),
  ('Baghdad','Tigris Shawarma','شاورما دجلة','restaurant','🌯','#C1292E',4.7,20,1000,4000,33.3240,44.3960,'الكرادة الشرقية، بغداد',3),
  ('Baghdad','Baghdad Pizza House','بيت البيتزا','restaurant','🍕','#D1495B',4.5,35,2000,8000,33.3350,44.3800,'شارع فلسطين، بغداد',4),
  ('Baghdad','Abu Nawas Cafe','مقهى أبو نواس','cafe','☕','#6F4E37',4.9,20,1000,3000,33.3120,44.4090,'شارع أبو نواس، بغداد',5),
  ('Baghdad','Zalabia Sweets','حلويات الزلابية','sweets','🍰','#B5179E',4.7,25,1500,4000,33.3300,44.4200,'الكرادة، بغداد',6),
  ('Baghdad','Al-Rasheed Market','أسواق الرشيد','grocery','🛒','#2E7D5B',4.6,40,2000,10000,33.3200,44.3900,'شارع الرشيد، بغداد',7),
  ('Baghdad','Shifa Pharmacy','صيدلية الشفاء','pharmacy','💊','#1B998B',4.8,25,1500,3000,33.3180,44.3700,'المنصور، بغداد',8),
  ('Baghdad','Rose Garden Flowers','حديقة الورود','flowers','💐','#E56399',4.9,45,2500,10000,33.3050,44.3600,'الجادرية، بغداد',9),
  ('Basra','Shatt Al-Arab Fish','سمك شط العرب','restaurant','🐟','#1D70A2',4.8,35,1500,6000,30.5100,47.8200,'العشار، البصرة',1),
  ('Basra','Basra Dates Cafe','مقهى تمور البصرة','cafe','🧋','#8B5E3C',4.6,20,1000,3000,30.5050,47.8000,'كورنيش البصرة',2),
  ('Basra','Basra Fresh Market','أسواق البصرة','grocery','🥬','#2E7D5B',4.5,40,2000,10000,30.5000,47.8100,'الجزائر، البصرة',3),
  ('Erbil','Citadel Kebab','كباب القلعة','restaurant','🥙','#E4572E',4.8,30,1500,5000,36.1912,44.0091,'قرب القلعة، أربيل',1),
  ('Erbil','Ankawa Cafe','مقهى عنكاوا','cafe','☕','#6F4E37',4.7,25,1000,3000,36.2260,43.9930,'عنكاوا، أربيل',2),
  ('Dubai','Marina Burger Co.','برغر المارينا','restaurant','🍔','#F2A541',4.7,30,7,25,25.0800,55.1400,'Dubai Marina',1),
  ('Dubai','Karak House','بيت الكرك','cafe','🍵','#C77D3A',4.8,20,5,15,25.2048,55.2708,'Downtown Dubai',2),
  ('Dubai','Daily Fresh Mart','ديلي فريش ماركت','grocery','🛒','#2E7D5B',4.5,35,8,40,25.2300,55.3000,'Al Karama',3),
  ('Dubai','Life Pharmacy','لايف فارمسي','pharmacy','💊','#1B998B',4.6,30,6,20,25.1972,55.2744,'Business Bay',4),
  ('Damascus','Bab Touma Shawarma','شاورما باب توما','restaurant','🌯','#C1292E',4.8,25,4000,15000,33.5130,36.3150,'باب توما، دمشق',1),
  ('Damascus','Bakdash Ice Cream','بوظة بكداش','sweets','🍦','#B5179E',4.9,30,4000,10000,33.5110,36.3040,'سوق الحميدية، دمشق',2),
  ('Damascus','Sham Market','سوق الشام','grocery','🛒','#2E7D5B',4.5,40,5000,20000,33.5150,36.2900,'المزة، دمشق',3)
) AS v(city, name, name_ar, cat, emoji, color, rating, mins, fee, minord, lat, lng, addr, sort)
JOIN cities c ON c.name = v.city
ON CONFLICT (city_id, name) DO NOTHING;

-- products: generic menus per category, priced per currency (IQD / AED / SYP)
INSERT INTO products (store_id, name, name_ar, description, section, price, emoji, sort)
SELECT s.id, m.name, m.name_ar, m.descr, m.section,
       round_money(m.iqd * CASE co.code WHEN 'AE' THEN 0.0028 WHEN 'SY' THEN 10 ELSE 1 END, co.currency_code),
       m.emoji, m.sort
FROM stores s
JOIN cities ci ON ci.id = s.city_id
JOIN countries co ON co.id = ci.country_id
JOIN (VALUES
  -- restaurants
  ('restaurant','Mixed Grill Plate','صحن مشويات مشكل','Kebab, tikka, chicken, bread & salad','Grills',18000,'🍢',1),
  ('restaurant','Chicken Tikka','تكة دجاج','Marinated chicken skewers with rice','Grills',9000,'🍗',2),
  ('restaurant','Classic Burger','برغر كلاسيك','Beef patty, cheese, house sauce','Burgers',7000,'🍔',3),
  ('restaurant','Chicken Shawarma Wrap','لفة شاورما دجاج','Garlic sauce & pickles','Sandwiches',3500,'🌯',4),
  ('restaurant','Family Meal','وجبة عائلية','Serves 4 — grills, rice, salads, drinks','Meals',35000,'🍱',5),
  ('restaurant','Fries','بطاطا مقلية','Crispy golden fries','Sides',2000,'🍟',6),
  ('restaurant','Fresh Salad','سلطة طازجة','Seasonal vegetables','Sides',2500,'🥗',7),
  ('restaurant','Soft Drink','مشروب غازي','Cold can','Drinks',1000,'🥤',8),
  -- cafes
  ('cafe','Iraqi Tea','شاي عراقي','Strong tea with cardamom','Hot',1000,'🍵',1),
  ('cafe','Turkish Coffee','قهوة تركية','Freshly ground','Hot',2000,'☕',2),
  ('cafe','Spanish Latte','سبانش لاتيه','Iced or hot','Coffee',4500,'🧋',3),
  ('cafe','Cappuccino','كابتشينو','Double shot','Coffee',4000,'☕',4),
  ('cafe','Fresh Orange Juice','عصير برتقال طازج','100% fresh','Cold',3000,'🍊',5),
  ('cafe','Cheesecake Slice','قطعة تشيز كيك','Berry topping','Desserts',5000,'🍰',6),
  -- sweets
  ('sweets','Baklava Box','علبة بقلاوة','500g assorted','Oriental',12000,'🍯',1),
  ('sweets','Kunafa','كنافة','Hot, with cheese','Oriental',6000,'🧀',2),
  ('sweets','Zalabia','زلابية','Crispy & syrupy','Oriental',3000,'🍩',3),
  ('sweets','Ice Cream Cup','كوب بوظة','3 scoops','Ice cream',4000,'🍨',4),
  ('sweets','Chocolate Cake','كيكة شوكولاتة','Whole cake, 8 pieces','Cakes',20000,'🎂',5),
  -- grocery
  ('grocery','Fresh Bread','خبز طازج','Pack of 10','Bakery',1000,'🍞',1),
  ('grocery','Milk 1L','حليب 1 لتر','Full cream','Dairy',1750,'🥛',2),
  ('grocery','Eggs (30)','بيض 30 حبة','Farm eggs','Dairy',6000,'🥚',3),
  ('grocery','Rice 5kg','رز 5 كغم','Premium basmati','Pantry',12000,'🍚',4),
  ('grocery','Tomatoes 1kg','طماطم 1 كغم','Fresh','Vegetables',1500,'🍅',5),
  ('grocery','Bananas 1kg','موز 1 كغم','Fresh','Fruits',2000,'🍌',6),
  ('grocery','Water 6-pack','ماء 6 قناني','1.5L bottles','Drinks',2500,'💧',7),
  ('grocery','Chicken 1kg','دجاج 1 كغم','Fresh, whole','Meat',6000,'🍗',8),
  -- pharmacy
  ('pharmacy','Paracetamol 500mg','باراسيتامول 500 ملغ','24 tablets','Pain relief',2000,'💊',1),
  ('pharmacy','Vitamin C','فيتامين سي','30 effervescent tablets','Vitamins',6000,'🍋',2),
  ('pharmacy','Face Masks (50)','كمامات 50 قطعة','3-ply','Care',4000,'😷',3),
  ('pharmacy','Hand Sanitizer','معقم يدين','250ml','Care',3000,'🧴',4),
  ('pharmacy','Baby Diapers','حفاضات أطفال','Size 4, 40 pcs','Baby',15000,'👶',5),
  -- flowers
  ('flowers','Red Roses Bouquet','باقة ورد أحمر','12 roses','Bouquets',25000,'🌹',1),
  ('flowers','Mixed Flowers','باقة ورد مشكل','Seasonal flowers','Bouquets',30000,'💐',2),
  ('flowers','Gift Box + Chocolate','صندوق هدية مع شوكولاتة','Roses & chocolates','Gifts',45000,'🎁',3)
) AS m(cat, name, name_ar, descr, section, iqd, emoji, sort) ON m.cat = s.category
ON CONFLICT (store_id, name) DO NOTHING;

-- ============================================================ RLS: customers
ALTER TABLE stores   ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS stores_read ON stores;
CREATE POLICY stores_read ON stores FOR SELECT USING (is_active);
DROP POLICY IF EXISTS products_read ON products;
CREATE POLICY products_read ON products FOR SELECT USING (true);
DROP POLICY IF EXISTS banners_read ON banners;
CREATE POLICY banners_read ON banners FOR SELECT USING (is_active);
DROP POLICY IF EXISTS coupons_read ON coupons;
CREATE POLICY coupons_read ON coupons FOR SELECT USING (is_active AND (expiry_date IS NULL OR expiry_date >= current_date));
DROP POLICY IF EXISTS settings_read ON settings;
CREATE POLICY settings_read ON settings FOR SELECT USING (key IN ('support_phone','app_name'));

DROP POLICY IF EXISTS orders_own ON orders;
CREATE POLICY orders_own ON orders FOR SELECT USING (auth.uid() = customer_id);
DROP POLICY IF EXISTS order_items_own ON order_items;
CREATE POLICY order_items_own ON order_items FOR SELECT
  USING (EXISTS (SELECT 1 FROM orders o WHERE o.id = order_id AND o.customer_id = auth.uid()));
DROP POLICY IF EXISTS deliveries_own ON deliveries;
CREATE POLICY deliveries_own ON deliveries FOR SELECT USING (auth.uid() = customer_id);

DROP POLICY IF EXISTS addresses_own ON addresses;
CREATE POLICY addresses_own ON addresses FOR ALL
  USING (auth.uid() = profile_id) WITH CHECK (auth.uid() = profile_id);
DROP POLICY IF EXISTS notifications_own_update ON notifications;
CREATE POLICY notifications_own_update ON notifications FOR UPDATE
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- customers create jobs only through the server-side RPCs below (prices are never trusted from the client)
DROP POLICY IF EXISTS rides_own_insert ON rides;
DROP POLICY IF EXISTS rides_own_update ON rides;

-- ============================================================ RLS: admin (full control)
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['profiles','drivers','vehicles','rides','deliveries','orders','order_items','stores','products',
                           'pricing_rules','feature_flags','banners','coupons','coupon_redemptions','cities','countries',
                           'settings','notifications','wallets','wallet_transactions','support_tickets','support_messages',
                           'ride_status_history','ratings','addresses','audit_logs','driver_documents']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS admin_all ON %I', t);
    EXECUTE format('CREATE POLICY admin_all ON %I FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin())', t);
  END LOOP;
END $$;

-- ============================================================ quotes & job creation (server-side pricing)
CREATE OR REPLACE FUNCTION public.check_coupon(p_code text, p_service text, p_amount numeric, p_fee numeric DEFAULT 0)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE c coupons; v_disc numeric := 0;
BEGIN
  IF p_code IS NULL OR trim(p_code) = '' THEN RETURN jsonb_build_object('ok', false, 'reason', 'empty'); END IF;
  SELECT * INTO c FROM coupons WHERE upper(code) = upper(trim(p_code)) AND is_active;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'reason', 'invalid'); END IF;
  IF c.expiry_date IS NOT NULL AND c.expiry_date < current_date THEN RETURN jsonb_build_object('ok', false, 'reason', 'expired'); END IF;
  IF c.service_type NOT IN ('ALL', p_service) THEN RETURN jsonb_build_object('ok', false, 'reason', 'service'); END IF;
  IF c.maximum_uses IS NOT NULL AND COALESCE(c.uses_count, 0) >= c.maximum_uses THEN RETURN jsonb_build_object('ok', false, 'reason', 'used_up'); END IF;
  IF c.minimum_amount IS NOT NULL AND p_amount < c.minimum_amount THEN RETURN jsonb_build_object('ok', false, 'reason', 'minimum'); END IF;
  IF EXISTS (SELECT 1 FROM coupon_redemptions WHERE coupon_id = c.id AND user_id = auth.uid()) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'already_used');
  END IF;
  v_disc := CASE c.discount_type
              WHEN 'PERCENT' THEN p_amount * c.discount_value / 100
              WHEN 'FIXED' THEN LEAST(c.discount_value, p_amount)
              WHEN 'FREE_DELIVERY' THEN COALESCE(p_fee, 0)
              ELSE 0 END;
  RETURN jsonb_build_object('ok', true, 'code', c.code, 'discount', round(v_disc, 2), 'type', c.discount_type);
END $$;
GRANT EXECUTE ON FUNCTION public.check_coupon(text, text, numeric, numeric) TO authenticated;

CREATE OR REPLACE FUNCTION public.redeem_coupon(p_code text, p_discount numeric, p_kind text)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  WITH c AS (UPDATE coupons SET uses_count = COALESCE(uses_count, 0) + 1
             WHERE upper(code) = upper(p_code) RETURNING id)
  INSERT INTO coupon_redemptions (coupon_id, user_id, transaction_type, discount_amount)
  SELECT id, auth.uid(), p_kind, p_discount FROM c;
$$;
REVOKE EXECUTE ON FUNCTION public.redeem_coupon(text, numeric, text) FROM PUBLIC, anon, authenticated;

-- fares for every vehicle type between two points
CREATE OR REPLACE FUNCTION public.quote_trip(p_service text, p_from_lat double precision, p_from_lng double precision,
                                             p_to_lat double precision, p_to_lng double precision,
                                             p_km numeric, p_min int)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_city cities; v_cur text; v_km numeric; v_min int; v_out jsonb := '[]'::jsonb; r pricing_rules;
BEGIN
  SELECT * INTO v_city FROM nearest_city(p_from_lat, p_from_lng);
  IF v_city.id IS NULL THEN RETURN jsonb_build_object('error', 'no_city'); END IF;
  SELECT currency_code INTO v_cur FROM countries WHERE id = v_city.country_id;
  v_km  := GREATEST(COALESCE(p_km, 0), km_between(p_from_lat, p_from_lng, p_to_lat, p_to_lng));
  v_min := GREATEST(COALESCE(p_min, 1), 1);
  FOR r IN SELECT * FROM pricing_rules WHERE service_key = p_service AND city_id = v_city.id AND is_active ORDER BY base_fare LOOP
    v_out := v_out || jsonb_build_object(
      'vehicle_type', r.vehicle_type,
      'amount', round_money(GREATEST((r.base_fare + r.per_km * v_km + r.per_min * v_min) * r.surge_multiplier, r.min_fare), v_cur),
      'surge', r.surge_multiplier,
      'cancellation_fee', r.cancellation_fee);
  END LOOP;
  RETURN jsonb_build_object('city_id', v_city.id, 'city', v_city.name, 'city_ar', v_city.name_ar,
                            'currency', v_cur, 'km', round(v_km, 2), 'min', v_min, 'options', v_out);
END $$;
GRANT EXECUTE ON FUNCTION public.quote_trip(text, double precision, double precision, double precision, double precision, numeric, int) TO authenticated;

CREATE OR REPLACE FUNCTION public.create_ride(p_from_lat double precision, p_from_lng double precision, p_from_addr text,
                                              p_to_lat double precision, p_to_lng double precision, p_to_addr text,
                                              p_vehicle text, p_km numeric, p_min int, p_coupon text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE q jsonb; opt jsonb; v_amount numeric; v_disc numeric := 0; c jsonb; v_id bigint; v_country bigint;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF NOT flag_on('RIDE') THEN RAISE EXCEPTION 'service_disabled'; END IF;
  IF EXISTS (SELECT 1 FROM rides WHERE customer_id = auth.uid() AND status IN ('SEARCHING','ASSIGNED','ARRIVING','ARRIVED','STARTED')) THEN
    RAISE EXCEPTION 'active_ride_exists';
  END IF;
  q := quote_trip('RIDE', p_from_lat, p_from_lng, p_to_lat, p_to_lng, p_km, p_min);
  IF q ? 'error' THEN RAISE EXCEPTION 'no_city'; END IF;
  SELECT value INTO opt FROM jsonb_array_elements(q->'options') WHERE value->>'vehicle_type' = p_vehicle;
  IF opt IS NULL THEN RAISE EXCEPTION 'vehicle_unavailable'; END IF;
  v_amount := (opt->>'amount')::numeric;
  IF p_coupon IS NOT NULL AND p_coupon <> '' THEN
    c := check_coupon(p_coupon, 'RIDE', v_amount, 0);
    IF (c->>'ok')::boolean THEN v_disc := round_money((c->>'discount')::numeric, q->>'currency'); END IF;
  END IF;
  SELECT country_id INTO v_country FROM cities WHERE id = (q->>'city_id')::bigint;
  INSERT INTO rides (customer_id, status, pickup_latitude, pickup_longitude, pickup_address, pickup_location,
                     dropoff_latitude, dropoff_longitude, dropoff_address, dropoff_location, vehicle_type,
                     estimated_fare, discount, coupon_code, currency_code, distance_km, duration_min,
                     country_id, city_id, payment_method, requested_at)
  VALUES (auth.uid(), 'SEARCHING', p_from_lat, p_from_lng, left(p_from_addr, 300),
          ST_SetSRID(ST_MakePoint(p_from_lng, p_from_lat), 4326)::geography,
          p_to_lat, p_to_lng, left(p_to_addr, 300), ST_SetSRID(ST_MakePoint(p_to_lng, p_to_lat), 4326)::geography,
          p_vehicle, GREATEST(v_amount - v_disc, 0), v_disc, CASE WHEN v_disc > 0 THEN upper(p_coupon) END,
          q->>'currency', (q->>'km')::numeric, (q->>'min')::int, v_country, (q->>'city_id')::bigint, 'cash', now())
  RETURNING id INTO v_id;
  IF v_disc > 0 THEN PERFORM redeem_coupon(p_coupon, v_disc, 'RIDE'); END IF;
  INSERT INTO ride_status_history (ride_id, status, notes) VALUES (v_id, 'SEARCHING', 'created');
  RETURN jsonb_build_object('id', v_id, 'fare', GREATEST(v_amount - v_disc, 0), 'discount', v_disc, 'currency', q->>'currency');
END $$;
GRANT EXECUTE ON FUNCTION public.create_ride(double precision, double precision, text, double precision, double precision, text, text, numeric, int, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.create_delivery(p_from_lat double precision, p_from_lng double precision, p_from_addr text,
                                                  p_to_lat double precision, p_to_lng double precision, p_to_addr text,
                                                  p_vehicle text, p_km numeric, p_min int,
                                                  p_package text, p_recipient text, p_recipient_phone text, p_notes text,
                                                  p_coupon text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE q jsonb; opt jsonb; v_amount numeric; v_disc numeric := 0; c jsonb; v_id bigint;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF NOT flag_on('DELIVERY') THEN RAISE EXCEPTION 'service_disabled'; END IF;
  q := quote_trip('DELIVERY', p_from_lat, p_from_lng, p_to_lat, p_to_lng, p_km, p_min);
  IF q ? 'error' THEN RAISE EXCEPTION 'no_city'; END IF;
  SELECT value INTO opt FROM jsonb_array_elements(q->'options') WHERE value->>'vehicle_type' = p_vehicle;
  IF opt IS NULL THEN RAISE EXCEPTION 'vehicle_unavailable'; END IF;
  v_amount := (opt->>'amount')::numeric;
  IF p_coupon IS NOT NULL AND p_coupon <> '' THEN
    c := check_coupon(p_coupon, 'DELIVERY', v_amount, v_amount);
    IF (c->>'ok')::boolean THEN v_disc := round_money((c->>'discount')::numeric, q->>'currency'); END IF;
  END IF;
  INSERT INTO deliveries (customer_id, status, pickup_location, dropoff_location, pickup_latitude, pickup_longitude,
                          dropoff_latitude, dropoff_longitude, delivery_type, package_description, recipient_name,
                          recipient_phone, special_instructions, estimated_fare, discount, coupon_code, currency_code,
                          distance_km, duration_min, city_id, payment_method, otp_code)
  VALUES (auth.uid(), 'CREATED', left(p_from_addr, 300), left(p_to_addr, 300), p_from_lat, p_from_lng, p_to_lat, p_to_lng,
          p_vehicle, left(p_package, 120), left(p_recipient, 120), left(p_recipient_phone, 30), left(p_notes, 500),
          GREATEST(v_amount - v_disc, 0), v_disc, CASE WHEN v_disc > 0 THEN upper(p_coupon) END, q->>'currency',
          (q->>'km')::numeric, (q->>'min')::int, (q->>'city_id')::bigint, 'cash',
          lpad((floor(random() * 10000))::int::text, 4, '0'))
  RETURNING id INTO v_id;
  IF v_disc > 0 THEN PERFORM redeem_coupon(p_coupon, v_disc, 'DELIVERY'); END IF;
  RETURN jsonb_build_object('id', v_id, 'fare', GREATEST(v_amount - v_disc, 0), 'discount', v_disc, 'currency', q->>'currency');
END $$;
GRANT EXECUTE ON FUNCTION public.create_delivery(double precision, double precision, text, double precision, double precision, text, text, numeric, int, text, text, text, text, text) TO authenticated;

-- p_items: [{"product_id": 1, "qty": 2}, ...]
CREATE OR REPLACE FUNCTION public.place_order(p_store_id bigint, p_items jsonb, p_address text,
                                              p_lat double precision, p_lng double precision,
                                              p_notes text DEFAULT NULL, p_coupon text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s stores; v_cur text; v_sub numeric := 0; v_fee numeric; v_disc numeric := 0; c jsonb; v_id bigint;
        it jsonb; p products; v_qty int; v_service text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  SELECT * INTO s FROM stores WHERE id = p_store_id AND is_active;
  IF NOT FOUND THEN RAISE EXCEPTION 'store_not_found'; END IF;
  IF NOT s.is_open THEN RAISE EXCEPTION 'store_closed'; END IF;
  v_service := CASE WHEN s.category IN ('restaurant','cafe','sweets') THEN 'FOOD' ELSE 'MARKET' END;
  IF NOT flag_on(v_service) THEN RAISE EXCEPTION 'service_disabled'; END IF;
  IF jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN RAISE EXCEPTION 'empty_cart'; END IF;
  SELECT co.currency_code INTO v_cur FROM cities ci JOIN countries co ON co.id = ci.country_id WHERE ci.id = s.city_id;

  FOR it IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_qty := LEAST(GREATEST(COALESCE((it->>'qty')::int, 1), 1), 50);
    SELECT * INTO p FROM products WHERE id = (it->>'product_id')::bigint AND store_id = s.id AND is_available;
    IF NOT FOUND THEN RAISE EXCEPTION 'product_unavailable'; END IF;
    v_sub := v_sub + p.price * v_qty;
  END LOOP;
  IF v_sub < s.min_order THEN RAISE EXCEPTION 'below_minimum'; END IF;
  v_fee := s.delivery_fee;
  IF p_coupon IS NOT NULL AND p_coupon <> '' THEN
    -- every store order (food or market) counts as the FOOD coupon service
    c := check_coupon(p_coupon, 'FOOD', v_sub, v_fee);
    IF (c->>'ok')::boolean THEN v_disc := round_money((c->>'discount')::numeric, v_cur); END IF;
  END IF;

  INSERT INTO orders (customer_id, store_id, city_id, status, currency_code, subtotal, delivery_fee, discount,
                      coupon_code, total_amount, delivery_address, delivery_lat, delivery_lng, notes,
                      payment_method, payment_status)
  VALUES (auth.uid(), s.id, s.city_id, 'PLACED', v_cur, v_sub, v_fee, v_disc, CASE WHEN v_disc > 0 THEN upper(p_coupon) END,
          GREATEST(v_sub + v_fee - v_disc, 0), left(p_address, 300), p_lat, p_lng, left(p_notes, 500), 'cash', 'pending')
  RETURNING id INTO v_id;

  INSERT INTO order_items (order_id, product_id, product_name, quantity, price, emoji)
  SELECT v_id, pr.id, pr.name_ar || ' | ' || pr.name, LEAST(GREATEST(COALESCE((x->>'qty')::int, 1), 1), 50), pr.price, pr.emoji
  FROM jsonb_array_elements(p_items) x JOIN products pr ON pr.id = (x->>'product_id')::bigint;

  IF v_disc > 0 THEN PERFORM redeem_coupon(p_coupon, v_disc, 'FOOD'); END IF;
  RETURN jsonb_build_object('id', v_id, 'total', GREATEST(v_sub + v_fee - v_disc, 0), 'currency', v_cur);
END $$;
GRANT EXECUTE ON FUNCTION public.place_order(bigint, jsonb, text, double precision, double precision, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.cancel_job(p_kind text, p_id bigint)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF p_kind = 'ride' THEN
    UPDATE rides SET status = 'CANCELLED', cancelled_at = now(), cancelled_by = 'customer'
    WHERE id = p_id AND customer_id = auth.uid() AND status IN ('REQUESTED','SEARCHING','ASSIGNED','ARRIVING');
  ELSIF p_kind = 'delivery' THEN
    UPDATE deliveries SET status = 'CANCELLED', cancelled_at = now()
    WHERE id = p_id AND customer_id = auth.uid() AND status IN ('CREATED','ASSIGNED');
  ELSIF p_kind = 'order' THEN
    UPDATE orders SET status = 'CANCELLED', cancelled_at = now()
    WHERE id = p_id AND customer_id = auth.uid() AND status IN ('PLACED','PREPARING');
  END IF;
  RETURN FOUND;
END $$;
GRANT EXECUTE ON FUNCTION public.cancel_job(text, bigint) TO authenticated;

CREATE OR REPLACE FUNCTION public.rate_job(p_kind text, p_id bigint, p_stars int, p_review text DEFAULT NULL)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_driver bigint;
BEGIN
  IF p_stars NOT BETWEEN 1 AND 5 THEN RAISE EXCEPTION 'bad_rating'; END IF;
  IF p_kind = 'ride' THEN
    SELECT driver_id INTO v_driver FROM rides WHERE id = p_id AND customer_id = auth.uid() AND status = 'COMPLETED';
    UPDATE rides SET rating = p_stars, review = left(p_review, 500) WHERE id = p_id AND customer_id = auth.uid();
  ELSIF p_kind = 'delivery' THEN
    SELECT driver_id INTO v_driver FROM deliveries WHERE id = p_id AND customer_id = auth.uid() AND status = 'DELIVERED';
  ELSIF p_kind = 'order' THEN
    SELECT driver_id INTO v_driver FROM orders WHERE id = p_id AND customer_id = auth.uid() AND status = 'DELIVERED';
  END IF;
  IF v_driver IS NULL THEN RETURN false; END IF;
  INSERT INTO ratings (rater_id, ratee_id, ride_id, rating, review, job_kind, job_id)
  VALUES (auth.uid(), v_driver, CASE WHEN p_kind = 'ride' THEN p_id END, p_stars, left(p_review, 500), p_kind, p_id)
  ON CONFLICT (job_kind, job_id) DO UPDATE SET rating = EXCLUDED.rating, review = EXCLUDED.review;
  UPDATE drivers SET rating = (SELECT round(avg(rating)::numeric, 2) FROM ratings WHERE ratee_id = v_driver) WHERE id = v_driver;
  RETURN true;
END $$;
GRANT EXECUTE ON FUNCTION public.rate_job(text, bigint, int, text) TO authenticated;

-- ============================================================ job lookup for customers (driver card + live position)
DROP FUNCTION IF EXISTS public.get_driver_public_profile(bigint);
CREATE OR REPLACE FUNCTION public.get_driver_public_profile(target_driver_id bigint)
RETURNS TABLE (full_name text, rating numeric, make text, model text, color text, plate_number text,
               current_lat numeric, current_lng numeric, phone text, total_trips int)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(d.display_name::text, NULLIF(trim(concat(p.first_name,' ',p.last_name)),''), 'السائق'),
         d.rating::numeric, v.manufacturer::text, v.model::text, v.color::text, v.plate_number::text,
         d.current_lat::numeric, d.current_lng::numeric, d.phone::text, d.total_trips
  FROM drivers d
  LEFT JOIN profiles p ON p.id = d.profile_id
  LEFT JOIN vehicles v ON v.id = d.vehicle_id
  WHERE d.id = target_driver_id
    AND (EXISTS (SELECT 1 FROM rides r      WHERE r.driver_id = d.id AND r.customer_id = auth.uid())
      OR EXISTS (SELECT 1 FROM deliveries x WHERE x.driver_id = d.id AND x.customer_id = auth.uid())
      OR EXISTS (SELECT 1 FROM orders o     WHERE o.driver_id = d.id AND o.customer_id = auth.uid())
      OR public.is_admin());
$$;
GRANT EXECUTE ON FUNCTION public.get_driver_public_profile(bigint) TO authenticated;

-- ============================================================ driver app
CREATE OR REPLACE FUNCTION public.my_driver()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT to_jsonb(x) FROM (
    SELECT d.id, d.status, d.is_online, d.display_name, d.phone, d.rating, d.total_trips, d.admin_notes,
           d.current_lat, d.current_lng, d.city_id,
           v.vehicle_type, v.manufacturer, v.model, v.color, v.plate_number
    FROM drivers d LEFT JOIN vehicles v ON v.id = d.vehicle_id
    WHERE d.profile_id = auth.uid()) x;
$$;
GRANT EXECUTE ON FUNCTION public.my_driver() TO authenticated;

CREATE OR REPLACE FUNCTION public.driver_register(p_name text, p_phone text, p_vehicle_type text, p_make text,
                                                  p_model text, p_color text, p_plate text, p_city_id bigint)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_driver bigint; v_vehicle bigint;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF p_vehicle_type NOT IN ('ECONOMY','COMFORT','XL','BIKE') THEN RAISE EXCEPTION 'bad_vehicle'; END IF;
  IF coalesce(trim(p_name),'') = '' OR coalesce(trim(p_plate),'') = '' THEN RAISE EXCEPTION 'missing_fields'; END IF;
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
    VALUES (v_driver, left(p_plate, 50) || CASE WHEN EXISTS (SELECT 1 FROM vehicles WHERE plate_number = left(p_plate, 50)) THEN ' #' || v_driver ELSE '' END,
            p_vehicle_type, left(p_make, 100), left(p_model, 100), left(p_color, 50),
            CASE p_vehicle_type WHEN 'XL' THEN 6 WHEN 'BIKE' THEN 1 ELSE 4 END)
    RETURNING id INTO v_vehicle;
    UPDATE drivers SET vehicle_id = v_vehicle WHERE id = v_driver;
  ELSE
    UPDATE vehicles SET vehicle_type = p_vehicle_type, manufacturer = left(p_make, 100), model = left(p_model, 100),
           color = left(p_color, 50) WHERE id = v_vehicle;
  END IF;
  UPDATE profiles SET first_name = COALESCE(NULLIF(first_name, ''), left(p_name, 120)) WHERE id = auth.uid();
  RETURN my_driver();
END $$;
GRANT EXECUTE ON FUNCTION public.driver_register(text, text, text, text, text, text, text, bigint) TO authenticated;

CREATE OR REPLACE FUNCTION public.driver_set_online(p_online boolean, p_lat double precision, p_lng double precision)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE drivers SET is_online = p_online AND status = 'APPROVED',
         last_online_at = CASE WHEN p_online THEN now() ELSE last_online_at END,
         current_lat = COALESCE(p_lat, current_lat), current_lng = COALESCE(p_lng, current_lng), location_at = now()
  WHERE profile_id = auth.uid();
  RETURN my_driver();
END $$;
GRANT EXECUTE ON FUNCTION public.driver_set_online(boolean, double precision, double precision) TO authenticated;

CREATE OR REPLACE FUNCTION public.driver_ping(p_lat double precision, p_lng double precision)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE drivers SET current_lat = p_lat, current_lng = p_lng, location_at = now() WHERE profile_id = auth.uid();
$$;
GRANT EXECUTE ON FUNCTION public.driver_ping(double precision, double precision) TO authenticated;

-- open jobs near the driver, nearest first
CREATE OR REPLACE FUNCTION public.driver_jobs()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE d drivers; v_type text; v_radius numeric := setting_num('driver_search_radius_km', 30);
BEGIN
  SELECT * INTO d FROM drivers WHERE profile_id = auth.uid();
  IF d.id IS NULL OR d.status <> 'APPROVED' OR NOT d.is_online OR d.current_lat IS NULL THEN RETURN '[]'::jsonb; END IF;
  SELECT vehicle_type INTO v_type FROM vehicles WHERE id = d.vehicle_id;
  RETURN COALESCE((SELECT jsonb_agg(j ORDER BY (j->>'pickup_km')::numeric) FROM (
    SELECT jsonb_build_object('kind','ride','id',r.id,'title',r.vehicle_type,'from',r.pickup_address,'to',r.dropoff_address,
             'from_lat',r.pickup_latitude,'from_lng',r.pickup_longitude,'to_lat',r.dropoff_latitude,'to_lng',r.dropoff_longitude,
             'fare',r.estimated_fare,'currency',r.currency_code,'km',r.distance_km,
             'pickup_km',round(km_between(d.current_lat, d.current_lng, r.pickup_latitude, r.pickup_longitude)::numeric, 1),
             'created_at',r.requested_at) AS j
    FROM rides r
    WHERE r.status = 'SEARCHING' AND r.driver_id IS NULL AND v_type <> 'BIKE'
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
      AND (x.delivery_type = 'BIKE' OR v_type <> 'BIKE')
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

CREATE OR REPLACE FUNCTION public.driver_accept(p_kind text, p_id bigint)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE d drivers;
BEGIN
  SELECT * INTO d FROM drivers WHERE profile_id = auth.uid();
  IF d.id IS NULL OR d.status <> 'APPROVED' THEN RAISE EXCEPTION 'driver_not_approved'; END IF;
  IF EXISTS (SELECT 1 FROM rides WHERE driver_id = d.id AND status IN ('ASSIGNED','ARRIVING','ARRIVED','STARTED'))
     OR EXISTS (SELECT 1 FROM deliveries WHERE driver_id = d.id AND status IN ('ASSIGNED','PICKED_UP','ON_THE_WAY'))
     OR EXISTS (SELECT 1 FROM orders WHERE driver_id = d.id AND status IN ('DRIVER_ASSIGNED','PICKED_UP','ON_THE_WAY')) THEN
    RAISE EXCEPTION 'already_on_a_job';
  END IF;
  IF p_kind = 'ride' THEN
    UPDATE rides SET driver_id = d.id, status = 'ASSIGNED' WHERE id = p_id AND status = 'SEARCHING' AND driver_id IS NULL;
    IF FOUND THEN INSERT INTO ride_status_history (ride_id, status, notes) VALUES (p_id, 'ASSIGNED', 'accepted'); END IF;
  ELSIF p_kind = 'delivery' THEN
    UPDATE deliveries SET driver_id = d.id, status = 'ASSIGNED' WHERE id = p_id AND status = 'CREATED' AND driver_id IS NULL;
  ELSIF p_kind = 'order' THEN
    UPDATE orders SET driver_id = d.id, status = 'DRIVER_ASSIGNED' WHERE id = p_id AND status IN ('PLACED','PREPARING') AND driver_id IS NULL;
  END IF;
  RETURN FOUND;
END $$;
GRANT EXECUTE ON FUNCTION public.driver_accept(text, bigint) TO authenticated;

-- credits the driver when a job completes (internal)
CREATE OR REPLACE FUNCTION public.settle_job(p_driver bigint, p_amount numeric, p_currency text, p_ref text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_profile uuid; v_wallet bigint; v_net numeric;
BEGIN
  UPDATE drivers SET total_trips = COALESCE(total_trips, 0) + 1 WHERE id = p_driver RETURNING profile_id INTO v_profile;
  IF v_profile IS NULL THEN RETURN; END IF;
  v_net := round(p_amount * (100 - setting_num('platform_commission_pct', 15)) / 100, 2);
  SELECT id INTO v_wallet FROM wallets WHERE profile_id = v_profile AND currency_code = p_currency;
  IF v_wallet IS NULL THEN
    INSERT INTO wallets (profile_id, balance, currency_code) VALUES (v_profile, 0, p_currency) RETURNING id INTO v_wallet;
  END IF;
  UPDATE wallets SET balance = balance + v_net, last_transaction_at = now() WHERE id = v_wallet;
  INSERT INTO wallet_transactions (wallet_id, transaction_type, amount, reference_id, notes)
  VALUES (v_wallet, 'EARNING', v_net, p_ref, 'net after commission');
END $$;
REVOKE EXECUTE ON FUNCTION public.settle_job(bigint, numeric, text, text) FROM PUBLIC, anon, authenticated;

-- moves the driver's current job to its next status
CREATE OR REPLACE FUNCTION public.advance_job(p_kind text, p_id bigint, p_driver bigint)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r rides; x deliveries; o orders; v_next text;
BEGIN
  IF p_kind = 'ride' THEN
    SELECT * INTO r FROM rides WHERE id = p_id AND driver_id = p_driver;
    IF NOT FOUND THEN RETURN NULL; END IF;
    v_next := CASE r.status WHEN 'ASSIGNED' THEN 'ARRIVED' WHEN 'ARRIVING' THEN 'ARRIVED'
                            WHEN 'ARRIVED' THEN 'STARTED' WHEN 'STARTED' THEN 'COMPLETED' END;
    IF v_next IS NULL THEN RETURN r.status::text; END IF;
    UPDATE rides SET status = v_next::ride_status,
           started_at   = CASE WHEN v_next = 'STARTED' THEN now() ELSE started_at END,
           completed_at = CASE WHEN v_next = 'COMPLETED' THEN now() ELSE completed_at END,
           final_fare   = CASE WHEN v_next = 'COMPLETED' THEN estimated_fare ELSE final_fare END
    WHERE id = p_id;
    INSERT INTO ride_status_history (ride_id, status) VALUES (p_id, v_next::ride_status);
    IF v_next = 'COMPLETED' THEN PERFORM settle_job(p_driver, r.estimated_fare, r.currency_code, 'ride:' || p_id); END IF;
  ELSIF p_kind = 'delivery' THEN
    SELECT * INTO x FROM deliveries WHERE id = p_id AND driver_id = p_driver;
    IF NOT FOUND THEN RETURN NULL; END IF;
    v_next := CASE x.status WHEN 'ASSIGNED' THEN 'PICKED_UP' WHEN 'PICKED_UP' THEN 'ON_THE_WAY' WHEN 'ON_THE_WAY' THEN 'DELIVERED' END;
    IF v_next IS NULL THEN RETURN x.status::text; END IF;
    UPDATE deliveries SET status = v_next::delivery_status,
           started_at   = CASE WHEN v_next = 'PICKED_UP' THEN now() ELSE started_at END,
           completed_at = CASE WHEN v_next = 'DELIVERED' THEN now() ELSE completed_at END,
           final_fare   = CASE WHEN v_next = 'DELIVERED' THEN estimated_fare ELSE final_fare END
    WHERE id = p_id;
    IF v_next = 'DELIVERED' THEN PERFORM settle_job(p_driver, x.estimated_fare, x.currency_code, 'delivery:' || p_id); END IF;
  ELSIF p_kind = 'order' THEN
    SELECT * INTO o FROM orders WHERE id = p_id AND driver_id = p_driver;
    IF NOT FOUND THEN RETURN NULL; END IF;
    v_next := CASE o.status WHEN 'DRIVER_ASSIGNED' THEN 'PICKED_UP' WHEN 'PICKED_UP' THEN 'ON_THE_WAY' WHEN 'ON_THE_WAY' THEN 'DELIVERED' END;
    IF v_next IS NULL THEN RETURN o.status; END IF;
    UPDATE orders SET status = v_next,
           completed_at = CASE WHEN v_next = 'DELIVERED' THEN now() ELSE completed_at END,
           payment_status = CASE WHEN v_next = 'DELIVERED' THEN 'completed'::payment_status ELSE payment_status END
    WHERE id = p_id;
    IF v_next = 'DELIVERED' THEN PERFORM settle_job(p_driver, o.delivery_fee, o.currency_code, 'order:' || p_id); END IF;
  END IF;
  RETURN v_next;
END $$;
REVOKE EXECUTE ON FUNCTION public.advance_job(text, bigint, bigint) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.driver_advance(p_kind text, p_id bigint)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_driver bigint;
BEGIN
  SELECT id INTO v_driver FROM drivers WHERE profile_id = auth.uid() AND status = 'APPROVED';
  IF v_driver IS NULL THEN RAISE EXCEPTION 'driver_not_approved'; END IF;
  RETURN advance_job(p_kind, p_id, v_driver);
END $$;
GRANT EXECUTE ON FUNCTION public.driver_advance(text, bigint) TO authenticated;

CREATE OR REPLACE FUNCTION public.driver_current_job()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH d AS (SELECT id FROM drivers WHERE profile_id = auth.uid())
  SELECT COALESCE(
    (SELECT jsonb_build_object('kind','ride','id',r.id,'status',r.status,'from',r.pickup_address,'to',r.dropoff_address,
             'from_lat',r.pickup_latitude,'from_lng',r.pickup_longitude,'to_lat',r.dropoff_latitude,'to_lng',r.dropoff_longitude,
             'fare',r.estimated_fare,'currency',r.currency_code,'customer_phone',p.phone_number,'title',r.vehicle_type)
     FROM rides r JOIN d ON r.driver_id = d.id LEFT JOIN profiles p ON p.id = r.customer_id
     WHERE r.status IN ('ASSIGNED','ARRIVING','ARRIVED','STARTED') LIMIT 1),
    (SELECT jsonb_build_object('kind','delivery','id',x.id,'status',x.status,'from',x.pickup_location,'to',x.dropoff_location,
             'from_lat',x.pickup_latitude,'from_lng',x.pickup_longitude,'to_lat',x.dropoff_latitude,'to_lng',x.dropoff_longitude,
             'fare',x.estimated_fare,'currency',x.currency_code,'customer_phone',p.phone_number,'title',x.package_description,
             'recipient',x.recipient_name,'recipient_phone',x.recipient_phone,'notes',x.special_instructions)
     FROM deliveries x JOIN d ON x.driver_id = d.id LEFT JOIN profiles p ON p.id = x.customer_id
     WHERE x.status IN ('ASSIGNED','PICKED_UP','ON_THE_WAY') LIMIT 1),
    (SELECT jsonb_build_object('kind','order','id',o.id,'status',o.status,'from',s.name_ar,'to',o.delivery_address,
             'from_lat',s.latitude,'from_lng',s.longitude,'to_lat',o.delivery_lat,'to_lng',o.delivery_lng,
             'fare',o.delivery_fee,'currency',o.currency_code,'customer_phone',p.phone_number,'title',s.name_ar,
             'total',o.total_amount,'notes',o.notes,
             'items',(SELECT jsonb_agg(jsonb_build_object('name',i.product_name,'qty',i.quantity,'emoji',i.emoji)) FROM order_items i WHERE i.order_id = o.id))
     FROM orders o JOIN d ON o.driver_id = d.id JOIN stores s ON s.id = o.store_id LEFT JOIN profiles p ON p.id = o.customer_id
     WHERE o.status IN ('DRIVER_ASSIGNED','PICKED_UP','ON_THE_WAY') LIMIT 1));
$$;
GRANT EXECUTE ON FUNCTION public.driver_current_job() TO authenticated;

CREATE OR REPLACE FUNCTION public.driver_earnings()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH w AS (SELECT w.* FROM wallets w JOIN drivers d ON d.profile_id = w.profile_id WHERE d.profile_id = auth.uid())
  SELECT jsonb_build_object(
    'balance', (SELECT jsonb_agg(jsonb_build_object('currency', currency_code, 'amount', balance)) FROM w),
    'today',   (SELECT COALESCE(sum(t.amount), 0) FROM wallet_transactions t JOIN w ON w.id = t.wallet_id
                WHERE t.transaction_type = 'EARNING' AND t.created_at >= date_trunc('day', now())),
    'week',    (SELECT COALESCE(sum(t.amount), 0) FROM wallet_transactions t JOIN w ON w.id = t.wallet_id
                WHERE t.transaction_type = 'EARNING' AND t.created_at >= now() - interval '7 days'),
    'jobs_today', (SELECT count(*) FROM wallet_transactions t JOIN w ON w.id = t.wallet_id
                WHERE t.transaction_type = 'EARNING' AND t.created_at >= date_trunc('day', now())),
    'currency', (SELECT currency_code FROM w ORDER BY last_transaction_at DESC NULLS LAST LIMIT 1));
$$;
GRANT EXECUTE ON FUNCTION public.driver_earnings() TO authenticated;

-- ============================================================ demo driver (testing only, behind DEMO_MODE)
CREATE OR REPLACE FUNCTION public.demo_move(p_driver bigint, p_lat double precision, p_lng double precision, p_step double precision)
RETURNS double precision LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE d drivers; nlat double precision; nlng double precision;
BEGIN
  SELECT * INTO d FROM drivers WHERE id = p_driver;
  nlat := d.current_lat + (p_lat - d.current_lat) * p_step;
  nlng := d.current_lng + (p_lng - d.current_lng) * p_step;
  UPDATE drivers SET current_lat = nlat, current_lng = nlng, location_at = now() WHERE id = p_driver;
  RETURN km_between(nlat, nlng, p_lat, p_lng);
END $$;
REVOKE EXECUTE ON FUNCTION public.demo_move(bigint, double precision, double precision, double precision) FROM PUBLIC, anon, authenticated;

-- one simulation step for the caller's own job: assign → drive to pickup → … → complete
CREATE OR REPLACE FUNCTION public.demo_tick(p_kind text, p_id bigint)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_demo bigint; r rides; x deliveries; o orders; s stores; v_left double precision;
BEGIN
  IF NOT flag_on('DEMO_MODE') THEN RETURN 'off'; END IF;
  SELECT id INTO v_demo FROM drivers WHERE license_number = 'DEMO-0001';
  IF v_demo IS NULL THEN RETURN 'no_demo_driver'; END IF;

  IF p_kind = 'ride' THEN
    SELECT * INTO r FROM rides WHERE id = p_id AND customer_id = auth.uid();
    IF NOT FOUND THEN RETURN 'not_found'; END IF;
    IF r.status = 'SEARCHING' AND r.driver_id IS NULL THEN
      IF r.requested_at > now() - interval '6 seconds' THEN RETURN 'waiting'; END IF;
      UPDATE drivers SET current_lat = r.pickup_latitude + 0.010, current_lng = r.pickup_longitude + 0.008, is_online = true WHERE id = v_demo;
      UPDATE rides SET driver_id = v_demo, status = 'ASSIGNED' WHERE id = p_id;
      RETURN 'ASSIGNED';
    ELSIF r.driver_id = v_demo THEN
      IF r.status IN ('ASSIGNED','ARRIVING') THEN
        v_left := demo_move(v_demo, r.pickup_latitude::float8, r.pickup_longitude::float8, 0.4);
        IF v_left < 0.15 THEN RETURN advance_job('ride', p_id, v_demo); END IF;
        RETURN 'moving';
      ELSIF r.status = 'ARRIVED' THEN
        RETURN advance_job('ride', p_id, v_demo);
      ELSIF r.status = 'STARTED' THEN
        v_left := demo_move(v_demo, r.dropoff_latitude::float8, r.dropoff_longitude::float8, 0.35);
        IF v_left < 0.2 THEN RETURN advance_job('ride', p_id, v_demo); END IF;
        RETURN 'moving';
      END IF;
    END IF;
    RETURN r.status::text;

  ELSIF p_kind = 'delivery' THEN
    SELECT * INTO x FROM deliveries WHERE id = p_id AND customer_id = auth.uid();
    IF NOT FOUND THEN RETURN 'not_found'; END IF;
    IF x.status = 'CREATED' AND x.driver_id IS NULL THEN
      IF x.created_at > now() - interval '6 seconds' THEN RETURN 'waiting'; END IF;
      UPDATE drivers SET current_lat = x.pickup_latitude + 0.010, current_lng = x.pickup_longitude + 0.008, is_online = true WHERE id = v_demo;
      UPDATE deliveries SET driver_id = v_demo, status = 'ASSIGNED' WHERE id = p_id;
      RETURN 'ASSIGNED';
    ELSIF x.driver_id = v_demo THEN
      IF x.status = 'ASSIGNED' THEN
        v_left := demo_move(v_demo, x.pickup_latitude::float8, x.pickup_longitude::float8, 0.4);
        IF v_left < 0.15 THEN RETURN advance_job('delivery', p_id, v_demo); END IF;
        RETURN 'moving';
      ELSIF x.status = 'PICKED_UP' THEN
        RETURN advance_job('delivery', p_id, v_demo);
      ELSIF x.status = 'ON_THE_WAY' THEN
        v_left := demo_move(v_demo, x.dropoff_latitude::float8, x.dropoff_longitude::float8, 0.35);
        IF v_left < 0.2 THEN RETURN advance_job('delivery', p_id, v_demo); END IF;
        RETURN 'moving';
      END IF;
    END IF;
    RETURN x.status::text;

  ELSIF p_kind = 'order' THEN
    SELECT * INTO o FROM orders WHERE id = p_id AND customer_id = auth.uid();
    IF NOT FOUND THEN RETURN 'not_found'; END IF;
    SELECT * INTO s FROM stores WHERE id = o.store_id;
    IF o.status = 'PLACED' THEN
      IF o.created_at > now() - interval '5 seconds' THEN RETURN 'waiting'; END IF;
      UPDATE orders SET status = 'PREPARING' WHERE id = p_id;
      RETURN 'PREPARING';
    ELSIF o.status = 'PREPARING' AND o.driver_id IS NULL THEN
      UPDATE drivers SET current_lat = s.latitude + 0.008, current_lng = s.longitude + 0.006, is_online = true WHERE id = v_demo;
      UPDATE orders SET driver_id = v_demo, status = 'DRIVER_ASSIGNED' WHERE id = p_id;
      RETURN 'DRIVER_ASSIGNED';
    ELSIF o.driver_id = v_demo THEN
      IF o.status = 'DRIVER_ASSIGNED' THEN
        v_left := demo_move(v_demo, s.latitude, s.longitude, 0.45);
        IF v_left < 0.15 THEN RETURN advance_job('order', p_id, v_demo); END IF;
        RETURN 'moving';
      ELSIF o.status = 'PICKED_UP' THEN
        RETURN advance_job('order', p_id, v_demo);
      ELSIF o.status = 'ON_THE_WAY' THEN
        v_left := demo_move(v_demo, o.delivery_lat, o.delivery_lng, 0.35);
        IF v_left < 0.2 THEN RETURN advance_job('order', p_id, v_demo); END IF;
        RETURN 'moving';
      END IF;
    END IF;
    RETURN o.status;
  END IF;
  RETURN 'unknown_kind';
END $$;
GRANT EXECUTE ON FUNCTION public.demo_tick(text, bigint) TO authenticated;
DROP FUNCTION IF EXISTS public.demo_assign_driver(bigint);

-- ============================================================ notifications on every status change
CREATE OR REPLACE FUNCTION public.notify_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_kind text := TG_ARGV[0]; v_status text := NEW.status::text; t_en text; t_ar text; v_type notification_type;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status IS NOT DISTINCT FROM OLD.status THEN RETURN NEW; END IF;
  v_type := CASE WHEN v_kind = 'ride' THEN 'ride_update' ELSE 'delivery_update' END;
  SELECT en, ar INTO t_en, t_ar FROM (VALUES
    ('ride','ASSIGNED','Driver found — on the way to you','تم العثور على سائق وهو في الطريق إليك'),
    ('ride','ARRIVED','Your driver has arrived','السائق وصل إلى موقعك'),
    ('ride','STARTED','Trip started — enjoy the ride','بدأت الرحلة — رحلة سعيدة'),
    ('ride','COMPLETED','You have arrived. Thanks for riding with KAP','وصلت بالسلامة. شكراً لاختيارك كاب'),
    ('ride','CANCELLED','Your ride was cancelled','تم إلغاء الرحلة'),
    ('delivery','ASSIGNED','A courier accepted your delivery','قبل المندوب طلب التوصيل'),
    ('delivery','PICKED_UP','Your package was picked up','استلم المندوب الطرد'),
    ('delivery','ON_THE_WAY','Your package is on the way','الطرد في الطريق'),
    ('delivery','DELIVERED','Package delivered','تم تسليم الطرد'),
    ('delivery','CANCELLED','Delivery cancelled','تم إلغاء التوصيل'),
    ('order','PLACED','Order received','تم استلام طلبك'),
    ('order','PREPARING','The store is preparing your order','المتجر يحضّر طلبك'),
    ('order','DRIVER_ASSIGNED','A courier is heading to the store','المندوب في طريقه إلى المتجر'),
    ('order','PICKED_UP','Your order was picked up','استلم المندوب طلبك'),
    ('order','ON_THE_WAY','Your order is on the way','طلبك في الطريق إليك'),
    ('order','DELIVERED','Order delivered — bon appétit!','تم توصيل طلبك — بالعافية!'),
    ('order','CANCELLED','Order cancelled','تم إلغاء الطلب')
  ) AS m(kind, status, en, ar) WHERE m.kind = v_kind AND m.status = v_status;
  IF t_en IS NOT NULL AND NEW.customer_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, notification_type, title, title_ar, message, message_ar, reference_id, is_read)
    VALUES (NEW.customer_id, v_type, t_en, t_ar, t_en, t_ar, v_kind || ':' || NEW.id, false);
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_ride ON rides;
CREATE TRIGGER trg_notify_ride AFTER INSERT OR UPDATE OF status ON rides FOR EACH ROW EXECUTE FUNCTION notify_status('ride');
DROP TRIGGER IF EXISTS trg_notify_delivery ON deliveries;
CREATE TRIGGER trg_notify_delivery AFTER INSERT OR UPDATE OF status ON deliveries FOR EACH ROW EXECUTE FUNCTION notify_status('delivery');
DROP TRIGGER IF EXISTS trg_notify_order ON orders;
CREATE TRIGGER trg_notify_order AFTER INSERT OR UPDATE OF status ON orders FOR EACH ROW EXECUTE FUNCTION notify_status('order');

-- ============================================================ admin
CREATE OR REPLACE FUNCTION public.admin_overview()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_today timestamptz := date_trunc('day', now());
BEGIN
  IF NOT is_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN jsonb_build_object(
    'users', (SELECT count(*) FROM profiles),
    'new_users_today', (SELECT count(*) FROM profiles WHERE created_at >= v_today),
    'drivers', (SELECT count(*) FROM drivers WHERE license_number IS DISTINCT FROM 'DEMO-0001'),
    'drivers_pending', (SELECT count(*) FROM drivers WHERE status = 'PENDING'),
    'drivers_online', (SELECT count(*) FROM drivers WHERE is_online),
    'active_rides', (SELECT count(*) FROM rides WHERE status IN ('SEARCHING','ASSIGNED','ARRIVING','ARRIVED','STARTED')),
    'active_deliveries', (SELECT count(*) FROM deliveries WHERE status IN ('CREATED','ASSIGNED','PICKED_UP','ON_THE_WAY')),
    'active_orders', (SELECT count(*) FROM orders WHERE status IN ('PLACED','PREPARING','DRIVER_ASSIGNED','PICKED_UP','ON_THE_WAY')),
    'rides_today', (SELECT count(*) FROM rides WHERE created_at >= v_today),
    'orders_today', (SELECT count(*) FROM orders WHERE created_at >= v_today),
    'deliveries_today', (SELECT count(*) FROM deliveries WHERE created_at >= v_today),
    'stores', (SELECT count(*) FROM stores WHERE is_active),
    'revenue_today', COALESCE((SELECT jsonb_agg(jsonb_build_object('currency', cur, 'amount', amt)) FROM (
        SELECT cur, sum(amt) amt FROM (
          SELECT currency_code cur, final_fare amt FROM rides WHERE status = 'COMPLETED' AND completed_at >= v_today
          UNION ALL SELECT currency_code, final_fare FROM deliveries WHERE status = 'DELIVERED' AND completed_at >= v_today
          UNION ALL SELECT currency_code, total_amount FROM orders WHERE status = 'DELIVERED' AND completed_at >= v_today) u
        GROUP BY cur) g), '[]'::jsonb),
    'last7', (SELECT jsonb_agg(jsonb_build_object('day', d::date,
        'rides', (SELECT count(*) FROM rides WHERE created_at::date = d::date),
        'orders', (SELECT count(*) FROM orders WHERE created_at::date = d::date),
        'deliveries', (SELECT count(*) FROM deliveries WHERE created_at::date = d::date)) ORDER BY d)
      FROM generate_series(current_date - 6, current_date, interval '1 day') d)
  );
END $$;
GRANT EXECUTE ON FUNCTION public.admin_overview() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_set_driver_status(p_driver bigint, p_status text, p_note text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_old text;
BEGIN
  IF NOT is_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT status::text INTO v_old FROM drivers WHERE id = p_driver;
  UPDATE drivers SET status = p_status::driver_status, admin_notes = COALESCE(p_note, admin_notes),
         is_online = CASE WHEN p_status = 'APPROVED' THEN is_online ELSE false END
  WHERE id = p_driver;
  INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, old_value, new_value)
  VALUES (auth.uid(), 'driver_status', 'driver', p_driver::text, jsonb_build_object('status', v_old),
          jsonb_build_object('status', p_status, 'note', p_note));
END $$;
GRANT EXECUTE ON FUNCTION public.admin_set_driver_status(bigint, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_cancel_job(p_kind text, p_id bigint, p_reason text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF p_kind = 'ride' THEN
    UPDATE rides SET status = 'CANCELLED', cancelled_at = now(), cancelled_by = 'admin', cancellation_reason = p_reason
    WHERE id = p_id AND status NOT IN ('COMPLETED','CANCELLED');
  ELSIF p_kind = 'delivery' THEN
    UPDATE deliveries SET status = 'CANCELLED', cancelled_at = now() WHERE id = p_id AND status NOT IN ('DELIVERED','CANCELLED');
  ELSIF p_kind = 'order' THEN
    UPDATE orders SET status = 'CANCELLED', cancelled_at = now() WHERE id = p_id AND status NOT IN ('DELIVERED','CANCELLED');
  END IF;
  INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, new_value)
  VALUES (auth.uid(), 'cancel_job', p_kind, p_id::text, jsonb_build_object('reason', p_reason));
END $$;
GRANT EXECUTE ON FUNCTION public.admin_cancel_job(text, bigint, text) TO authenticated;

-- live map data for the dashboard
CREATE OR REPLACE FUNCTION public.admin_live()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN jsonb_build_object(
    'drivers', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', d.id, 'name', d.display_name, 'lat', d.current_lat, 'lng', d.current_lng,
                   'online', d.is_online, 'type', v.vehicle_type))
                 FROM drivers d LEFT JOIN vehicles v ON v.id = d.vehicle_id
                 WHERE d.current_lat IS NOT NULL AND (d.is_online OR d.location_at > now() - interval '1 hour')), '[]'::jsonb),
    'jobs', COALESCE((SELECT jsonb_agg(j) FROM (
        SELECT jsonb_build_object('kind','ride','id',id,'status',status,'lat',pickup_latitude,'lng',pickup_longitude) j
        FROM rides WHERE status IN ('SEARCHING','ASSIGNED','ARRIVING','ARRIVED','STARTED')
        UNION ALL SELECT jsonb_build_object('kind','delivery','id',id,'status',status,'lat',pickup_latitude,'lng',pickup_longitude)
        FROM deliveries WHERE status IN ('CREATED','ASSIGNED','PICKED_UP','ON_THE_WAY')
        UNION ALL SELECT jsonb_build_object('kind','order','id',o.id,'status',o.status,'lat',s.latitude,'lng',s.longitude)
        FROM orders o JOIN stores s ON s.id = o.store_id WHERE o.status IN ('PLACED','PREPARING','DRIVER_ASSIGNED','PICKED_UP','ON_THE_WAY')
      ) t), '[]'::jsonb));
END $$;
GRANT EXECUTE ON FUNCTION public.admin_live() TO authenticated;

-- ============================================================ realtime
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['rides','deliveries','orders','notifications'] LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
END $$;

SELECT 'KAP v2 applied ✅' AS result,
       (SELECT count(*) FROM stores) AS stores,
       (SELECT count(*) FROM products) AS products,
       (SELECT count(*) FROM coupons) AS coupons,
       (SELECT count(*) FROM pricing_rules) AS price_rules;
