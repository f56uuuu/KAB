'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Bell, Briefcase, ChevronLeft, Home as HomeIcon, MapPin, Search } from 'lucide-react';
import { BottomNav } from '@/components/BottomNav';
import { KMark } from '@/components/Logo';
import { useI18n } from '@/lib/i18n';
import { sb, useFlags, useProfile, useUnreadCount } from '@/lib/hooks';
import { useMyLocation } from '@/lib/location';
import { ACTIVE, jobHref, type JobKind } from '@/lib/jobs';
import { StoreMeta } from '@/components/StoreMeta';

type ActiveJob = { kind: JobKind; id: number; status: string; title: string };

export default function HomePage() {
  const { t, pick, locale, dir } = useI18n();
  const flags = useFlags();
  const profile = useProfile();
  const unread = useUnreadCount();
  const loc = useMyLocation();
  const [banners, setBanners] = useState<any[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [currency, setCurrency] = useState('IQD');
  const [active, setActive] = useState<ActiveJob[]>([]);
  const [places, setPlaces] = useState<any[]>([]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? t('home.morning') : t('home.evening');
  const name = profile?.first_name;

  useEffect(() => {
    const s = sb();
    s.from('banners').select('*').eq('is_active', true).order('sort').then(({ data }) => setBanners(data ?? []));
    (async () => {
      const {
        data: { user },
      } = await s.auth.getUser();
      if (!user) return;
      const [r, d, o, a] = await Promise.all([
        s.from('rides').select('id,status,dropoff_address').eq('customer_id', user.id).in('status', ACTIVE.ride).limit(1),
        s.from('deliveries').select('id,status,dropoff_location').eq('customer_id', user.id).in('status', ACTIVE.delivery).limit(1),
        s.from('orders').select('id,status,stores(name,name_ar)').eq('customer_id', user.id).in('status', ACTIVE.order).limit(2),
        s.from('addresses').select('*').eq('profile_id', user.id),
      ]);
      const list: ActiveJob[] = [];
      (r.data ?? []).forEach((x: any) => list.push({ kind: 'ride', id: x.id, status: x.status, title: x.dropoff_address }));
      (d.data ?? []).forEach((x: any) => list.push({ kind: 'delivery', id: x.id, status: x.status, title: x.dropoff_location }));
      (o.data ?? []).forEach((x: any) =>
        list.push({ kind: 'order', id: x.id, status: x.status, title: x.stores ? pick(x.stores.name_ar, x.stores.name) : '' }),
      );
      setActive(list);
      setPlaces(a.data ?? []);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // stores in the nearest city
  useEffect(() => {
    if (!loc.ready) return;
    (async () => {
      const s = sb();
      const { data: city } = await s.rpc('nearest_city', { p_lat: loc.point.lat, p_lng: loc.point.lng }).maybeSingle();
      if (!city) return;
      const [{ data: st }, { data: co }] = await Promise.all([
        s.from('stores').select('*').eq('city_id', (city as any).id).order('rating', { ascending: false }).limit(10),
        s.from('countries').select('currency_code').eq('id', (city as any).country_id).single(),
      ]);
      setStores(st ?? []);
      if (co) setCurrency((co as any).currency_code);
    })();
  }, [loc.ready, loc.point.lat, loc.point.lng]);

  const services = useMemo(
    () =>
      [
        { key: 'RIDE', href: '/ride/new', title: t('home.svc.ride'), sub: t('home.svc.ride_sub'), emoji: '🚖' },
        { key: 'DELIVERY', href: '/send', title: t('home.svc.send'), sub: t('home.svc.send_sub'), emoji: '📦' },
        { key: 'FOOD', href: '/food', title: t('home.svc.food'), sub: t('home.svc.food_sub'), emoji: '🍔' },
        { key: 'MARKET', href: '/food?type=market', title: t('home.svc.market'), sub: t('home.svc.market_sub'), emoji: '🛒' },
      ].filter((s) => !flags || flags[s.key] !== false),
    [flags, t],
  );
  const [ride, ...rest] = services;
  const home = places.find((p) => p.address_type === 'home');
  const work = places.find((p) => p.address_type === 'work');

  return (
    <main className="min-h-screen bg-background pb-28">
      <div className="max-w-md mx-auto">
        {/* header */}
        <header className="px-5 safe-top pt-3 flex items-center gap-3">
          <KMark size={36} />
          <Link href="/ride/new" className="flex-1 min-w-0">
            <p className="text-[11px] text-muted font-bold">{t('home.current_location')}</p>
            <p className="text-sm font-bold truncate flex items-center gap-1">
              <MapPin className="w-4 h-4 shrink-0 text-fg" />
              <span className="truncate">{loc.ready ? loc.address ?? t('home.current_location') : t('map.locating')}</span>
            </p>
          </Link>
          <Link href="/notifications" aria-label={t('notif.title')} className="relative w-11 h-11 rounded-full bg-surface flex items-center justify-center">
            <Bell className="w-5 h-5" />
            {unread > 0 && (
              <span className="absolute top-1.5 end-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-danger text-white text-[10px] font-black flex items-center justify-center">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </Link>
        </header>

        <section className="px-5 mt-5">
          <h1 className="text-[28px] leading-tight font-black">
            {greeting}
            {name ? `${dir === 'rtl' ? '، ' : ', '}${name}` : ''}
          </h1>
        </section>

        {/* Where to — Waze-style search pill */}
        {flags?.RIDE !== false && (
          <section className="px-5 mt-4">
            <Link
              href="/ride/new"
              className="h-14 rounded-2xl bg-surface flex items-center gap-3 px-4 font-extrabold text-lg"
            >
              <Search className="w-5 h-5 text-muted" />
              <span className="flex-1">{t('home.where_to')}</span>
            </Link>
            <div className="flex gap-2 mt-3 overflow-x-auto no-scrollbar">
              {[
                { p: home, label: t('home.saved_home'), Icon: HomeIcon },
                { p: work, label: t('home.saved_work'), Icon: Briefcase },
              ].map(({ p, label, Icon }) => (
                <Link
                  key={label}
                  href={p ? `/ride/new?to=${p.latitude},${p.longitude}&label=${encodeURIComponent(p.street_address ?? label)}` : '/account#places'}
                  className="h-10 px-4 rounded-full border border-border flex items-center gap-2 text-sm font-bold shrink-0"
                >
                  <Icon className="w-4 h-4" />
                  {label}
                  {!p && <span className="text-muted font-medium">+</span>}
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* active jobs */}
        {active.length > 0 && (
          <section className="px-5 mt-5 flex flex-col gap-2">
            {active.map((j) => (
              <Link
                key={`${j.kind}${j.id}`}
                href={jobHref(j.kind, j.id)}
                className="rounded-2xl bg-ink text-white p-4 flex items-center gap-3 kap-slash"
              >
                <span className="relative z-10 flex h-3 w-3">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-accent animate-pulse_ring" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-accent" />
                </span>
                <div className="relative z-10 flex-1 min-w-0">
                  <p className="text-xs text-neutralGray font-bold">{t('home.in_progress')}</p>
                  <p className="font-extrabold truncate">{t(`status.${j.kind}.${j.status}` as any)}</p>
                  {j.title && <p className="text-xs text-neutralGray truncate">{j.title}</p>}
                </div>
                <span className="relative z-10 w-10 h-10 rounded-full bg-ink text-accent flex items-center justify-center shrink-0" aria-label={t('home.track')}>
                  <ChevronLeft className="w-5 h-5 ltr:rotate-180" />
                </span>
              </Link>
            ))}
          </section>
        )}

        {/* services */}
        <section className="px-5 mt-6 grid grid-cols-3 gap-3">
          {ride && (
            <Link
              href={ride.href}
              className="col-span-3 h-32 rounded-3xl bg-ink text-white p-5 flex flex-col justify-end kap-slash"
            >
              <span className="absolute z-10 top-4 start-5 text-4xl" aria-hidden>
                {ride.emoji}
              </span>
              <span className="relative z-10 text-2xl font-black">{ride.title}</span>
              <span className="relative z-10 text-sm text-neutralGray">{ride.sub}</span>
            </Link>
          )}
          {rest.map((s) => (
            <Link key={s.key} href={s.href} className="rounded-3xl bg-surface p-4 aspect-square flex flex-col justify-between">
              <span className="text-3xl" aria-hidden>
                {s.emoji}
              </span>
              <span>
                <span className="block font-extrabold leading-tight">{s.title}</span>
                <span className="block text-[11px] text-muted leading-tight mt-0.5">{s.sub}</span>
              </span>
            </Link>
          ))}
        </section>

        {/* banners */}
        {flags?.OFFERS !== false && banners.length > 0 && (
          <section className="mt-7">
            <div className="flex gap-3 overflow-x-auto no-scrollbar px-5 snap-x snap-mandatory">
              {banners.map((b) => {
                const darkBg = isDark(b.color);
                return (
                  <Link
                    key={b.id}
                    href={b.link || '/offers'}
                    className="snap-start shrink-0 w-[82%] h-36 rounded-3xl p-5 flex items-center gap-4 overflow-hidden"
                    style={{ background: b.color, color: darkBg ? '#fff' : '#0D0D0F' }}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xl font-black leading-tight">{pick(b.title_ar, b.title)}</p>
                      <p className="text-sm mt-1 opacity-80">{pick(b.description_ar, b.description)}</p>
                    </div>
                    <span className="text-6xl" aria-hidden>
                      {b.emoji}
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* popular stores */}
        {flags?.FOOD !== false && stores.length > 0 && (
          <section className="mt-7">
            <div className="px-5 flex items-center justify-between mb-3">
              <h2 className="text-lg font-extrabold">{t('home.popular')}</h2>
              <Link href="/food" className="text-sm font-bold text-muted flex items-center">
                {t('home.see_all')}
                <ChevronLeft className="w-4 h-4 ltr:rotate-180" />
              </Link>
            </div>
            <div className="flex gap-3 overflow-x-auto no-scrollbar px-5">
              {stores.map((s) => (
                <Link key={s.id} href={`/store/${s.id}`} className="shrink-0 w-40">
                  <div className="h-28 rounded-2xl flex items-center justify-center text-5xl" style={{ background: `${s.color}22` }}>
                    {s.emoji}
                  </div>
                  <p className="font-extrabold mt-2 truncate">{pick(s.name_ar, s.name)}</p>
                  <StoreMeta store={s} currency={currency} />
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* drive with KAP */}
        <section className="px-5 mt-8">
          <Link href="/driver" className="rounded-3xl border border-border p-5 flex items-center gap-4">
            <span className="text-4xl" aria-hidden>
              🚗
            </span>
            <div className="flex-1">
              <p className="font-extrabold">{t('home.drive_title')}</p>
              <p className="text-sm text-muted">{t('home.drive_sub')}</p>
            </div>
            <ChevronLeft className="w-5 h-5 text-muted ltr:rotate-180" />
          </Link>
        </section>
      </div>
      <BottomNav />
    </main>
  );
}

function isDark(hex: string) {
  const h = (hex || '#FFD100').replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  const r = (n >> 16) & 255,
    g = (n >> 8) & 255,
    b = n & 255;
  return 0.299 * r + 0.587 * g + 0.114 * b < 140;
}
