'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';

const VEHICLES = [
  { type: 'ECONOMY', label: 'اقتصادية', icon: '🚗' },
  { type: 'COMFORT', label: 'مريحة', icon: '🚙' },
  { type: 'XL', label: 'عائلية', icon: '🚐' },
];

function loadGoogleMapsScript(apiKey: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if ((window as any).google?.maps) return resolve();
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('maps_failed_to_load'));
    document.head.appendChild(script);
  });
}

export default function NewRidePage() {
  const router = useRouter();
  const destinationInputRef = useRef<HTMLInputElement>(null);
  const [pickup, setPickup] = useState<google.maps.LatLngLiteral | null>(null);
  const [pickupAddress, setPickupAddress] = useState('جارٍ تحديد موقعك…');
  const [destination, setDestination] = useState<google.maps.LatLngLiteral | null>(null);
  const [destinationAddress, setDestinationAddress] = useState('');
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [durationMin, setDurationMin] = useState<number | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState('ECONOMY');
  const [prices, setPrices] = useState<Record<string, { amount: number; currency: string }>>({});
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 1. Load Maps + resolve current position as pickup.
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!;
    loadGoogleMapsScript(apiKey)
      .then(() => {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const point = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            setPickup(point);
            const geocoder = new google.maps.Geocoder();
            geocoder.geocode({ location: point }, (results) => {
              setPickupAddress(results?.[0]?.formatted_address ?? 'موقعك الحالي');
            });
          },
          () => setPickupAddress('تعذر تحديد الموقع — فعّل صلاحية الموقع'),
        );
      })
      .catch(() => setError('تعذر تحميل الخرائط'));
  }, []);

  // 2. Wire the Places Autocomplete once Maps + pickup are ready.
  useEffect(() => {
    if (!pickup || !destinationInputRef.current || !(window as any).google?.maps) return;
    const autocomplete = new google.maps.places.Autocomplete(destinationInputRef.current, {
      fields: ['geometry', 'formatted_address'],
    });
    const listener = autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      if (!place.geometry?.location) return;
      const point = { lat: place.geometry.location.lat(), lng: place.geometry.location.lng() };
      setDestination(point);
      setDestinationAddress(place.formatted_address ?? '');
    });
    return () => listener.remove();
  }, [pickup]);

  // 3. Once both points exist, get the real route, then price every vehicle.
  useEffect(() => {
    if (!pickup || !destination) return;
    const directionsService = new google.maps.DirectionsService();
    directionsService.route(
      { origin: pickup, destination, travelMode: google.maps.TravelMode.DRIVING },
      async (result, status) => {
        if (status !== 'OK' || !result) {
          setError('تعذر حساب المسار');
          return;
        }
        const leg = result.routes[0].legs[0];
        const km = (leg.distance?.value ?? 0) / 1000;
        const min = Math.ceil((leg.duration?.value ?? 0) / 60);
        setDistanceKm(km);
        setDurationMin(min);
        await loadPrices(km, min);
      },
    );
  }, [pickup, destination]);

  async function loadPrices(km: number, min: number) {
    const supabase = createSupabaseBrowserClient();
    const { data: city } = await supabase
      .rpc('nearest_city', { p_lat: pickup!.lat, p_lng: pickup!.lng })
      .single();
    if (!city) return;

    const { data: country } = await supabase
      .from('countries')
      .select('currency_code')
      .eq('id', (city as any).country_id)
      .single();

    const results: Record<string, { amount: number; currency: string }> = {};
    for (const v of VEHICLES) {
      const { data: rule } = await supabase
        .from('pricing_rules')
        .select('*')
        .eq('service_key', 'RIDE')
        .eq('city_id', (city as any).id)
        .eq('vehicle_type', v.type)
        .eq('is_active', true)
        .maybeSingle();
      if (!rule) continue;
      const surge = rule.surge_multiplier ?? 1;
      const raw = (rule.base_fare + rule.per_km * km + rule.per_min * min) * surge;
      const amount = Math.max(raw, rule.min_fare);
      results[v.type] = { amount: Math.round(amount * 100) / 100, currency: country?.currency_code ?? '' };
    }
    setPrices(results);
  }

  async function confirmRide() {
    if (!pickup || !destination) return;
    setCreating(true);
    setError(null);
    const supabase = createSupabaseBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: city } = await supabase
      .rpc('nearest_city', { p_lat: pickup.lat, p_lng: pickup.lng })
      .single();

    const estimate = prices[selectedVehicle];
    const { data: row, error: err } = await supabase
      .from('rides')
      .insert({
        customer_id: user.id,
        status: 'SEARCHING',
        pickup_location: `POINT(${pickup.lng} ${pickup.lat})`,
        pickup_address: pickupAddress,
        dropoff_location: `POINT(${destination.lng} ${destination.lat})`,
        dropoff_address: destinationAddress,
        vehicle_type: selectedVehicle,
        estimated_fare: estimate?.amount,
        currency_code: estimate?.currency,
        distance_km: distanceKm,
        duration_min: durationMin,
        country_id: (city as any)?.country_id,
        city_id: (city as any)?.id,
      })
      .select()
      .single();

    setCreating(false);
    if (err || !row) {
      setError('تعذر إنشاء الرحلة');
      return;
    }
    router.push(`/ride/${row.id}`);
  }

  return (
    <main className="min-h-screen bg-background pb-10">
      <div className="px-5 pt-6 flex flex-col gap-3">
        <h1 className="font-extrabold text-xl">إلى أين؟</h1>

        <div className="h-13 flex items-center gap-2 border border-border rounded-2xl bg-surface px-4 py-3">
          <span className="text-accentPressed">📍</span>
          <span className="text-sm truncate">{pickupAddress}</span>
        </div>

        <div className="h-13 flex items-center gap-2 border border-border rounded-2xl px-4 py-3">
          <span className="text-danger">📍</span>
          <input
            ref={destinationInputRef}
            placeholder="أدخل الوجهة"
            className="flex-1 outline-none text-sm"
          />
        </div>

        {error && <p className="text-danger text-sm">{error}</p>}

        {Object.keys(prices).length > 0 && (
          <div className="flex flex-col gap-3 mt-4">
            <h2 className="font-bold text-sm text-neutralGray">اختر رحلتك</h2>
            {VEHICLES.filter((v) => prices[v.type]).map((v) => {
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
                  <span className="flex-1">
                    <span className="block font-bold text-sm">{v.label}</span>
                    <span className="block text-xs text-neutralGray">
                      {distanceKm?.toFixed(1)} كم · {durationMin} دقيقة
                    </span>
                  </span>
                  <span className="font-extrabold">{p.amount} {p.currency}</span>
                </button>
              );
            })}

            <button
              onClick={confirmRide}
              disabled={creating}
              className="h-14 rounded-2xl bg-accent text-ink font-extrabold mt-2 disabled:opacity-50"
            >
              {creating ? 'جارٍ الطلب…' : `تأكيد · ${prices[selectedVehicle]?.amount ?? ''} ${prices[selectedVehicle]?.currency ?? ''}`}
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
