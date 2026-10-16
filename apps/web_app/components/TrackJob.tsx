'use client';

import { Glyph } from '@/components/Glyph';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, Phone, Share2, ShieldCheck, Star, XCircle } from 'lucide-react';
import { KapMap, type MapMarker } from '@/components/KapMap';
import { isOn } from '@/lib/features';
import { BackButton, Button, Stars, useToast, btn } from '@/components/ui';
import { useI18n } from '@/lib/i18n';
import { sb, useFlags } from '@/lib/hooks';
import { mapProvider, type LatLng } from '@/lib/maps';
import { CANCELLABLE, DONE, STEPS, TABLE, isActive, stepIndex, type JobKind } from '@/lib/jobs';
import { kmBetween, money } from '@/lib/format';

type View = {
  status: string;
  from: LatLng;
  to: LatLng;
  fromLabel: string;
  toLabel: string;
  amount: number;
  currency: string;
  driverId: number | null;
  otp?: string | null;
  items?: { name: string; qty: number; price: number; emoji?: string }[];
  storeEmoji?: string;
  title?: string;
  subtotal?: number;
  fee?: number;
  discount?: number;
  rated?: boolean;
};

function normalize(kind: JobKind, r: any, pick: (a: any, b: any) => string): View {
  if (kind === 'ride')
    return {
      status: r.status,
      from: { lat: +r.pickup_latitude, lng: +r.pickup_longitude },
      to: { lat: +r.dropoff_latitude, lng: +r.dropoff_longitude },
      fromLabel: r.pickup_address,
      toLabel: r.dropoff_address,
      amount: +(r.final_fare ?? r.estimated_fare),
      currency: r.currency_code,
      driverId: r.driver_id,
      discount: +r.discount || 0,
      rated: !!r.rating,
    };
  if (kind === 'delivery')
    return {
      status: r.status,
      from: { lat: +r.pickup_latitude, lng: +r.pickup_longitude },
      to: { lat: +r.dropoff_latitude, lng: +r.dropoff_longitude },
      fromLabel: r.pickup_location,
      toLabel: r.dropoff_location,
      amount: +(r.final_fare ?? r.estimated_fare),
      currency: r.currency_code,
      driverId: r.driver_id,
      otp: r.otp_code,
      title: r.package_description,
      discount: +r.discount || 0,
    };
  const s = r.stores ?? {};
  return {
    status: r.status,
    from: { lat: +s.latitude, lng: +s.longitude },
    to: { lat: +r.delivery_lat, lng: +r.delivery_lng },
    fromLabel: pick(s.name_ar, s.name),
    toLabel: r.delivery_address,
    amount: +r.total_amount,
    currency: r.currency_code,
    driverId: r.driver_id,
    storeEmoji: s.emoji,
    title: pick(s.name_ar, s.name),
    subtotal: +r.subtotal,
    fee: +r.delivery_fee,
    discount: +r.discount || 0,
    items: (r.order_items ?? []).map((i: any) => ({
      name: String(i.product_name ?? '').split(' | ')[pick('ar', 'en') === 'ar' ? 0 : 1] ?? i.product_name,
      qty: i.quantity,
      price: +i.price,
      emoji: i.emoji,
    })),
  };
}

export function TrackJob({ kind, id }: { kind: JobKind; id: string }) {
  const { t, locale, pick } = useI18n();
  const [row, setRow] = useState<any>(null);
  const [notFound, setNotFound] = useState(false);
  const [driver, setDriver] = useState<any>(null);
  const [path, setPath] = useState<[number, number][] | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [stars, setStars] = useState(0);
  const ratingsOn = isOn(useFlags(), 'RATINGS');
  const [review, setReview] = useState('');
  const [rated, setRated] = useState(false);
  const [busy, setBusy] = useState(false);
  const [fitKey, setFitKey] = useState(0);
  const { toast, toastNode } = useToast();
  const demoOff = useRef(false);

  const select = kind === 'order' ? '*, stores(*), order_items(*)' : '*';
  const view = useMemo(() => (row ? normalize(kind, row, pick) : null), [row, kind, pick]);
  const active = view ? isActive(kind, view.status) : false;

  async function load() {
    const { data } = await sb().from(TABLE[kind]).select(select).eq('id', id).maybeSingle();
    if (!data) setNotFound(true);
    else setRow(data);
  }

  useEffect(() => {
    load();
    const ch = sb()
      .channel(`track-${kind}-${id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: TABLE[kind], filter: `id=eq.${id}` }, () => load())
      .subscribe();
    return () => {
      sb().removeChannel(ch);
    };
  }, [kind, id]); // eslint-disable-line react-hooks/exhaustive-deps

  // route line between the two job points (once)
  useEffect(() => {
    if (!view || path) return;
    mapProvider
      .route(view.from, view.to)
      .then((r) => {
        setPath(r?.path ?? null);
        setFitKey((k) => k + 1);
      })
      .catch(() => setFitKey((k) => k + 1));
  }, [view?.from.lat, view?.to.lat]); // eslint-disable-line react-hooks/exhaustive-deps

  // live loop: driver position + demo simulation step + status refresh fallback
  useEffect(() => {
    if (!view || !active) return;
    let alive = true;
    const tick = async () => {
      if (!demoOff.current) {
        const { data } = await sb().rpc('demo_tick', { p_kind: kind, p_id: Number(id) });
        if (data === 'off' || data === 'no_demo_driver') demoOff.current = true;
      }
      if (!alive) return;
      await load();
      if (row?.driver_id || view.driverId) {
        const { data } = await sb().rpc('get_driver_public_profile', { target_driver_id: view.driverId ?? row?.driver_id });
        if (alive && Array.isArray(data) && data[0]) setDriver(data[0]);
      }
    };
    tick();
    const iv = setInterval(tick, 4000);
    return () => {
      alive = false;
      clearInterval(iv);
    };
  }, [active, view?.driverId]); // eslint-disable-line react-hooks/exhaustive-deps

  // driver card once (e.g. finished jobs)
  useEffect(() => {
    if (!view?.driverId || driver) return;
    sb()
      .rpc('get_driver_public_profile', { target_driver_id: view.driverId })
      .then(({ data }) => Array.isArray(data) && data[0] && setDriver(data[0]));
  }, [view?.driverId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (notFound)
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-4 p-8 text-center">
        <p className="font-bold">{t('error.generic')}</p>
        <Link href="/home" className="font-bold underline">
          {t('track.back_home')}
        </Link>
      </main>
    );
  if (!view)
    return <main className="min-h-screen flex items-center justify-center text-muted">{t('common.loading')}</main>;

  const idx = stepIndex(kind, view.status);
  const steps = STEPS[kind];
  const cancelled = view.status === 'CANCELLED';
  const finished = view.status === DONE[kind];
  const driverPos = driver?.current_lat ? { lat: +driver.current_lat, lng: +driver.current_lng } : null;
  const headingToPickup =
    (kind === 'ride' && ['ASSIGNED', 'ARRIVING'].includes(view.status)) ||
    (kind === 'delivery' && view.status === 'ASSIGNED') ||
    (kind === 'order' && view.status === 'DRIVER_ASSIGNED');
  const target = headingToPickup ? view.from : view.to;
  const etaMin = driverPos && active ? Math.max(1, Math.round((kmBetween(driverPos, target) / 25) * 60)) : null;

  const markers: MapMarker[] = [
    kind === 'order'
      ? { id: 'from', kind: 'store', ...view.from, emoji: view.storeEmoji }
      : { id: 'from', kind: 'pickup', ...view.from },
    { id: 'to', kind: 'dropoff', ...view.to },
  ];
  if (driverPos && active && view.driverId) markers.push({ id: 'driver', kind: 'car', ...driverPos });

  async function cancel() {
    setBusy(true);
    await sb().rpc('cancel_job', { p_kind: kind, p_id: Number(id) });
    setBusy(false);
    setConfirmCancel(false);
    load();
  }

  async function rate() {
    if (!stars) return;
    setBusy(true);
    await sb().rpc('rate_job', { p_kind: kind, p_id: Number(id), p_stars: stars, p_review: review || null });
    setBusy(false);
    setRated(true);
  }

  async function share() {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: 'KAP', text: t('track.share_text'), url });
      else {
        await navigator.clipboard.writeText(url);
        toast(t('common.copied'));
      }
    } catch {
      /* dismissed */
    }
  }

  const statusText = t(`status.${kind}.${view.status}` as any);

  return (
    <main className="fixed inset-0 bg-background">
      <KapMap
        className="absolute inset-0 bottom-[38vh]"
        markers={markers}
        route={path}
        fitKey={fitKey}
        padding={[50, 90]}
        interactive
      />
      <div className="absolute top-0 inset-x-0 z-[500] safe-top px-4 pt-2 flex items-center justify-between">
        <BackButton href="/home" />
        {kind === 'ride' && active && (
          <button onClick={share} className="h-11 px-4 rounded-full bg-raised shadow-float flex items-center gap-2 text-sm font-bold">
            <Share2 className="w-4 h-4" />
            {t('track.share')}
          </button>
        )}
      </div>

      <section className="absolute bottom-0 inset-x-0 z-[600] max-h-[70vh] overflow-y-auto bg-background rounded-t-sheet shadow-sheet">
        <div className="max-w-md mx-auto px-5 pt-5 safe-bottom flex flex-col gap-4">
          {/* status */}
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <p className="text-xs text-muted font-bold">
                {t(`kind.${kind}` as any)} #{id}
              </p>
              <h1 className="text-2xl font-black leading-tight mt-0.5">{statusText}</h1>
              {etaMin && view.driverId && <p className="text-sm text-muted mt-1">{t('track.eta', { n: etaMin })}</p>}
            </div>
            {finished && <CheckCircle2 className="w-9 h-9 text-success" />}
            {cancelled && <XCircle className="w-9 h-9 text-danger" />}
          </div>

          {!cancelled && (
            <div className="flex gap-1.5" aria-hidden>
              {steps.map((s, i) => (
                <span
                  key={s}
                  className={`h-1.5 flex-1 rounded-full ${i < idx ? 'bg-fg' : i === idx ? (finished ? 'bg-fg' : 'bg-accent') : 'bg-border'}`}
                />
              ))}
            </div>
          )}

          {/* driver */}
          {driver && view.driverId && !cancelled && (
            <div className="rounded-2xl bg-surface p-4 flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-ink text-accent font-black text-lg flex items-center justify-center shrink-0">
                {String(driver.full_name ?? 'K').trim().charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] text-muted font-bold">{kind === 'ride' ? t('track.your_driver') : t('track.your_courier')}</p>
                <p className="font-extrabold truncate">{driver.full_name}</p>
                <p className="text-xs text-muted truncate">
                  {[driver.color, driver.make, driver.model].filter(Boolean).join(' ')}
                </p>
              </div>
              <div className="text-end shrink-0">
                {driver.plate_number && (
                  <p className="text-xs font-black bg-background border border-border rounded-md px-2 py-1 mb-1" dir="auto">
                    {driver.plate_number}
                  </p>
                )}
                <p className="text-xs font-bold flex items-center justify-end gap-1">
                  <Star className="w-3.5 h-3.5 fill-accent text-accent" />
                  {Number(driver.rating ?? 5).toLocaleString(locale)}
                </p>
              </div>
              {driver.phone && active && (
                <a href={`tel:${driver.phone}`} aria-label={t('track.call_driver')} className="w-11 h-11 rounded-full bg-success text-white flex items-center justify-center shrink-0">
                  <Phone className="w-5 h-5" />
                </a>
              )}
            </div>
          )}

          {/* delivery code */}
          {kind === 'delivery' && view.otp && active && (
            <div className="rounded-2xl border-2 border-dashed border-border p-4 flex items-center gap-4">
              <div className="flex-1">
                <p className="font-extrabold">{t('track.otp')}</p>
                <p className="text-xs text-muted">{t('track.otp_hint')}</p>
              </div>
              <p className="text-3xl font-black tracking-[0.2em]" dir="ltr">
                {view.otp}
              </p>
            </div>
          )}

          {/* route summary */}
          <div className="flex flex-col gap-3">
            <div className="flex gap-3 items-start">
              <span className="mt-1.5 w-3 h-3 rounded-full bg-accent ring-[3px] ring-ink shrink-0" />
              <div className="min-w-0">
                <p className="text-[11px] text-muted font-bold">{t('track.from')}</p>
                <p className="text-sm font-bold leading-snug">{view.fromLabel}</p>
              </div>
            </div>
            <div className="flex gap-3 items-start">
              <span className="mt-1.5 w-3 h-3 rounded-[3px] bg-ink ring-[3px] ring-accent shrink-0" />
              <div className="min-w-0">
                <p className="text-[11px] text-muted font-bold">{t('track.to')}</p>
                <p className="text-sm font-bold leading-snug">{view.toLabel}</p>
              </div>
            </div>
          </div>

          {/* order items */}
          {view.items && view.items.length > 0 && (
            <div className="rounded-2xl bg-surface p-4">
              <p className="font-semibold mb-2">{t('order.items')}</p>
              <ul className="flex flex-col gap-1.5 text-sm">
                {view.items.map((i, n) => (
                  <li key={n} className="flex items-center gap-2.5">
                    <Glyph name={i.emoji} fallback="plate" className="w-7 h-7 shrink-0" />
                    <span className="flex-1">
                      {i.qty}× {i.name}
                    </span>
                    <span className="text-muted">{money(i.price * i.qty, view.currency, locale)}</span>
                  </li>
                ))}
              </ul>
              <div className="border-t border-border mt-3 pt-3 text-sm flex flex-col gap-1">
                <Row label={t('cart.subtotal')} value={money(view.subtotal, view.currency, locale)} />
                <Row label={t('cart.delivery')} value={money(view.fee, view.currency, locale)} />
                {!!view.discount && <Row label={t('cart.discount')} value={`−${money(view.discount, view.currency, locale)}`} />}
              </div>
            </div>
          )}

          {/* fare */}
          <div className="flex items-center justify-between rounded-2xl bg-ink text-white px-4 py-3">
            <span className="text-sm text-neutralGray font-bold">{t('track.cash_total')}</span>
            <span className="text-xl font-black">{money(view.amount, view.currency, locale)}</span>
          </div>

          {kind === 'ride' && active && (
            <p className="text-xs text-muted flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              {t('track.safety')}
            </p>
          )}

          {/* rating */}
          {finished && ratingsOn && view.driverId && !rated && !view.rated && (
            <div className="rounded-2xl border border-border p-4 flex flex-col gap-3">
              <p className="font-extrabold text-center">{t('track.rate_title')}</p>
              <Stars value={stars} onChange={setStars} />
              {stars > 0 && (
                <>
                  <textarea
                    value={review}
                    onChange={(e) => setReview(e.target.value)}
                    placeholder={t('track.rate_ph')}
                    rows={2}
                    className="rounded-xl border border-border bg-background p-3 text-sm outline-none focus:border-fg resize-none"
                  />
                  <Button size="md" onClick={rate} loading={busy}>
                    {t('track.rate_submit')}
                  </Button>
                </>
              )}
            </div>
          )}
          {rated && <p className="text-center font-bold text-success">{t('track.rated')}</p>}

          {/* actions */}
          {active && CANCELLABLE[kind].includes(view.status) && !confirmCancel && (
            <Button variant="danger" size="md" onClick={() => setConfirmCancel(true)}>
              {t(kind === 'ride' ? 'track.cancel_ride' : kind === 'delivery' ? 'track.cancel_delivery' : 'track.cancel_order')}
            </Button>
          )}
          {confirmCancel && (
            <div className="rounded-2xl bg-danger/10 p-4 flex flex-col gap-3">
              <p className="font-bold">{t('track.cancel_confirm')}</p>
              <div className="flex gap-2">
                <Button size="md" variant="soft" className="flex-1" onClick={() => setConfirmCancel(false)}>
                  {t('track.keep')}
                </Button>
                <button
                  onClick={cancel}
                  disabled={busy}
                  className={`${btn({ variant: 'dangerSolid', size: 'md' })} flex-1`}
                >
                  {t('common.confirm')}
                </button>
              </div>
            </div>
          )}
          {!active && (
            <Link href="/home" className={`${btn({ variant: 'soft', full: true })} mb-2`}>
              {t('track.back_home')}
            </Link>
          )}
        </div>
      </section>
      {toastNode}
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted">{label}</span>
      <span className="font-bold">{value}</span>
    </div>
  );
}
