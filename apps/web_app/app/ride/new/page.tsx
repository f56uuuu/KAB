'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';
import { DEFAULT_CENTER, getCurrentPosition, loadLeaflet, mapProvider, type LatLng, type Place } from '@/lib/maps';

const VEHICLES = [
  { type: 'ECONOMY', label: 'اقتصادية', icon: '🚗' },
  { type: 'COMFORT', label: 'مريحة', icon: '🚙' },
  { type: 'XL', label: 'عائلية', icon: '🚐' },
];

type Price = { amount: number; currency: string };

function formatMoney(p: Price) {
  return `${new Intl.NumberFormat('ar', { maximumFractionDigits: p.currency === 'AED' ? 2 : 0 }).format(p.amount)} ${p.currency}`;
}

export default function NewRidePage() {
  const router = useRouter();
  const mapEl = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const pickupMarker = useRef<any>(null);
  const destMarker = useRef<any>(null);
  const routeLine = useRef<any>(null);

  const [pickup, setPickup] = useState<LatLng | null>(null);
  const [pickupAddress, setPickupAddress] = useState('جارٍ تحديد موقعك…');
  const [locating, setLocating] = useState(true);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Place[]>([]);
  const [searching, setSearching] = useState(false);
  const [noResults, setNoResults] = useState(false);
  const [destination, setDestination] = useState<Place | null>(null);
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [durationMin, setDurationMin] = useState<number | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState('ECONOMY');
  const [prices, setPrices] = useState<Record<string, Price>>({});
  const [city, setCity] = useState<any>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapFailed, setMapFailed] = useState(false);

  // 1a. Current position — independent of the map, so booking works even if the map fails.
  useEffect(() => {
    let cancelled = false;
    getCurrentPosition().then(({ point, approximate }) => {
      if (cancelled) return;
      setPickup(point);
      setLocating(false);
      if (approximate) setNotice('تعذر تحديد موقعك بدقة — اسحب الدبوس الأصفر إلى نقطة الالتقاء');
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // 1b. Map (bundled Leaflet + OpenStreetMap tiles).
  useEffect(() => {
    let cancelled = false;
    loadLeaflet()
      .then((L) => {
        if (cancelled || !mapEl.current || mapRef.current) return;
        const map = L.map(mapEl.current, { zoomControl: false, attributionControl: true }).setView(
          [DEFAULT_CENTER.lat, DEFAULT_CENTER.lng],
          13,
        );
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '© OpenStreetMap',
        }).addTo(map);
        (map as any)._kapIcon = (color: string) =>
          L.divIcon({
            className: '',
            html: `<div style="width:22px;height:22px;border-radius:50%;background:${color};border:4px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.35)"></div>`,
            iconSize: [22, 22],
            iconAnchor: [11, 11],
          });
        mapRef.current = map;
        setMapReady(true);
      })
      .catch(() => !cancelled && setMapFailed(true));
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  // 1c. Draggable pickup pin once both the map and the position are known.
  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map || !pickup) return;
    const L = (window as any).L;
    if (!pickupMarker.current) {
      pickupMarker.current = L.marker([pickup.lat, pickup.lng], {
        draggable: true,
        icon: (map as any)._kapIcon('#FFD100'),
      }).addTo(map);
      pickupMarker.current.on('dragend', () => {
        const ll = pickupMarker.current.getLatLng();
        setNotice(null);
        setPickup({ lat: ll.lat, lng: ll.lng });
      });
      map.setView([pickup.lat, pickup.lng], 15);
    }
  }, [mapReady, pickup]);

  // 2. Address + city for the pickup point.
  useEffect(() => {
    if (!pickup) return;
    mapProvider
      .reverse(pickup)
      .catch(() => null)
      .then((a) => setPickupAddress(a ?? 'موقعك الحالي'));
    const supabase = createSupabaseBrowserClient();
    supabase
      .rpc('nearest_city', { p_lat: pickup.lat, p_lng: pickup.lng })
      .maybeSingle()
      .then(({ data }) => setCity(data));
  }, [pickup]);

  // 3. Destination search (debounced).
  useEffect(() => {
    if (destination && query === destination.label) return;
    const q = query.trim();
    setNoResults(false);
    if (q.length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const found = await mapProvider.search(q, pickup ?? undefined);
        setResults(found);
        setNoResults(found.length === 0);
      } catch {
        setResults([]);
        setNoResults(true);
      } finally {
        setSearching(false);
      }
    }, 450);
    return () => clearTimeout(t);
  }, [query, pickup, destination]);

  // 4. Route + prices once both points exist.
  useEffect(() => {
    if (!pickup || !destination) return;
    const L = (window as any).L;
    const map = mapRef.current;
    if (map && L) {
      destMarker.current?.remove();
      destMarker.current = L.marker([destination.point.lat, destination.point.lng], {
        icon: (map as any)._kapIcon('#0D0D0F'),
      }).addTo(map);
    }

    let cancelled = false;
    setError(null);
    mapProvider
      .route(pickup, destination.point)
      .catch(() => null)
      .then(async (route) => {
        if (cancelled) return;
        if (!route) {
          setError('تعذر حساب المسار — جرّب وجهة أخرى');
          return;
        }
        if (map && L) {
          routeLine.current?.remove();
          routeLine.current = L.polyline(route.path, { color: '#0D0D0F', weight: 5, opacity: 0.85 }).addTo(map);
          map.fitBounds(routeLine.current.getBounds(), { padding: [40, 40] });
        }
        setDistanceKm(route.distanceKm);
        setDurationMin(route.durationMin);
        await loadPrices(route.distanceKm, route.durationMin);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickup, destination, city, mapReady]);

  async function loadPrices(km: number, min: number) {
    if (!city) return;
    const supabase = createSupabaseBrowserClient();
    const [{ data: country }, { data: rules }] = await Promise.all([
      supabase.from('countries').select('currency_code').eq('id', city.country_id).single(),
      supabase.from('pricing_rules').select('*').eq('service_key', 'RIDE').eq('city_id', city.id).eq('is_active', true),
    ]);
    const out: Record<string, Price> = {};
    for (const rule of rules ?? []) {
      const raw = (+rule.base_fare + +rule.per_km * km + +rule.per_min * min) * (+rule.surge_multiplier || 1);
      const amount = Math.max(raw, +rule.min_fare);
      const currency = country?.currency_code ?? '';
      out[rule.vehicle_type] = {
        amount: currency === 'AED' ? Math.round(amount * 100) / 100 : Math.ceil(amount / 250) * 250,
        currency,
      };
    }
    if (Object.keys(out).length === 0) setError('الخدمة غير متاحة في هذه المدينة بعد');
    setPrices(out);
  }

  function chooseDestination(p: Place) {
    setDestination(p);
    setQuery(p.label);
    setResults([]);
  }

  async function confirmRide() {
    if (!pickup || !destination) return;
    const estimate = prices[selectedVehicle];
    if (!estimate) return;
    setCreating(true);
    setError(null);
    const supabase = createSupabaseBrowserClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      window.location.assign('/login');
      return;
    }
    const { data: row, error: err } = await supabase
      .from('rides')
      .insert({
        customer_id: user.id,
        status: 'SEARCHING',
        pickup_location: `POINT(${pickup.lng} ${pickup.lat})`,
        pickup_latitude: pickup.lat,
        pickup_longitude: pickup.lng,
        pickup_address: pickupAddress,
        dropoff_location: `POINT(${destination.point.lng} ${destination.point.lat})`,
        dropoff_latitude: destination.point.lat,
        dropoff_longitude: destination.point.lng,
        dropoff_address: destination.label,
        vehicle_type: selectedVehicle,
        estimated_fare: estimate.amount,
        currency_code: estimate.currency,
        distance_km: distanceKm,
        duration_min: durationMin,
        country_id: city?.country_id,
        city_id: city?.id,
      })
      .select('id')
      .single();

    setCreating(false);
    if (err || !row) {
      setError(`تعذر إنشاء الرحلة (${err?.message ?? 'unknown'})`);
      return;
    }
    router.push(`/ride/${row.id}`);
  }

  const vehiclesWithPrice = VEHICLES.filter((v) => prices[v.type]);

  return (
    <main className="min-h-screen bg-background flex flex-col">
      <div className="relative h-[45vh] min-h-[260px] bg-surface">
        <div ref={mapEl} className="absolute inset-0 z-0" />
        <button
          onClick={() => router.push('/home')}
          className="absolute top-4 right-4 z-[500] w-10 h-10 rounded-full bg-background shadow flex items-center justify-center"
          aria-label="رجوع"
        >
          →
        </button>
        {!mapReady && (
          <div className="absolute inset-0 z-[400] flex items-center justify-center text-sm text-neutralGray px-8 text-center">
            {mapFailed ? 'تعذر عرض الخريطة — يمكنك متابعة الطلب بالبحث عن الوجهة' : 'جارٍ تحميل الخريطة…'}
          </div>
        )}
      </div>

      <div className="flex-1 -mt-5 relative z-[500] bg-background rounded-t-3xl px-5 pt-5 pb-10 flex flex-col gap-3 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
        <h1 className="font-extrabold text-xl">إلى أين؟</h1>

        <div className="flex items-center gap-2 border border-border rounded-2xl bg-surface px-4 py-3">
          <span className="w-3 h-3 rounded-full bg-accent shrink-0" />
          <span className="text-sm truncate">{pickupAddress}</span>
        </div>

        <div className="relative">
          <div className="flex items-center gap-2 border border-border rounded-2xl px-4 py-3 focus-within:ring-2 focus-within:ring-accent">
            <span className="w-3 h-3 rounded-sm bg-ink shrink-0" />
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                if (destination) setDestination(null);
              }}
              placeholder="ابحث عن الوجهة (مثال: المنصور مول)"
              className="flex-1 outline-none text-sm bg-transparent"
            />
            {searching && <span className="text-xs text-neutralGray">…</span>}
          </div>
          {results.length > 0 && (
            <ul className="absolute inset-x-0 top-full mt-1 bg-background border border-border rounded-2xl shadow-lg overflow-hidden z-10">
              {results.map((r, i) => (
                <li key={i}>
                  <button
                    onClick={() => chooseDestination(r)}
                    className="w-full text-right px-4 py-3 text-sm hover:bg-surface border-b border-border last:border-0"
                  >
                    📍 {r.label}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {noResults && !destination && (
          <p className="text-sm text-neutralGray">لا توجد نتائج — جرّب اسم منطقة أو معلم قريب</p>
        )}
        {notice && !error && <p className="text-xs text-neutralGray">{notice}</p>}
        {error && <p className="text-danger text-sm">{error}</p>}

        {destination && vehiclesWithPrice.length === 0 && !error && (
          <p className="text-sm text-neutralGray">جارٍ حساب السعر…</p>
        )}

        {vehiclesWithPrice.length > 0 && (
          <div className="flex flex-col gap-3 mt-2">
            <h2 className="font-bold text-sm text-neutralGray">
              اختر رحلتك · {distanceKm?.toFixed(1)} كم · {durationMin} دقيقة
            </h2>
            {vehiclesWithPrice.map((v) => {
              const p = prices[v.type];
              const selected = selectedVehicle === v.type;
              return (
                <button
                  key={v.type}
                  onClick={() => setSelectedVehicle(v.type)}
                  className={`flex items-center gap-3 rounded-2xl p-4 border text-right ${
                    selected ? 'border-accentPressed bg-accent/10' : 'border-border'
                  }`}
                >
                  <span className="text-2xl">{v.icon}</span>
                  <span className="flex-1 font-bold text-sm">{v.label}</span>
                  <span className="font-extrabold">{formatMoney(p)}</span>
                </button>
              );
            })}
            <p className="text-xs text-neutralGray">السعر تقديري ولا توجد رسوم مخفية. الدفع نقدًا.</p>
            <button
              onClick={confirmRide}
              disabled={creating}
              className="h-14 rounded-2xl bg-accent text-ink font-extrabold disabled:opacity-50"
            >
              {creating ? 'جارٍ الطلب…' : `تأكيد الرحلة · ${formatMoney(prices[selectedVehicle] ?? vehiclesWithPrice.map((v) => prices[v.type])[0])}`}
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
