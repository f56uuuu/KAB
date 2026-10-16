'use client';

import { Glyph } from '@/components/Glyph';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LocateFixed, X } from 'lucide-react';
import { KapMap, type MapMarker } from '@/components/KapMap';
import { BackButton, Button, Field, inputCls } from '@/components/ui';
import { PlaceResults, usePlaceSearch } from '@/components/PlaceSearch';
import { PromoField, type Promo } from '@/components/PromoField';
import { useI18n } from '@/lib/i18n';
import { sb } from '@/lib/hooks';
import { useMyLocation } from '@/lib/location';
import { mapProvider, type Place, type Route } from '@/lib/maps';
import { errorCode, money } from '@/lib/format';
import { trips as tripStore } from '@/lib/offline';

const TYPES = [
  { key: 'documents', emoji: 'document' },
  { key: 'parcel', emoji: 'box' },
  { key: 'food', emoji: 'takeout' },
  { key: 'gift', emoji: 'gift' },
  { key: 'keys', emoji: 'keys' },
  { key: 'other', emoji: 'sparkle' },
] as const;

export default function SendPage() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const loc = useMyLocation();
  const [from, setFrom] = useState<Place | null>(null);
  const [to, setTo] = useState<Place | null>(null);
  const [editing, setEditing] = useState<'from' | 'to' | null>('to');
  const [query, setQuery] = useState('');
  const [route, setRoute] = useState<Route | null>(null);
  const [quote, setQuote] = useState<any>(null);
  const [vehicle, setVehicle] = useState('BIKE');
  const [type, setType] = useState<(typeof TYPES)[number]['key']>('parcel');
  const [recipient, setRecipient] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [promo, setPromo] = useState<Promo>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [fitKey, setFitKey] = useState(0);
  const search = usePlaceSearch(editing ? query : '', from?.point ?? loc.point);

  useEffect(() => {
    if (loc.ready && !from) {
      setFrom({ point: loc.point, label: loc.address ?? t('home.current_location') });
      setFitKey((k) => k + 1);
    }
  }, [loc.ready]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!from || !to) {
      setQuote(null);
      setRoute(null);
      return;
    }
    let alive = true;
    (async () => {
      const r = await mapProvider.route(from.point, to.point).catch(() => null);
      if (!alive) return;
      setRoute(r);
      if (r?.path?.length) tripStore.save({ from: from.point, to: to.point, toName: to.label || '—', path: r.path, km: r.distanceKm, min: r.durationMin });
      setFitKey((k) => k + 1);
      const { data, error: err } = await sb().rpc('quote_trip', {
        p_service: 'DELIVERY',
        p_from_lat: from.point.lat,
        p_from_lng: from.point.lng,
        p_to_lat: to.point.lat,
        p_to_lng: to.point.lng,
        p_km: r?.distanceKm ?? null,
        p_min: r?.durationMin ?? null,
      });
      if (!alive) return;
      if (err || (data as any)?.error) setError(t(`error.${errorCode(err ?? { message: (data as any)?.error })}` as any));
      else {
        setError(null);
        setQuote(data);
      }
    })();
    return () => {
      alive = false;
    };
  }, [from, to]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => setPromo(null), [vehicle, quote?.km]);

  const selected = quote?.options?.find((o: any) => o.vehicle_type === vehicle) ?? quote?.options?.[0];
  const price = selected ? Math.max(Number(selected.amount) - (promo?.discount ?? 0), 0) : 0;

  const markers = useMemo<MapMarker[]>(() => {
    const m: MapMarker[] = [];
    if (from) m.push({ id: 'from', kind: 'pickup', ...from.point, draggable: true });
    if (to) m.push({ id: 'to', kind: 'dropoff', ...to.point, draggable: true });
    return m;
  }, [from, to]);

  function pick(p: Place) {
    if (editing === 'from') setFrom(p);
    else setTo(p);
    setEditing(null);
    setQuery('');
  }

  async function submit() {
    if (!from || !to || !selected) return setError(t('send.pick_points'));
    setBusy(true);
    setError(null);
    const { data, error: err } = await sb().rpc('create_delivery', {
      p_from_lat: from.point.lat,
      p_from_lng: from.point.lng,
      p_from_addr: from.label,
      p_to_lat: to.point.lat,
      p_to_lng: to.point.lng,
      p_to_addr: to.label,
      p_vehicle: selected.vehicle_type,
      p_km: route?.distanceKm ?? null,
      p_min: route?.durationMin ?? null,
      p_package: t(`send.type.${type}` as any),
      p_recipient: recipient,
      p_recipient_phone: recipientPhone,
      p_notes: notes,
      p_coupon: promo?.code ?? null,
    });
    if (err || !data) {
      setBusy(false);
      setError(t(`error.${errorCode(err)}` as any));
      return;
    }
    router.replace(`/delivery/${(data as any).id}`);
  }

  const pointRow = (which: 'from' | 'to') => {
    const p = which === 'from' ? from : to;
    const isEditing = editing === which;
    return (
      <div className="flex items-center gap-3 px-4 min-h-[52px]">
        <span
          className={
            which === 'from'
              ? 'w-3 h-3 rounded-full bg-accent ring-[3px] ring-ink shrink-0'
              : 'w-3 h-3 rounded-[3px] bg-ink ring-[3px] ring-accent shrink-0'
          }
        />
        <div className="flex-1 min-w-0 py-2">
          <p className="text-[11px] text-muted font-bold">{which === 'from' ? t('send.from') : t('send.to')}</p>
          {isEditing ? (
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('map.search_destination')}
              className="w-full bg-transparent outline-none text-sm font-bold"
            />
          ) : (
            <button onClick={() => (setEditing(which), setQuery(''))} className="w-full text-start text-sm font-bold truncate block">
              {p?.label || t('map.search_destination')}
            </button>
          )}
        </div>
        {isEditing && which === 'from' && (
          <button
            onClick={() => pick({ point: loc.point, label: loc.address ?? t('home.current_location') })}
            aria-label={t('send.use_current')}
            className="w-9 h-9 rounded-full bg-surface flex items-center justify-center"
          >
            <LocateFixed className="w-4 h-4" />
          </button>
        )}
        {isEditing && (p || which === 'from') && (
          <button onClick={() => setEditing(null)} aria-label={t('common.close')} className="w-9 h-9 flex items-center justify-center text-muted">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    );
  };

  return (
    <main className="min-h-screen bg-background pb-36">
      <div className="relative h-[34vh] min-h-[220px]">
        <KapMap
          className="absolute inset-0"
          markers={markers}
          route={route?.path}
          fitKey={fitKey}
          padding={[40, 40]}
          onDragEnd={(id, pt) => {
            const set = id === 'from' ? setFrom : setTo;
            set({ point: pt, label: '…' });
            mapProvider.reverse(pt).then((a) => set({ point: pt, label: a ?? '' })).catch(() => {});
          }}
        />
        <div className="absolute top-0 inset-x-0 z-[500] safe-top px-4 pt-2">
          <BackButton href="/home" />
        </div>
      </div>

      <div className="max-w-md mx-auto -mt-6 relative z-[600] bg-background rounded-t-sheet px-5 pt-6 flex flex-col gap-5">
        <h1 className="text-2xl font-bold">{t('send.title')}</h1>

        <div className="rounded-2xl border border-border divide-y divide-border">
          {pointRow('from')}
          {pointRow('to')}
        </div>

        {editing && <PlaceResults {...search} onPick={pick} />}

        {!editing && (
          <>
            <section>
              <h2 className="font-semibold mb-3">{t('send.what')}</h2>
              <div className="grid grid-cols-3 gap-2">
                {TYPES.map((x) => (
                  <button
                    key={x.key}
                    onClick={() => setType(x.key)}
                    aria-pressed={type === x.key}
                    className={`h-[92px] rounded-[20px] border-2 flex flex-col items-center justify-center gap-1.5 text-xs font-semibold transition-colors ${
                      type === x.key ? 'border-accent bg-accent/10' : 'border-border bg-surface'
                    }`}
                  >
                    <Glyph name={x.emoji} className="w-10 h-10" />
                    {t(`send.type.${x.key}` as any)}
                  </button>
                ))}
              </div>
            </section>

            <section className="flex flex-col gap-3">
              <Field label={t('send.recipient')}>
                <input value={recipient} onChange={(e) => setRecipient(e.target.value)} className={inputCls} autoComplete="off" />
              </Field>
              <Field label={t('send.recipient_phone')}>
                <input
                  value={recipientPhone}
                  onChange={(e) => setRecipientPhone(e.target.value)}
                  type="tel"
                  inputMode="tel"
                  dir="ltr"
                  placeholder="+964 770 000 0000"
                  className={inputCls}
                />
              </Field>
              <Field label={t('send.notes')}>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={t('send.notes_ph')}
                  rows={2}
                  className={`${inputCls} h-auto py-3 resize-none`}
                />
              </Field>
            </section>

            {quote && (
              <section>
                <h2 className="font-extrabold mb-3">{t('send.how')}</h2>
                <div className="grid grid-cols-2 gap-2" role="radiogroup">
                  {quote.options.map((o: any) => {
                    const on = selected?.vehicle_type === o.vehicle_type;
                    return (
                      <button
                        key={o.vehicle_type}
                        role="radio"
                        aria-checked={on}
                        onClick={() => setVehicle(o.vehicle_type)}
                        className={`rounded-[20px] border-2 p-3 text-start transition-colors ${on ? 'border-accent bg-accent/10' : 'border-border bg-surface'}`}
                      >
                        <Glyph name={o.vehicle_type === 'BIKE' ? 'scooter' : 'sedan'} className="w-12 h-12" />
                        <span className="block font-semibold mt-1">{t(`vehicle.${o.vehicle_type}` as any)}</span>
                        <span className="block text-[11px] text-muted leading-tight">{t(`vehicle.${o.vehicle_type}_sub` as any)}</span>
                        <span className="block font-bold mt-2">{money(o.amount, quote.currency, locale)}</span>
                      </button>
                    );
                  })}
                </div>
                <div className="mt-3">
                  <PromoField
                    service="DELIVERY"
                    amount={Number(selected?.amount ?? 0)}
                    fee={Number(selected?.amount ?? 0)}
                    currency={quote.currency}
                    value={promo}
                    onChange={setPromo}
                  />
                </div>
              </section>
            )}
          </>
        )}
        {error && (
          <p role="alert" className="text-danger text-sm font-medium">
            {error}
          </p>
        )}
      </div>

      {!editing && (
        <div className="fixed bottom-0 inset-x-0 z-[700] bg-background border-t border-border px-5 pt-3 safe-bottom">
          <div className="max-w-md mx-auto">
            <Button full loading={busy} disabled={!quote || !to} onClick={submit}>
              {quote && to ? t('send.confirm', { price: money(price, quote.currency, locale) }) : t('send.pick_points')}
            </Button>
          </div>
        </div>
      )}
    </main>
  );
}
