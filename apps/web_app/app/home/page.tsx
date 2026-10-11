'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Bell, ChevronDown, ChevronLeft, MapPin, Search } from 'lucide-react';
import { BottomNav } from '@/components/BottomNav';
import { KMark } from '@/components/Logo';
import { useI18n } from '@/lib/i18n';
import { sb, useFlags, useUnreadCount } from '@/lib/hooks';
import { useMyLocation } from '@/lib/location';
import { ACTIVE, jobHref, type JobKind } from '@/lib/jobs';
import { StoreMeta } from '@/components/StoreMeta';
import { Tour } from '@/components/Tour';
import { places as placeStore, type SavedPlace } from '@/lib/offline';

type ActiveJob = { kind: JobKind; id: number; status: string; title: string };

export default function HomePage() {
  const { t, pick } = useI18n();
  const flags = useFlags();
  const unread = useUnreadCount();
  const loc = useMyLocation();
  const [banners, setBanners] = useState<any[]>([]);
  const [coupons, setCoupons] = useState<any[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [currency, setCurrency] = useState('IQD');
  const [active, setActive] = useState<ActiveJob[]>([]);
  const [slide, setSlide] = useState(0);
  const [myPlaces, setMyPlaces] = useState<SavedPlace[]>([]);
  useEffect(() => setMyPlaces(placeStore.all().filter((p) => p.kind !== 'fav')), []);

  useEffect(() => {
    const s = sb();
    s.from('banners').select('*').eq('is_active', true).order('sort').then(({ data }) => setBanners(data ?? []));
    s.from('coupons').select('code,discount_type,discount_value,service_type').eq('is_active', true).then(({ data }) => setCoupons(data ?? []));
    (async () => {
      const {
        data: { user },
      } = await s.auth.getUser();
      if (!user) return;
      const [r, d, o] = await Promise.all([
        s.from('rides').select('id,status,dropoff_address').eq('customer_id', user.id).in('status', ACTIVE.ride).limit(1),
        s.from('deliveries').select('id,status,dropoff_location').eq('customer_id', user.id).in('status', ACTIVE.delivery).limit(1),
        s.from('orders').select('id,status,stores(name,name_ar)').eq('customer_id', user.id).in('status', ACTIVE.order).limit(2),
      ]);
      const list: ActiveJob[] = [];
      (r.data ?? []).forEach((x: any) => list.push({ kind: 'ride', id: x.id, status: x.status, title: x.dropoff_address }));
      (d.data ?? []).forEach((x: any) => list.push({ kind: 'delivery', id: x.id, status: x.status, title: x.dropoff_location }));
      (o.data ?? []).forEach((x: any) => list.push({ kind: 'order', id: x.id, status: x.status, title: x.stores ? pick(x.stores.name_ar, x.stores.name) : '' }));
      setActive(list);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!loc.ready) return;
    (async () => {
      const s = sb();
      const { data: city } = await s.rpc('nearest_city', { p_lat: loc.point.lat, p_lng: loc.point.lng }).maybeSingle();
      if (!city) return;
      const [{ data: st }, { data: co }] = await Promise.all([
        s.from('stores').select('*').eq('city_id', (city as any).id).eq('is_active', true).order('rating', { ascending: false }).limit(10),
        s.from('countries').select('currency_code').eq('id', (city as any).country_id).single(),
      ]);
      setStores(st ?? []);
      if (co) setCurrency((co as any).currency_code);
    })();
  }, [loc.ready, loc.point.lat, loc.point.lng]);

  // hero auto-advance
  useEffect(() => {
    if (banners.length < 2) return;
    const iv = setInterval(() => setSlide((n) => (n + 1) % banners.length), 5000);
    return () => clearInterval(iv);
  }, [banners.length]);

  // promo badges come from live coupons
  const badge = useMemo(() => {
    const best = (svc: string[]) =>
      coupons.filter((c) => svc.includes(c.service_type) && c.discount_type === 'PERCENT').reduce((m, c) => Math.max(m, Number(c.discount_value)), 0);
    const freeDel = coupons.some((c) => c.discount_type === 'FREE_DELIVERY');
    return {
      RIDE: best(['RIDE', 'ALL']) ? t('home.badge.off', { n: best(['RIDE', 'ALL']) }) : null,
      FOOD: freeDel ? t('home.badge.free_delivery') : best(['FOOD', 'ALL']) ? t('home.badge.off', { n: best(['FOOD', 'ALL']) }) : null,
      DELIVERY: best(['DELIVERY']) ? t('home.badge.off', { n: best(['DELIVERY']) }) : null,
      MARKET: freeDel ? t('home.badge.free_delivery') : null,
    } as Record<string, string | null>;
  }, [coupons, t]);

  const tiles = [
    { key: 'RIDE', href: '/ride/new', title: t('home.svc.ride'), emoji: '🚕' },
    { key: 'FOOD', href: '/food', title: t('home.svc.food'), emoji: '🍔' },
    { key: 'DELIVERY', href: '/send', title: t('home.svc.send'), emoji: '📦' },
    { key: 'MARKET', href: '/food?type=market', title: t('home.svc.market'), emoji: '🛒' },
    { key: 'OFFERS', href: '/offers', title: t('nav.offers'), emoji: '🎁' },
    { key: 'DRIVE', href: '/driver', title: t('home.svc.captain'), emoji: '🧑‍✈️' },
  ].filter((s) => !flags || flags[s.key] !== false);

  const hero = banners[slide];

  return (
    <main className="min-h-screen bg-background pb-28">
      <div className="max-w-md md:max-w-2xl lg:max-w-3xl mx-auto">
        {/* slim header */}
        <header className="px-4 safe-top pt-2 flex items-center gap-2">
          <KMark size={34} />
          <Link href="/ride/new" className="flex-1 min-w-0 h-10 rounded-full bg-surface flex items-center gap-1.5 px-3 text-sm font-bold">
            <MapPin className="w-4 h-4 shrink-0" />
            <span className="truncate">{loc.ready ? loc.address ?? t('home.current_location') : t('map.locating')}</span>
            <ChevronDown className="w-4 h-4 shrink-0 text-muted ms-auto" />
          </Link>
          <Link href="/notifications" aria-label={t('notif.title')} className="relative w-10 h-10 rounded-full bg-surface flex items-center justify-center">
            <Bell className="w-5 h-5" />
            {unread > 0 && (
              <span className="absolute -top-0.5 -end-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-danger text-white text-[10px] font-black flex items-center justify-center">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </Link>
        </header>

        {/* hero carousel */}
        <section className="px-4 mt-3">
          {hero ? (
            <Link
              href={hero.link || '/offers'}
              className="relative block h-[148px] rounded-3xl overflow-hidden shadow-float"
              style={{ background: hero.color || '#0D0D0F' }}
            >
              <span aria-hidden className="absolute -bottom-6 end-2 text-[110px] leading-none drop-shadow-xl select-none">
                {hero.emoji}
              </span>
              {isDark(hero.color) && <span aria-hidden className="absolute inset-y-0 end-[38%] w-3 bg-accent/90 skew-x-[-20deg] rtl:skew-x-[20deg]" />}
              <div className="relative z-10 p-5 flex flex-col items-start gap-1.5 max-w-[62%]">
                <span className={`px-2 py-0.5 rounded-md text-lg font-black leading-snug ${isDark(hero.color) ? 'bg-accent text-ink' : 'bg-ink text-white'}`}>
                  {pick(hero.title_ar, hero.title)}
                </span>
                {(hero.description || hero.description_ar) && (
                  <span className="px-2 py-0.5 rounded-md bg-white text-ink text-sm font-extrabold">{pick(hero.description_ar, hero.description)}</span>
                )}
              </div>
              {banners.length > 1 && (
                <span className="absolute bottom-3 start-5 z-10 flex gap-1.5">
                  {banners.map((b, i) => (
                    <span key={b.id} className={`h-1.5 rounded-full transition-all ${i === slide ? 'w-5 bg-accent' : 'w-1.5 bg-white/60'}`} />
                  ))}
                </span>
              )}
            </Link>
          ) : (
            <div className="h-[148px] rounded-3xl bg-surface animate-pulse" />
          )}
        </section>

        {/* where to */}
        {flags?.RIDE !== false && (
          <section className="px-4 mt-4">
            <Link href="/ride/new" data-tour="where" className="h-14 rounded-2xl bg-surface flex items-center gap-3 px-4 font-extrabold text-lg">
              <Search className="w-5 h-5 text-muted" />
              <span className="flex-1">{t('home.where_to')}</span>
              <span className="h-9 px-3 rounded-xl bg-ink text-accent text-sm font-black flex items-center">{t('home.now')}</span>
            </Link>
          </section>
        )}

        {/* service tiles */}
        <section data-tour="services" className="px-4 mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
          {tiles.map((s) => (
            <Link
              key={s.key}
              href={s.href}
              className="relative h-[136px] rounded-3xl bg-surface flex flex-col items-center justify-end gap-1.5 pb-4 active:scale-[.98] transition-transform"
            >
              {badge[s.key] && (
                <span className="absolute top-2 start-2 px-2 h-6 rounded-full bg-danger text-white text-[11px] font-black flex items-center whitespace-nowrap max-w-[calc(100%-16px)]">{badge[s.key]}</span>
              )}
              <span aria-hidden className="text-[52px] leading-none drop-shadow-[0_8px_10px_rgba(0,0,0,.18)]">
                {s.emoji}
              </span>
              <span className="font-extrabold">{s.title}</span>
            </Link>
          ))}
        </section>

        {/* personal offline map */}
        <section className="px-4 mt-3">
          <Link href="/map" data-tour="mymap" className="h-[76px] rounded-3xl bg-ink text-white flex items-center gap-4 px-5 active:scale-[.99] transition-transform">
            <span aria-hidden className="text-[38px] leading-none">🗺️</span>
            <span className="flex-1 min-w-0">
              <span className="block font-black text-lg">{t('home.mymap')}</span>
              <span className="block text-xs text-white/70 truncate">{t('home.mymap_sub')}</span>
            </span>
            <ChevronLeft className="w-5 h-5 text-accent ltr:rotate-180" />
          </Link>
          {myPlaces.length > 0 && (
            <div className="flex gap-2 mt-2">
              {(['home', 'work'] as const).map((k) => {
                const p = myPlaces.find((x) => x.kind === k);
                if (!p) return null;
                return (
                  <Link key={k} href={`/map?go=${k}`} className="flex-1 min-w-0 h-12 rounded-2xl bg-surface flex items-center gap-2 px-3 font-extrabold text-sm">
                    <span aria-hidden className="text-xl leading-none">{k === 'home' ? '🏠' : '💼'}</span>
                    <span className="truncate">{t(k === 'home' ? 'home.go_home' : 'home.go_work')}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        {/* active jobs */}
        {active.length > 0 && (
          <section className="px-4 mt-4 flex flex-col gap-2">
            {active.map((j) => (
              <Link key={`${j.kind}${j.id}`} href={jobHref(j.kind, j.id)} className="rounded-2xl bg-ink text-white p-4 flex items-center gap-3">
                <span className="relative flex h-3 w-3">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-accent animate-pulse_ring" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-accent" />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-neutralGray font-bold">{t('home.in_progress')}</p>
                  <p className="font-extrabold truncate">{t(`status.${j.kind}.${j.status}` as any)}</p>
                  {j.title && <p className="text-xs text-neutralGray truncate">{j.title}</p>}
                </div>
                <span className="w-10 h-10 rounded-full bg-accent text-ink flex items-center justify-center shrink-0" aria-label={t('home.track')}>
                  <ChevronLeft className="w-5 h-5 ltr:rotate-180" />
                </span>
              </Link>
            ))}
          </section>
        )}

        {/* captain promo */}
        <section className="px-4 mt-4">
          <Link href="/driver" data-tour="drive" className="relative block rounded-3xl bg-ink text-white p-5 overflow-hidden kap-slash thin">
            <div className="relative z-10 max-w-[70%]">
              <p className="text-sm text-neutralGray font-bold">{t('home.drive_title')}</p>
              <p className="text-2xl font-black leading-tight mt-1">{t('home.drive_big')}</p>
              <span className="inline-flex mt-3 h-9 px-4 rounded-xl bg-accent text-ink text-sm font-black items-center">{t('home.drive_cta')}</span>
            </div>
            <span aria-hidden className="absolute z-10 bottom-3 end-4 text-4xl flex flex-col items-center leading-tight">
              <span>🚘</span>
              <span>🛵🚲</span>
            </span>
          </Link>
        </section>

        {/* popular stores */}
        {flags?.FOOD !== false && stores.length > 0 && (
          <section className="mt-6">
            <div className="px-4 flex items-center justify-between mb-3">
              <h2 className="text-lg font-extrabold">{t('home.popular')}</h2>
              <Link href="/food" className="text-sm font-bold text-muted flex items-center">
                {t('home.see_all')}
                <ChevronLeft className="w-4 h-4 ltr:rotate-180" />
              </Link>
            </div>
            <div className="flex gap-3 overflow-x-auto no-scrollbar px-4">
              {stores.map((s) => (
                <Link key={s.id} href={`/store/${s.id}`} className="shrink-0 w-40">
                  <div className="h-28 rounded-2xl flex items-center justify-center text-5xl" style={{ background: `${s.color}33` }}>
                    {s.emoji}
                  </div>
                  <p className="font-extrabold mt-2 truncate">{pick(s.name_ar, s.name)}</p>
                  <StoreMeta store={s} currency={currency} />
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* more offers as big cards */}
        {flags?.OFFERS !== false && banners.length > 1 && (
          <section className="px-4 mt-6 flex flex-col gap-3">
            {banners.slice(1).map((b) => {
              const dark = isDark(b.color);
              return (
                <Link
                  key={b.id}
                  href={b.link || '/offers'}
                  className="relative h-36 rounded-3xl p-5 flex items-center overflow-hidden"
                  style={{ background: b.color, color: dark ? '#fff' : '#0D0D0F' }}
                >
                  <div className="relative z-10 max-w-[62%]">
                    <p className="text-xl font-black leading-tight">{pick(b.title_ar, b.title)}</p>
                    <p className={`mt-2 inline-block px-2 py-0.5 rounded-md text-sm font-black ${dark ? 'bg-accent text-ink' : 'bg-ink text-white'}`}>{pick(b.description_ar, b.description)}</p>
                  </div>
                  <span aria-hidden className="absolute end-3 bottom-0 text-[92px] leading-none drop-shadow-xl">
                    {b.emoji}
                  </span>
                </Link>
              );
            })}
          </section>
        )}
      </div>
      <BottomNav />
      <Tour />
    </main>
  );
}

function isDark(hex: string) {
  const h = (hex || '#FFD100').replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return 0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255) < 140;
}
