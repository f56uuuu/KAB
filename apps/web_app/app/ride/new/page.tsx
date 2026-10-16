'use client';

import { Glyph } from '@/components/Glyph';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Crosshair, X } from 'lucide-react';
import { KapMap, type MapMarker } from '@/components/KapMap';
import { BackButton, Button } from '@/components/ui';
import { PlaceResults, usePlaceSearch } from '@/components/PlaceSearch';
import { PromoField, type Promo } from '@/components/PromoField';
import { useI18n } from '@/lib/i18n';
import { sb } from '@/lib/hooks';
import { useMyLocation } from '@/lib/location';
import { mapProvider, type LatLng, type Place, type Route } from '@/lib/maps';
import { errorCode, money } from '@/lib/format';
import { trips as tripStore } from '@/lib/offline';

type Quote = { currency: string; km: number; min: number; options: { vehicle_type: string; amount: number; surge: number; cancellation_fee: number }[] };
const VEHICLE_GLYPH: Record<string, string> = { ECONOMY: 'sedan', COMFORT: 'suv', XL: 'van' };

export default function NewRidePage() {
  return (
    <Suspense>
      <NewRide />
    </Suspense>
  );
}

function NewRide() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const params = useSearchParams();
  const loc = useMyLocation();

  const [pickup, setPickup] = useState<LatLng | null>(null);
  const [pickupLabel, setPickupLabel] = useState<string>('');
  const [dest, setDest] = useState<Place | null>(null);
  const [query, setQuery] = useState('');
  const [route, setRoute] = useState<Route | null>(null);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [vehicle, setVehicle] = useState('ECONOMY');
  const [promo, setPromo] = useState<Promo>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [fitKey, setFitKey] = useState(0);
  const sheetRef = useRef<HTMLDivElement>(null);
  const [sheetH, setSheetH] = useState(300);
  const search = usePlaceSearch(dest ? '' : query, pickup);

  // pickup = current position (draggable)
  useEffect(() => {
    if (!loc.ready || pickup) return;
    setPickup(loc.point);
    setPickupLabel(loc.address ?? t('home.current_location'));
    setFitKey((k) => k + 1);
  }, [loc.ready]); // eslint-disable-line react-hooks/exhaustive-deps

  // destination passed in from a saved place
  useEffect(() => {
    const to = params.get('to');
    if (!to) return;
    const [lat, lng] = to.split(',').map(Number);
    if (Number.isFinite(lat) && Number.isFinite(lng)) setDest({ label: params.get('label') || '', point: { lat, lng } });
  }, [params]);

  // measure the bottom sheet so the map keeps the route visible above it
  useEffect(() => {
    if (!sheetRef.current) return;
    const ro = new ResizeObserver(([e]) => setSheetH(e.contentRect.height));
    ro.observe(sheetRef.current);
    return () => ro.disconnect();
  }, []);

  // route + server quote
  useEffect(() => {
    if (!pickup || !dest) {
      setRoute(null);
      setQuote(null);
      return;
    }
    let alive = true;
    setError(null);
    (async () => {
      const r = await mapProvider.route(pickup, dest.point).catch(() => null);
      if (!alive) return;
      setRoute(r);
      if (r?.path?.length) tripStore.save({ from: pickup, to: dest.point, toName: dest.label || query || '—', path: r.path, km: r.distanceKm, min: r.durationMin });
      setFitKey((k) => k + 1);
      const { data, error: err } = await sb().rpc('quote_trip', {
        p_service: 'RIDE',
        p_from_lat: pickup.lat,
        p_from_lng: pickup.lng,
        p_to_lat: dest.point.lat,
        p_to_lng: dest.point.lng,
        p_km: r?.distanceKm ?? null,
        p_min: r?.durationMin ?? null,
      });
      if (!alive) return;
      if (err || (data as any)?.error) {
        setError(t(`error.${errorCode(err ?? { message: (data as any)?.error })}` as any));
        setQuote(null);
        return;
      }
      setQuote(data as any);
      if (!r) setError(null);
    })();
    return () => {
      alive = false;
    };
  }, [pickup, dest]); // eslint-disable-line react-hooks/exhaustive-deps

  // re-validate promo when the price changes
  useEffect(() => setPromo(null), [vehicle, quote?.km]);

  const selected = quote?.options.find((o) => o.vehicle_type === vehicle) ?? quote?.options[0];

  const markers = useMemo<MapMarker[]>(() => {
    const m: MapMarker[] = [];
    if (pickup) m.push({ id: 'pickup', kind: 'pickup', ...pickup, draggable: !busy });
    if (dest) m.push({ id: 'dest', kind: 'dropoff', ...dest.point, draggable: !busy });
    return m;
  }, [pickup, dest, busy]);

  function onDrag(id: string, p: LatLng) {
    if (id === 'pickup') {
      setPickup(p);
      mapProvider.reverse(p).then((a) => setPickupLabel(a ?? t('home.current_location'))).catch(() => {});
    } else if (dest) {
      setDest({ point: p, label: dest.label });
      mapProvider.reverse(p).then((a) => a && setDest({ point: p, label: a })).catch(() => {});
    }
  }

  function onMapClick(p: LatLng) {
    if (dest || busy) return;
    setDest({ point: p, label: '' });
    mapProvider.reverse(p).then((a) => setDest({ point: p, label: a ?? '' })).catch(() => {});
  }

  async function confirm() {
    if (!pickup || !dest || !selected) return;
    setBusy(true);
    setError(null);
    const { data, error: err } = await sb().rpc('create_ride', {
      p_from_lat: pickup.lat,
      p_from_lng: pickup.lng,
      p_from_addr: pickupLabel,
      p_to_lat: dest.point.lat,
      p_to_lng: dest.point.lng,
      p_to_addr: dest.label || query,
      p_vehicle: selected.vehicle_type,
      p_km: route?.distanceKm ?? null,
      p_min: route?.durationMin ?? null,
      p_coupon: promo?.code ?? null,
    });
    if (err || !data) {
      setBusy(false);
      setError(t(`error.${errorCode(err)}` as any));
      return;
    }
    router.replace(`/ride/${(data as any).id}`);
  }

  return (
    <main className="fixed inset-0 bg-background">
      <KapMap
        className="absolute inset-0"
        markers={markers}
        route={route?.path}
        fitKey={fitKey}
        bottomInset={sheetH}
        padding={[40, 150]}
        onDragEnd={onDrag}
        onClick={onMapClick}
      />

      {/* floating top card: pickup + destination */}
      <div className="absolute top-0 inset-x-0 z-[500] safe-top px-4 pt-2">
        <div className="max-w-md mx-auto flex gap-3 items-start">
          <BackButton href="/home" />
          <div className="flex-1 rounded-2xl bg-raised shadow-float overflow-hidden">
            <div className="flex items-center gap-3 px-4 h-12 border-b border-border">
              <span className="w-3 h-3 rounded-full bg-accent ring-[3px] ring-ink shrink-0" />
              <span className="text-sm truncate text-muted">{pickupLabel || t('map.locating')}</span>
            </div>
            <div className="flex items-center gap-3 px-4 h-12">
              <span className="w-3 h-3 rounded-[3px] bg-ink ring-[3px] ring-accent shrink-0" />
              {dest ? (
                <>
                  <span className="text-sm font-bold truncate flex-1">{dest.label || '…'}</span>
                  {!busy && (
                    <button
                      aria-label={t('common.close')}
                      onClick={() => {
                        setDest(null);
                        setQuery('');
                      }}
                      className="w-8 h-8 -me-2 flex items-center justify-center text-muted"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </>
              ) : (
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t('map.search_destination')}
                  className="flex-1 min-w-0 bg-transparent outline-none text-sm font-bold placeholder:font-medium placeholder:text-muted"
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* recentre */}
      <button
        aria-label={t('map.my_location')}
        onClick={() => setFitKey((k) => k + 1)}
        className="absolute z-[500] end-4 w-12 h-12 rounded-full bg-raised shadow-float flex items-center justify-center"
        style={{ bottom: sheetH + 16 }}
      >
        <Crosshair className="w-5 h-5" />
      </button>

      {/* bottom sheet */}
      <div ref={sheetRef} className="absolute bottom-0 inset-x-0 z-[600] max-h-[62vh] flex flex-col">
        <div className="max-w-md mx-auto w-full bg-background rounded-t-sheet shadow-sheet flex flex-col max-h-[62vh]">
          <div className="pt-2.5 pb-1 flex justify-center">
            <span className="w-10 h-1.5 rounded-full bg-border" />
          </div>
          <div className="overflow-y-auto px-5 pb-3">
            {!dest && (
              <>
                {loc.ready && loc.approximate && <p className="text-xs text-muted py-2">{t('map.approximate')}</p>}
                {query.trim().length < 2 ? (
                  <p className="text-sm text-muted py-3">{t('map.drag_hint')}</p>
                ) : (
                  <PlaceResults
                    {...search}
                    onPick={(p) => {
                      setDest(p);
                      setQuery(p.label);
                    }}
                  />
                )}
              </>
            )}

            {dest && !quote && !error && <p className="text-sm text-muted py-6 text-center">{t('common.loading')}</p>}

            {dest && quote && (
              <div className="flex flex-col gap-2 pt-1">
                <div className="flex items-baseline justify-between">
                  <h2 className="font-extrabold text-lg">{t('ride.choose')}</h2>
                  <span className="text-xs text-muted">
                    {t('ride.trip_info', { km: Number(quote.km).toLocaleString(locale), min: quote.min })}
                  </span>
                </div>
                {quote.options.some((o) => Number(o.surge) > 1) && (
                  <p className="text-xs font-bold text-warning">
                    {t('ride.surge', { x: Math.max(...quote.options.map((o) => Number(o.surge))) })}
                  </p>
                )}
                <div role="radiogroup" className="flex flex-col gap-2">
                  {quote.options.map((o) => {
                    const on = selected?.vehicle_type === o.vehicle_type;
                    return (
                      <button
                        key={o.vehicle_type}
                        role="radio"
                        aria-checked={on}
                        onClick={() => setVehicle(o.vehicle_type)}
                        className={`flex items-center gap-3 rounded-2xl px-4 py-3 border-2 text-start transition-colors ${
                          on ? 'border-accent bg-accent/10' : 'border-transparent bg-surface'
                        }`}
                      >
                        <Glyph name={VEHICLE_GLYPH[o.vehicle_type] ?? 'sedan'} className="w-14 h-14 shrink-0" />
                        <span className="flex-1 min-w-0">
                          <span className="block font-semibold">{t(`vehicle.${o.vehicle_type}` as any)}</span>
                          <span className="block text-xs text-muted">{t(`vehicle.${o.vehicle_type}_sub` as any)}</span>
                        </span>
                        <span className="font-bold text-lg">{money(o.amount, quote.currency, locale)}</span>
                      </button>
                    );
                  })}
                </div>
                {selected && (
                  <PromoField
                    service="RIDE"
                    amount={Number(selected.amount)}
                    currency={quote.currency}
                    value={promo}
                    onChange={setPromo}
                  />
                )}
                <p className="text-xs text-muted">
                  {t('ride.price_note')}{' '}
                  {selected && Number(selected.cancellation_fee) > 0 &&
                    t('ride.cancel_fee', { fee: money(selected.cancellation_fee, quote.currency, locale) })}
                </p>
              </div>
            )}

            {error && (
              <p role="alert" className="text-danger text-sm font-medium py-2">
                {error}
              </p>
            )}
          </div>
          {dest && quote && selected && (
            <div className="px-5 pt-2 safe-bottom border-t border-border">
              <Button full loading={busy} onClick={confirm} className="justify-between">
                <span>{busy ? t('ride.requesting') : t('ride.confirm', { vehicle: t(`vehicle.${selected.vehicle_type}` as any) })}</span>
                <span className="font-black">
                  {money(Math.max(Number(selected.amount) - (promo?.discount ?? 0), 0), quote.currency, locale)}
                </span>
              </Button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
