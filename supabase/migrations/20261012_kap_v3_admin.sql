-- KAP v3: admin dashboard support + security hardening
-- Safe to re-run.

-- ------------------------------------------------------------ 1. close privilege escalation
-- profiles_self_update lets a user update their own row; without this guard they could set role = 'admin'.
CREATE OR REPLACE FUNCTION public.guard_profile_privileges()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- service role / SQL editor (no JWT user) and claim_first_admin may do anything
  IF auth.uid() IS NULL OR current_setting('kap.bypass_guard', true) = 'on' THEN RETURN NEW; END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.role IN ('admin', 'super_admin') AND NOT is_admin() THEN
      NEW.role := 'customer';
    END IF;
    RETURN NEW;
  END IF;

  IF (NEW.role IS DISTINCT FROM OLD.role OR NEW.is_active IS DISTINCT FROM OLD.is_active) THEN
    IF NOT is_admin() THEN
      RAISE EXCEPTION 'forbidden';
    END IF;
    -- only a super admin can create or remove a super admin; nobody can demote or disable themselves
    IF (NEW.role = 'super_admin' OR OLD.role = 'super_admin')
       AND NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin') THEN
      RAISE EXCEPTION 'forbidden';
    END IF;
    IF OLD.id = auth.uid() THEN
      RAISE EXCEPTION 'cannot_change_own_role';
    END IF;
    INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, old_value, new_value)
    VALUES (auth.uid(), 'profile_privileges', 'profile', OLD.id::text,
            jsonb_build_object('role', OLD.role, 'is_active', OLD.is_active),
            jsonb_build_object('role', NEW.role, 'is_active', NEW.is_active));
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS guard_profile_privileges ON profiles;
CREATE TRIGGER guard_profile_privileges BEFORE INSERT OR UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_profile_privileges();

-- ------------------------------------------------------------ 2. first owner becomes super admin
-- Works only for the owner's e-mail, only while the platform has no admin yet.
CREATE OR REPLACE FUNCTION public.claim_first_admin()
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
BEGIN
  IF auth.uid() IS NULL OR v_email <> 'aqym7038@gmail.com' THEN RETURN false; END IF;
  IF EXISTS (SELECT 1 FROM profiles WHERE role IN ('admin', 'super_admin')) THEN RETURN is_admin(); END IF;
  PERFORM set_config('kap.bypass_guard', 'on', true);
  INSERT INTO profiles (id, role) VALUES (auth.uid(), 'super_admin')
  ON CONFLICT (id) DO UPDATE SET role = 'super_admin', is_active = true;
  PERFORM set_config('kap.bypass_guard', 'off', true);
  INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, new_value)
  VALUES (auth.uid(), 'claim_first_admin', 'profile', auth.uid()::text, jsonb_build_object('email', v_email));
  RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.claim_first_admin() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.claim_first_admin() TO authenticated;

-- ------------------------------------------------------------ 3. Arabic menu sections
ALTER TABLE products ADD COLUMN IF NOT EXISTS section_ar text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS description_ar text;

UPDATE products SET section_ar = CASE section
    WHEN 'Baby' THEN 'الأطفال'
    WHEN 'Bakery' THEN 'المخبوزات'
    WHEN 'Bouquets' THEN 'باقات الورد'
    WHEN 'Burgers' THEN 'البرغر'
    WHEN 'Cakes' THEN 'الكيك'
    WHEN 'Care' THEN 'العناية'
    WHEN 'Coffee' THEN 'القهوة'
    WHEN 'Cold' THEN 'مشروبات باردة'
    WHEN 'Dairy' THEN 'الألبان'
    WHEN 'Desserts' THEN 'الحلويات'
    WHEN 'Drinks' THEN 'المشروبات'
    WHEN 'Fruits' THEN 'الفواكه'
    WHEN 'Gifts' THEN 'الهدايا'
    WHEN 'Grills' THEN 'المشاوي'
    WHEN 'Hot' THEN 'مشروبات ساخنة'
    WHEN 'Ice cream' THEN 'الآيس كريم'
    WHEN 'Meals' THEN 'الوجبات'
    WHEN 'Meat' THEN 'اللحوم'
    WHEN 'Oriental' THEN 'حلويات شرقية'
    WHEN 'Pain relief' THEN 'مسكنات الألم'
    WHEN 'Pantry' THEN 'المؤن'
    WHEN 'Sandwiches' THEN 'السندويشات'
    WHEN 'Sides' THEN 'المقبلات'
    WHEN 'Vegetables' THEN 'الخضار'
    WHEN 'Vitamins' THEN 'الفيتامينات'
    WHEN 'Menu' THEN 'القائمة'
    ELSE section_ar END
WHERE section_ar IS NULL;

-- ------------------------------------------------------------ 4. new cities inherit prices
CREATE OR REPLACE FUNCTION public.city_copy_prices()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_src bigint;
BEGIN
  SELECT c.id INTO v_src FROM cities c
  WHERE c.country_id = NEW.country_id AND c.id <> NEW.id AND EXISTS (SELECT 1 FROM pricing_rules p WHERE p.city_id = c.id)
  ORDER BY c.id LIMIT 1;
  IF v_src IS NOT NULL THEN
    INSERT INTO pricing_rules (service_key, city_id, vehicle_type, base_fare, per_km, per_min, min_fare, surge_multiplier, cancellation_fee, is_active)
    SELECT service_key, NEW.id, vehicle_type, base_fare, per_km, per_min, min_fare, 1, cancellation_fee, is_active
    FROM pricing_rules WHERE city_id = v_src
    ON CONFLICT (service_key, city_id, vehicle_type) DO NOTHING;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS city_copy_prices ON cities;
CREATE TRIGGER city_copy_prices AFTER INSERT ON cities FOR EACH ROW EXECUTE FUNCTION public.city_copy_prices();

-- ------------------------------------------------------------ 5. audit for price & flag changes
CREATE OR REPLACE FUNCTION public.audit_row_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NOT NULL THEN
    INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, old_value, new_value)
    VALUES (auth.uid(), lower(TG_OP), TG_TABLE_NAME, COALESCE(NEW.id, OLD.id)::text,
            CASE WHEN TG_OP <> 'INSERT' THEN to_jsonb(OLD) END, CASE WHEN TG_OP <> 'DELETE' THEN to_jsonb(NEW) END);
  END IF;
  RETURN COALESCE(NEW, OLD);
END $$;
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['pricing_rules','feature_flags','coupons','settings'] LOOP
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=t AND column_name='id') THEN
      EXECUTE format('DROP TRIGGER IF EXISTS audit_%1$s ON %1$I', t);
      EXECUTE format('CREATE TRIGGER audit_%1$s AFTER INSERT OR UPDATE OR DELETE ON %1$I FOR EACH ROW EXECUTE FUNCTION public.audit_row_change()', t);
    END IF;
  END LOOP;
END $$;

SELECT 'KAP v3 applied ✅' AS result,
       (SELECT count(*) FROM products WHERE section_ar IS NOT NULL) AS sections_ar,
       (SELECT count(*) FROM pg_trigger WHERE tgname = 'guard_profile_privileges') AS guard;

-- Arabic product descriptions
UPDATE products SET description_ar = CASE description
    WHEN '1.5L bottles' THEN 'عبوات 1.5 لتر'
    WHEN '100% fresh' THEN 'طازج 100%'
    WHEN '12 roses' THEN '12 وردة'
    WHEN '24 tablets' THEN '24 قرصًا'
    WHEN '250ml' THEN '250 مل'
    WHEN '3 scoops' THEN '3 كرات'
    WHEN '3-ply' THEN '3 طبقات'
    WHEN '30 effervescent tablets' THEN '30 قرصًا فوارًا'
    WHEN '500g assorted' THEN '500 غرام مشكّل'
    WHEN 'Beef patty, cheese, house sauce' THEN 'لحم بقري، جبن، صوص خاص'
    WHEN 'Berry topping' THEN 'صوص التوت'
    WHEN 'Cold can' THEN 'علبة باردة'
    WHEN 'Crispy & syrupy' THEN 'مقرمش بالقطر'
    WHEN 'Crispy golden fries' THEN 'بطاطا ذهبية مقرمشة'
    WHEN 'Double shot' THEN 'شوت مزدوج'
    WHEN 'Farm eggs' THEN 'بيض مزرعة'
    WHEN 'Fresh' THEN 'طازج'
    WHEN 'Fresh, whole' THEN 'طازج، كامل'
    WHEN 'Freshly ground' THEN 'مطحون طازجًا'
    WHEN 'Full cream' THEN 'كامل الدسم'
    WHEN 'Garlic sauce & pickles' THEN 'ثوم ومخلل'
    WHEN 'Hot, with cheese' THEN 'ساخن مع الجبن'
    WHEN 'Iced or hot' THEN 'بارد أو ساخن'
    WHEN 'Kebab, tikka, chicken, bread & salad' THEN 'كباب، تكة، دجاج، خبز وسلطة'
    WHEN 'Marinated chicken skewers with rice' THEN 'أسياخ دجاج متبّلة مع رز'
    WHEN 'Pack of 10' THEN 'عبوة 10 قطع'
    WHEN 'Premium basmati' THEN 'بسمتي ممتاز'
    WHEN 'Roses & chocolates' THEN 'ورد وشوكولاتة'
    WHEN 'Seasonal flowers' THEN 'زهور الموسم'
    WHEN 'Seasonal vegetables' THEN 'خضار الموسم'
    WHEN 'Serves 4 — grills, rice, salads, drinks' THEN 'تكفي 4 أشخاص: مشاوي، رز، سلطات، مشروبات'
    WHEN 'Size 4, 40 pcs' THEN 'مقاس 4، 40 قطعة'
    WHEN 'Strong tea with cardamom' THEN 'شاي ثقيل بالهيل'
    WHEN 'Whole cake, 8 pieces' THEN 'كيكة كاملة، 8 قطع'
    ELSE description_ar END
WHERE description_ar IS NULL;
