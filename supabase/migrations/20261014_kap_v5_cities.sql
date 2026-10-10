-- KAP v5: every governorate / emirate as a city, tidy ordering, stores & menus in every city.
-- Safe to re-run.

ALTER TABLE cities ADD COLUMN IF NOT EXISTS sort int NOT NULL DEFAULT 100;

-- ------------------------------------------------------------ missing governorates / emirates
INSERT INTO cities (country_id, name, name_ar, latitude, longitude, is_active)
SELECT co.id, v.name, v.name_ar, v.lat, v.lng, true
FROM (VALUES
  ('IQ','Duhok','دهوك',36.8669,42.9503), ('IQ','Ramadi','الرمادي',33.4258,43.2992), ('IQ','Hillah','الحلة',32.4637,44.4199),
  ('IQ','Kut','الكوت',32.5128,45.8182), ('IQ','Baqubah','بعقوبة',33.7466,44.6437), ('IQ','Tikrit','تكريت',34.6071,43.6782),
  ('IQ','Diwaniyah','الديوانية',31.9929,44.9255), ('IQ','Nasiriyah','الناصرية',31.0439,46.2573), ('IQ','Amarah','العمارة',31.8356,47.1440),
  ('IQ','Samawah','السماوة',31.3099,45.2803), ('IQ','Halabja','حلبجة',35.1778,45.9861),
  ('AE','Ajman','عجمان',25.4052,55.5136), ('AE','Umm Al Quwain','أم القيوين',25.5647,55.5552), ('AE','Ras Al Khaimah','رأس الخيمة',25.8007,55.9762),
  ('AE','Fujairah','الفجيرة',25.1288,56.3265), ('AE','Al Ain','العين',24.2075,55.7447),
  ('SY','Rif Dimashq','ريف دمشق',33.5711,36.4019), ('SY','Hama','حماة',35.1318,36.7578), ('SY','Tartus','طرطوس',34.8890,35.8866),
  ('SY','Idlib','إدلب',35.9306,36.6339), ('SY','Raqqa','الرقة',35.9528,39.0079), ('SY','Deir ez-Zor','دير الزور',35.3359,40.1408),
  ('SY','Hasakah','الحسكة',36.5024,40.7477), ('SY','Daraa','درعا',32.6189,36.1021), ('SY','As-Suwayda','السويداء',32.7090,36.5695),
  ('SY','Quneitra','القنيطرة',33.1260,35.8245)
) AS v(cc, name, name_ar, lat, lng)
JOIN countries co ON co.code = v.cc
WHERE NOT EXISTS (SELECT 1 FROM cities c WHERE c.country_id = co.id AND lower(c.name) = lower(v.name));

-- capitals and biggest cities first, then alphabetical (Arabic) inside each country
UPDATE cities c SET sort = CASE c.name
    WHEN 'Baghdad' THEN 1 WHEN 'Basra' THEN 2 WHEN 'Mosul' THEN 3 WHEN 'Erbil' THEN 4
    WHEN 'Dubai' THEN 1 WHEN 'Abu Dhabi' THEN 2 WHEN 'Sharjah' THEN 3
    WHEN 'Damascus' THEN 1 WHEN 'Aleppo' THEN 2 WHEN 'Homs' THEN 3
    ELSE 100 END;

-- ------------------------------------------------------------ stores + menus for every city
-- template = the city in the same country with the most stores; positions keep their offset from the city centre
DO $$
DECLARE tgt record; tpl record; st record; v_new bigint;
BEGIN
  FOR tgt IN SELECT c.* FROM cities c WHERE c.is_active LOOP
    SELECT c.* INTO tpl FROM cities c
    WHERE c.country_id = tgt.country_id AND c.id <> tgt.id
    ORDER BY (SELECT count(*) FROM stores s WHERE s.city_id = c.id) DESC, c.id LIMIT 1;
    CONTINUE WHEN tpl.id IS NULL;
    FOR st IN SELECT s.* FROM stores s WHERE s.city_id = tpl.id
              AND NOT EXISTS (SELECT 1 FROM stores x WHERE x.city_id = tgt.id AND x.name = s.name) LOOP
      INSERT INTO stores (city_id, name, name_ar, category, emoji, color, rating, delivery_minutes, delivery_fee, min_order,
                          latitude, longitude, address, is_open, is_active, sort)
      VALUES (tgt.id, st.name, st.name_ar, st.category, st.emoji, st.color, st.rating, st.delivery_minutes, st.delivery_fee, st.min_order,
              tgt.latitude + (st.latitude - tpl.latitude), tgt.longitude + (st.longitude - tpl.longitude),
              coalesce(tgt.name_ar, tgt.name), st.is_open, st.is_active, st.sort)
      RETURNING id INTO v_new;
      INSERT INTO products (store_id, name, name_ar, description, description_ar, section, section_ar, price, emoji, is_available, sort)
      SELECT v_new, p.name, p.name_ar, p.description, p.description_ar, p.section, p.section_ar, p.price, p.emoji, p.is_available, p.sort
      FROM products p WHERE p.store_id = st.id;
    END LOOP;
  END LOOP;
END $$;

SELECT 'KAP v5 applied ✅' AS result,
       (SELECT count(*) FROM cities) AS cities,
       (SELECT count(*) FROM cities c WHERE NOT EXISTS (SELECT 1 FROM stores s WHERE s.city_id = c.id)) AS cities_without_stores,
       (SELECT count(*) FROM stores) AS stores,
       (SELECT count(*) FROM pricing_rules) AS price_rules;
