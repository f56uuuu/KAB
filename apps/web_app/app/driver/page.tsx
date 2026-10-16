'use client';

import { Glyph } from '@/components/Glyph';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Clock, Navigation, Phone, Power, ShieldAlert, Wallet } from 'lucide-react';
import { KapMap, type MapMarker } from '@/components/KapMap';
import { BackButton, Button, Field, inputCls, useToast, btn } from '@/components/ui';
import { KMark } from '@/components/Logo';
import { CityPicker } from '@/components/CityPicker';
import { useI18n } from '@/lib/i18n';
import { sb, useProfile } from '@/lib/hooks';
import { mapProvider, type LatLng } from '@/lib/maps';
import { errorCode, money } from '@/lib/format';
import { DriverDocs, DriverSteps, RequiredDocsPreview, stepsTxt } from '@/components/DriverDocs';
import { PhoneVerify, otpReady, sheetTxt } from '@/components/PhoneVerify';

const VEHICLES = [
  { v: 'ECONOMY', emoji: 'sedan' },
  { v: 'COMFORT', emoji: 'suv' },
  { v: 'XL', emoji: 'van' },
  { v: 'BIKE', emoji: 'scooter' },
  { v: 'BICYCLE', emoji: 'bicycle' },
];
const KIND_EMOJI: Record<string, string> = { ride: 'taxi', delivery: 'box', order: 'bag' };

export default function DriverPage() {
  const { t } = useI18n();
  const [me, setMe] = useState<any | undefined>(undefined);
  const [editing, setEditing] = useState(false);

  const refresh = useCallback(async () => {
    const { data } = await sb().rpc('my_driver');
    setMe(data ?? null);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // waiting for review: re-check every 10s so approval shows up without reloading
  useEffect(() => {
    if (me?.status !== 'PENDING') return;
    const iv = setInterval(refresh, 10000);
    return () => clearInterval(iv);
  }, [me?.status, refresh]);

  if (me === undefined) return <main className="min-h-screen flex items-center justify-center text-muted">{t('common.loading')}</main>;
  if (me === null || editing) return <Register existing={me} onDone={(d) => (setMe(d), setEditing(false))} />;
  if (me.status === 'APPROVED') return <Dashboard me={me} setMe={setMe} />;
  return <Status me={me} setMe={setMe} onEdit={() => setEditing(true)} />;
}

/* ------------------------------------------------------------------ registration */
function Register({ existing, onDone }: { existing: any; onDone: (d: any) => void }) {
  const { t, lang } = useI18n();
  const profile = useProfile();
  const [f, setF] = useState({
    name: existing?.display_name ?? '',
    phone: existing?.phone ?? '',
    city: existing?.city_id ?? '',
    type: existing?.vehicle_type ?? 'ECONOMY',
    make: existing?.manufacturer ?? '',
    model: existing?.model ?? '',
    color: existing?.color ?? '',
    plate: existing?.plate_number ?? '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sms, setSms] = useState(false);
  const [verified, setVerified] = useState<string | null>(null);
  useEffect(() => {
    otpReady().then(setSms);
  }, []);
  useEffect(() => {
    if (profile?.phone_verified_at) setVerified(profile.phone_number);
  }, [profile]);
  const needPhone = sms && !verified;

  useEffect(() => {
    if (profile && !f.phone) setF((x) => ({ ...x, phone: profile.phone_number ?? '', name: x.name || profile.first_name || '' }));
  }, [profile]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (needPhone) return setError(t('error.phone_not_verified'));
    if (!f.name.trim() || (!f.plate.trim() && f.type !== 'BICYCLE') || !f.city) return setError(t('error.missing_fields'));
    setBusy(true);
    setError(null);
    const { data, error: err } = await sb().rpc('driver_register', {
      p_name: f.name.trim(),
      p_phone: f.phone.trim(),
      p_vehicle_type: f.type,
      p_make: f.make.trim(),
      p_model: f.model.trim(),
      p_color: f.color.trim(),
      p_plate: f.plate.trim(),
      p_city_id: Number(f.city),
    });
    setBusy(false);
    if (err) return setError(t(`error.${errorCode(err)}` as any));
    onDone(data);
  }

  return (
    <main className="min-h-screen bg-background pb-10">
      <section className="bg-ink text-white px-6 pb-10 safe-top kap-slash thin">
        <div className="relative z-10 flex items-center justify-between pt-2">
          <BackButton href="/account" className="bg-white/10 shadow-none text-white" />
          <KMark size={40} />
        </div>
        <h1 className="relative z-10 text-3xl font-black mt-8 max-w-[16ch]">{t('driver.register_title')}</h1>
        <p className="relative z-10 text-neutralGray mt-2 max-w-sm">{t('driver.register_sub')}</p>
        <div className="relative z-10 mt-6 max-w-md">
          <DriverSteps step={1} dark />
        </div>
      </section>
      <form onSubmit={submit} className="max-w-md mx-auto -mt-5 relative bg-background rounded-t-sheet px-5 pt-6 flex flex-col gap-4">
        <Field label={t('driver.full_name')}>
          <input value={f.name} onChange={set('name')} className={inputCls} autoComplete="name" required />
        </Field>
        {sms ? (
          <div className="rounded-2xl border border-border p-4">
            <p className="text-sm font-bold mb-1">{t('driver.phone')}</p>
            {verified ? (
              <p className="font-bold flex items-center gap-2" dir="ltr">
                {verified}
                <span className="text-xs text-success">✓ {sheetTxt(lang).verified}</span>
              </p>
            ) : (
              <>
                <p className="text-xs text-muted mb-3">{sheetTxt(lang).sub}</p>
                <PhoneVerify
                  mode="link"
                  initialPhone={profile?.phone_number ?? undefined}
                  onDone={async () => {
                    const { data } = await sb().auth.getUser();
                    setVerified(data.user?.phone ? '+' + data.user.phone.replace(/^\+/, '') : f.phone);
                  }}
                />
              </>
            )}
          </div>
        ) : (
          <Field label={t('driver.phone')}>
            <input value={f.phone} onChange={set('phone')} className={inputCls} type="tel" dir="ltr" />
          </Field>
        )}
        <Field label={t('driver.city')}>
          <CityPicker variant="field" value={f.city ? Number(f.city) : null} onChange={(id) => setF((x) => ({ ...x, city: String(id) }))} />
        </Field>
        <div>
          <p className="text-sm font-bold mb-1.5">{t('driver.vehicle_type')}</p>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2" role="radiogroup">
            {VEHICLES.map(({ v, emoji }) => (
              <button
                type="button"
                key={v}
                role="radio"
                aria-checked={f.type === v}
                onClick={() => setF({ ...f, type: v })}
                className={`h-20 rounded-2xl border-2 flex flex-col items-center justify-center gap-1 text-[11px] font-bold ${
                  f.type === v ? 'border-accent bg-accent/10' : 'border-border bg-surface'
                }`}
              >
                <Glyph name={emoji} className="w-10 h-10" />
                {t(`vehicle.${v}` as any)}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('driver.make')}>
            <input value={f.make} onChange={set('make')} className={inputCls} placeholder="Toyota" />
          </Field>
          <Field label={t('driver.model')}>
            <input value={f.model} onChange={set('model')} className={inputCls} placeholder="Corolla" />
          </Field>
          <Field label={t('driver.color')}>
            <input value={f.color} onChange={set('color')} className={inputCls} />
          </Field>
          {f.type !== 'BICYCLE' && (
            <Field label={t('driver.plate')}>
              <input value={f.plate} onChange={set('plate')} className={inputCls} required dir="auto" />
            </Field>
          )}
        </div>
        {error && (
          <p role="alert" className="text-danger text-sm font-medium">
            {error}
          </p>
        )}
        <RequiredDocsPreview vehicle={f.type} />
        <Button type="submit" full loading={busy}>
          {busy ? t('driver.submitting') : existing ? t('driver.submit') : stepsTxt(lang).next}
        </Button>
      </form>
    </main>
  );
}

/* ------------------------------------------------------------------ pending / rejected / suspended */
function Status({ me, onEdit, setMe }: { me: any; onEdit: () => void; setMe: (d: any) => void }) {
  const { t, lang } = useI18n();
  const req: string[] = me.required_docs ?? [];
  const sentTypes = new Set((me.docs ?? []).filter((d: any) => !['rejected', 're_upload_required', 'expired'].includes(d.status)).map((d: any) => d.type));
  const needDocs = req.length > 0 && req.some((r) => !sentTypes.has(r)) && me.status !== 'BLOCKED';
  const title = needDocs
    ? stepsTxt(lang).upTitle
    : me.status === 'PENDING'
      ? t('driver.pending_title')
      : me.status === 'REJECTED'
        ? t('driver.rejected_title')
        : me.status === 'BLOCKED'
          ? t('driver.blocked_title')
          : t('driver.suspended_title');
  return (
    <main className="min-h-screen bg-background flex flex-col">
      <div className="safe-top px-4 pt-2">
        <BackButton href="/account" />
      </div>
      <div className="flex-1 max-w-md mx-auto w-full px-6 pb-10 pt-2 flex flex-col items-center justify-center text-center gap-4">
        <div className={`w-20 h-20 rounded-3xl items-center justify-center ${needDocs ? 'hidden' : 'flex'} ${me.status === 'PENDING' ? 'bg-accent' : 'bg-danger/15'}`}>
          {me.status === 'PENDING' ? <Clock className="w-10 h-10 text-ink" /> : <ShieldAlert className="w-10 h-10 text-danger" />}
        </div>
        <DriverSteps step={needDocs ? 2 : 3} />
        <h1 className="text-2xl font-black">{title}</h1>
        {needDocs ? <p className="text-muted">{stepsTxt(lang).upSub}</p> : me.status === 'PENDING' && <p className="text-muted">{t('driver.pending_sub')}</p>}
        {needDocs && (
          <div className="w-full text-start">
            <DriverDocs me={me} onChange={setMe} />
          </div>
        )}
        {me.admin_notes && me.status !== 'PENDING' && (
          <p className="rounded-2xl bg-surface p-4 text-sm">{t('driver.note', { note: me.admin_notes })}</p>
        )}
        <div className="w-full rounded-2xl border border-border p-4 text-start text-sm flex flex-col gap-1">
          <p className="font-extrabold">{me.display_name}</p>
          <p className="text-muted">
            {t(`vehicle.${me.vehicle_type}` as any)} — {[me.color, me.manufacturer, me.model].filter(Boolean).join(' ')}
          </p>
          <p className="font-bold" dir="auto">
            {me.plate_number}
          </p>
        </div>
        {!needDocs && (me.status === 'PENDING' || me.status === 'REJECTED' || me.status === 'SUSPENDED') && (me.required_docs?.length ?? 0) > 0 && (
          <div className="w-full text-start mt-2">
            <DriverDocs me={me} onChange={setMe} />
          </div>
        )}
        {(me.status === 'PENDING' || me.status === 'REJECTED') && (
          <Button variant="soft" size="md" onClick={onEdit}>
            {t('driver.edit')}
          </Button>
        )}
        <Link href="/home" className="text-sm font-bold text-muted">
          {t('driver.back_to_app')}
        </Link>
      </div>
    </main>
  );
}

/* ------------------------------------------------------------------ approved driver */
function Dashboard({ me, setMe }: { me: any; setMe: (d: any) => void }) {
  const { t, locale } = useI18n();
  const [pos, setPos] = useState<LatLng | null>(me.current_lat ? { lat: +me.current_lat, lng: +me.current_lng } : null);
  const [geoErr, setGeoErr] = useState(false);
  const [jobs, setJobs] = useState<any[]>([]);
  const [job, setJob] = useState<any>(null);
  const [earn, setEarn] = useState<any>(null);
  const [route, setRoute] = useState<[number, number][] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [fitKey, setFitKey] = useState(0);
  const { toast, toastNode } = useToast();
  const posRef = useRef(pos);
  posRef.current = pos;
  const online = !!me.is_online;

  // GPS
  useEffect(() => {
    if (!navigator.geolocation) return setGeoErr(true);
    const id = navigator.geolocation.watchPosition(
      (p) => {
        setGeoErr(false);
        setPos({ lat: p.coords.latitude, lng: p.coords.longitude });
      },
      () => setGeoErr(true),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, []);

  // share position while online
  useEffect(() => {
    if (!online) return;
    const send = () => posRef.current && sb().rpc('driver_ping', { p_lat: posRef.current.lat, p_lng: posRef.current.lng });
    send();
    const iv = setInterval(send, 8000);
    return () => clearInterval(iv);
  }, [online]);

  const loadJob = useCallback(async () => {
    const { data } = await sb().rpc('driver_current_job');
    setJob(data ?? null);
  }, []);
  const loadEarnings = useCallback(async () => {
    const { data } = await sb().rpc('driver_earnings');
    setEarn(data);
  }, []);

  useEffect(() => {
    loadJob();
    loadEarnings();
  }, [loadJob, loadEarnings]);

  // open requests while online and free
  useEffect(() => {
    if (!online || job) {
      setJobs([]);
      return;
    }
    const load = async () => {
      const { data } = await sb().rpc('driver_jobs');
      setJobs(Array.isArray(data) ? data : []);
    };
    load();
    const iv = setInterval(load, 5000);
    return () => clearInterval(iv);
  }, [online, job]);

  // route for the current job: to pickup first, then to drop-off
  const toPickup = job && ['ASSIGNED', 'ARRIVING', 'DRIVER_ASSIGNED'].includes(job.status);
  const target: LatLng | null = job
    ? toPickup
      ? { lat: +job.from_lat, lng: +job.from_lng }
      : { lat: +job.to_lat, lng: +job.to_lng }
    : null;
  useEffect(() => {
    if (!job) return setRoute(null);
    const from = toPickup && pos ? pos : { lat: +job.from_lat, lng: +job.from_lng };
    const to = toPickup ? { lat: +job.from_lat, lng: +job.from_lng } : { lat: +job.to_lat, lng: +job.to_lng };
    mapProvider
      .route(from, to)
      .then((r) => setRoute(r?.path ?? null))
      .catch(() => setRoute(null))
      .finally(() => setFitKey((k) => k + 1));
  }, [job?.id, job?.status]); // eslint-disable-line react-hooks/exhaustive-deps

  async function toggleOnline() {
    setBusy('online');
    const { data } = await sb().rpc('driver_set_online', { p_online: !online, p_lat: pos?.lat ?? null, p_lng: pos?.lng ?? null });
    setBusy(null);
    if (data) {
      setMe(data);
      if ((data as any).blocked) toast(t('error.documents_expired'));
    }
  }

  async function accept(j: any) {
    setBusy(`${j.kind}${j.id}`);
    const { data, error } = await sb().rpc('driver_accept', { p_kind: j.kind, p_id: j.id });
    setBusy(null);
    if (error) return toast(t(`error.${errorCode(error)}` as any));
    if (!data) {
      toast(t('driver.taken'));
      setJobs((xs) => xs.filter((x) => !(x.kind === j.kind && x.id === j.id)));
      return;
    }
    loadJob();
  }

  async function advance() {
    if (!job) return;
    setBusy('advance');
    const { data, error } = await sb().rpc('driver_advance', { p_kind: job.kind, p_id: job.id });
    setBusy(null);
    if (error) return toast(t(`error.${errorCode(error)}` as any));
    if (data === 'COMPLETED' || data === 'DELIVERED') {
      toast(t('driver.job_done'));
      setJob(null);
      loadEarnings();
    } else loadJob();
  }

  const markers = useMemo<MapMarker[]>(() => {
    const m: MapMarker[] = [];
    if (pos) m.push({ id: 'me', kind: me.vehicle_type === 'BIKE' || me.vehicle_type === 'BICYCLE' ? 'bike' : 'car', emoji: me.vehicle_type === 'BICYCLE' ? 'bicycle' : undefined, ...pos });
    if (job) {
      m.push({ id: 'from', kind: job.kind === 'order' ? 'store' : 'pickup', lat: +job.from_lat, lng: +job.from_lng, emoji: 'bag' });
      m.push({ id: 'to', kind: 'dropoff', lat: +job.to_lat, lng: +job.to_lng });
    } else {
      jobs.forEach((j) => m.push({ id: `${j.kind}${j.id}`, kind: 'job', lat: +j.from_lat, lng: +j.from_lng, emoji: KIND_EMOJI[j.kind] }));
    }
    return m;
  }, [pos, job, jobs, me.vehicle_type]);

  const cur = earn?.currency ?? job?.currency ?? 'IQD';

  const expiredDocs = (me.docs ?? []).some((d: any) => d.status === 'expired' || d.status === 're_upload_required');
  if (expiredDocs)
    return (
      <main className="min-h-screen bg-background">
        <div className="max-w-md mx-auto px-5 safe-top pt-3 pb-10 flex flex-col gap-4">
          <BackButton href="/account" />
          <p className="rounded-2xl bg-danger/10 text-danger p-4 text-sm font-bold">{t('error.documents_expired')}</p>
          <DriverDocs me={me} onChange={setMe} />
        </div>
      </main>
    );

  return (
    <main className="fixed inset-0 bg-background">
      <KapMap className="absolute inset-0" markers={markers} route={route} fitKey={`${fitKey}-${jobs.length}`} bottomInset={260} padding={[40, 140]} center={pos} />

      {/* top: brand + earnings + online switch */}
      <div className="absolute top-0 inset-x-0 z-[500] safe-top px-4 pt-2">
        <div className="max-w-md mx-auto flex items-center gap-2">
          <Link href="/account" className="w-11 h-11 rounded-full bg-raised shadow-float flex items-center justify-center" aria-label={t('nav.account')}>
            <KMark size={30} tile={false} />
          </Link>
          <div className="flex-1 h-11 rounded-full bg-raised shadow-float flex items-center gap-2 px-4 text-sm min-w-0">
            <Wallet className="w-4 h-4 shrink-0" />
            <span className="text-muted">{t('driver.today')}</span>
            <span className="font-black truncate">{money(earn?.today ?? 0, cur, locale)}</span>
            <span className="text-muted ms-auto shrink-0">{earn?.jobs_today ?? 0}×</span>
          </div>
        </div>
      </div>

      {/* bottom sheet */}
      <section className="absolute bottom-0 inset-x-0 z-[600] max-h-[66vh] overflow-y-auto bg-background rounded-t-sheet shadow-sheet">
        <div className="max-w-md mx-auto px-5 pt-5 safe-bottom flex flex-col gap-4">
          {geoErr && <p className="text-sm text-warning font-bold">{t('driver.location_needed')}</p>}

          {!job && (
            <>
              <div className="flex items-center gap-3">
                <span className={`w-3 h-3 rounded-full ${online ? 'bg-success animate-pulse' : 'bg-border'}`} />
                <div className="flex-1">
                  <p className="font-black text-xl">{online ? t('driver.online') : t('driver.offline')}</p>
                  <p className="text-sm text-muted">{online ? t('driver.waiting') : t('driver.offline_hint')}</p>
                </div>
              </div>
              <button
                onClick={toggleOnline}
                disabled={busy === 'online'}
                className={`h-16 rounded-2xl font-black text-lg flex items-center justify-center gap-2 disabled:opacity-60 ${
                  online ? 'bg-surface text-fg' : 'bg-accent text-ink'
                }`}
              >
                <Power className="w-5 h-5" />
                {online ? t('driver.go_offline') : t('driver.go_online')}
              </button>

              {online && jobs.length > 0 && (
                <div>
                  <h2 className="font-extrabold mb-2">{t('driver.requests')}</h2>
                  <ul className="flex flex-col gap-2">
                    {jobs.map((j) => (
                      <li key={`${j.kind}${j.id}`} className="rounded-2xl border border-border p-4 animate-slide-up">
                        <div className="flex items-start gap-3">
                          <Glyph name={KIND_EMOJI[j.kind]} className="w-9 h-9 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="font-extrabold">
                              {t(`kind.${j.kind}` as any)}
                              {j.kind === 'ride' && <span className="text-muted font-medium"> {t(`vehicle.${j.title}` as any)}</span>}
                            </p>
                            <p className="text-xs text-muted truncate">{j.from}</p>
                            <p className="text-xs text-muted truncate">{j.to}</p>
                            <p className="text-xs font-bold mt-1">
                              {t('driver.away', { n: Number(j.pickup_km).toLocaleString(locale) })}
                              {j.km ? <span className="text-muted font-medium"> / {t('driver.trip_km', { n: Number(j.km).toLocaleString(locale) })}</span> : null}
                            </p>
                          </div>
                          <span className="font-black">{money(j.fare, j.currency, locale)}</span>
                        </div>
                        <Button size="md" full className="mt-3" loading={busy === `${j.kind}${j.id}`} onClick={() => accept(j)}>
                          {t('driver.accept')}
                        </Button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="grid grid-cols-3 gap-2 text-center">
                <Stat label={t('driver.week')} value={money(earn?.week ?? 0, cur, locale)} />
                <Stat label={t('driver.trips_today')} value={String(earn?.jobs_today ?? 0)} />
                <Stat label={t('driver.balance')} value={money(earn?.balance?.[0]?.amount ?? 0, earn?.balance?.[0]?.currency ?? cur, locale)} />
              </div>
            </>
          )}

          {job && (
            <>
              <div>
                <p className="text-xs text-muted font-bold">
                  {t(`kind.${job.kind}` as any)} #{job.id}
                </p>
                <h2 className="text-2xl font-black leading-tight">{toPickup ? t('driver.go_to_pickup') : t('driver.go_to_dropoff')}</h2>
                <p className="text-sm text-muted mt-1">{toPickup ? job.from : job.to}</p>
              </div>

              {target && (
                <div className="grid grid-cols-2 gap-2">
                  <a
                    href={`https://waze.com/ul?ll=${target.lat},${target.lng}&navigate=yes`}
                    target="_blank"
                    rel="noreferrer"
                    className={`${btn({ size: 'md' })} !h-12 !bg-[#33CCFF] !shadow-none`}
                  >
                    <Navigation className="w-4 h-4" />
                    {t('driver.waze')}
                  </a>
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${target.lat},${target.lng}&travelmode=driving`}
                    target="_blank"
                    rel="noreferrer"
                    className={`${btn({ variant: 'soft', size: 'md' })} !h-12`}
                  >
                    <Navigation className="w-4 h-4" />
                    {t('driver.google')}
                  </a>
                </div>
              )}

              {job.items && (
                <div className="rounded-2xl bg-surface p-4 text-sm">
                  <p className="font-extrabold mb-1">{t('driver.items')}</p>
                  {job.items.map((i: any, n: number) => (
                    <p key={n} className="flex items-center gap-2 py-0.5">
                      <Glyph name={i.emoji} fallback="plate" className="w-6 h-6 shrink-0" />
                      {i.qty}× {String(i.name).split(' | ')[0]}
                    </p>
                  ))}
                  {job.notes && <p className="text-muted mt-2">“{job.notes}”</p>}
                </div>
              )}
              {job.kind === 'delivery' && (job.recipient || job.notes) && (
                <div className="rounded-2xl bg-surface p-4 text-sm">
                  {job.title && <p className="font-extrabold">{job.title}</p>}
                  {job.recipient && <p>{job.recipient}</p>}
                  {job.notes && <p className="text-muted mt-1">“{job.notes}”</p>}
                </div>
              )}

              <div className="flex gap-2">
                {job.customer_phone && (
                  <a href={`tel:${job.customer_phone}`} className={`${btn({ variant: 'outline', size: 'md' })} flex-1 !h-12`}>
                    <Phone className="w-4 h-4" />
                    {t('driver.call_customer')}
                  </a>
                )}
                {job.recipient_phone && (
                  <a href={`tel:${job.recipient_phone}`} className={`${btn({ variant: 'outline', size: 'md' })} flex-1 !h-12`}>
                    <Phone className="w-4 h-4" />
                    {t('driver.call_recipient')}
                  </a>
                )}
              </div>

              <div className="rounded-2xl bg-ink text-white px-4 py-3 flex items-center justify-between">
                <span className="text-sm text-neutralGray font-bold">{t('driver.collect_cash')}</span>
                <span className="text-xl font-black">{money(job.kind === 'order' ? job.total : job.fare, job.currency, locale)}</span>
              </div>

              <Button full loading={busy === 'advance'} onClick={advance}>
                {t(`driver.act.${job.kind}.${job.status}` as any)}
              </Button>
            </>
          )}
        </div>
      </section>
      {toastNode}
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-surface p-3">
      <p className="text-[11px] text-muted font-bold">{label}</p>
      <p className="font-black text-sm truncate">{value}</p>
    </div>
  );
}
