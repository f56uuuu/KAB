'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Bell, Briefcase, ChevronDown, ChevronLeft, Gift, House, MapPin, Package, Search, ShoppingBag, UtensilsCrossed } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { BottomNav } from '@/components/BottomNav';
import { KMark } from '@/components/Logo';
import { useI18n } from '@/lib/i18n';
import { currentUser, sb, useFlags, useStickyState, useUnreadCount } from '@/lib/hooks';
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
  const [banners, setBanners] = useStickyState<any[]>('home.banners', []);
  const [coupons, setCoupons] = useStickyState<any[]>('home.coupons', []);
  const [stores, setStores] = useStickyState<any[]>('home.stores', []);
  const [currency, setCurrency] = useStickyState('home.currency', 'IQD');
  const [active, setActive] = useStickyState<ActiveJob[]>('home.active', []);
  const [copied, setCopied] = useState<string | null>(null);
  const [hour, setHour] = useState(12);
  useEffect(() => setHour(new Date().getHours()), []);
  const [myPlaces, setMyPlaces] = useState<SavedPlace[]>([]);
  useEffect(() => setMyPlaces(placeStore.all().filter((p) => p.kind !== 'fav')), []);

  useEffect(() => {
    const s = sb();
    s.from('banners').select('*').eq('is_active', true).order('sort').then(({ data }) => setBanners(data ?? []));
    s.from('coupons').select('code,discount_type,discount_value,service_type').eq('is_active', true).then(({ data }) => setCoupons(data ?? []));
    (async () => {
      const user = await currentUser();
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

  const small: { key: string; href: string; title: string; Icon: LucideIcon }[] = [
    { key: 'FOOD', href: '/food', title: t('home.svc.food'), Icon: UtensilsCrossed },
    { key: 'DELIVERY', href: '/send', title: t('home.svc.send'), Icon: Package },
    { key: 'MARKET', href: '/food?type=market', title: t('home.svc.market'), Icon: ShoppingBag },
    { key: 'OFFERS', href: '/offers', title: t('nav.offers'), Icon: Gift },
  ].filter((s) => !flags || flags[s.key] !== false);
  const rideOn = !flags || flags.RIDE !== false;

  const tickets = coupons.slice(0, 2).map((c) => ({
    code: c.code as string,
    big:
      c.discount_type === 'FREE_DELIVERY'
        ? t('home.badge.free_delivery')
        : c.discount_type === 'PERCENT'
          ? t('home.badge.off', { n: Number(c.discount_value) })
          : t('offers.title'),
    sub: t(`offers.service.${c.service_type || 'ALL'}` as any),
  }));

  function copy(code: string) {
    navigator.clipboard?.writeText(code).catch(() => {});
    setCopied(code);
    setTimeout(() => setCopied((x) => (x === code ? null : x)), 1600);
  }

  const greet = hour >= 4 && hour < 12 ? t('home.morning') : t('home.evening');

  return (
    <main className="min-h-screen bg-background pb-28">
      <div className="max-w-md md:max-w-2xl lg:max-w-3xl mx-auto">
        {/* greeting + location + notifications */}
        <header className="px-5 safe-top pt-3 flex items-center gap-3">
          <KMark size={46} className="rounded-full" />
          <div className="flex-1 min-w-0">
            <p className="text-[13px] text-muted">{greet}</p>
            <Link href="/ride/new" className="flex items-center gap-1 text-[15px] font-semibold min-h-[28px]">
              <MapPin className="w-4 h-4 shrink-0" />
              <span className="truncate">{loc.ready ? loc.address ?? t('home.current_location') : t('map.locating')}</span>
              <ChevronDown className="w-4 h-4 shrink-0 text-muted" />
            </Link>
          </div>
          <Link
            href="/notifications"
            aria-label={t('notif.title')}
            className="relative w-[46px] h-[46px] rounded-full border-[1.5px] border-border flex items-center justify-center shrink-0"
          >
            <Bell className="w-5 h-5" />
            {unread > 0 && (
              <span className="absolute -top-0.5 -end-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-danger text-white text-[10px] font-bold flex items-center justify-center">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </Link>
        </header>

        {/* where to */}
        {rideOn && (
          <section className="px-5 mt-6">
            <div className="rounded-[30px] bg-ink dark:bg-raised text-white p-5 flex flex-col gap-3.5">
              <h1 className="text-[22px] font-semibold leading-snug">{t('home.where_long')}</h1>
              <Link href="/ride/new" data-tour="where" className="h-14 rounded-[18px] bg-white/10 text-white/60 flex items-center gap-3 px-4 text-[15px]">
                <span className="w-[30px] h-[30px] rounded-full bg-accent flex items-center justify-center shrink-0">
                  <Search className="w-4 h-4 text-ink" strokeWidth={2.6} />
                </span>
                <span className="truncate">{t('home.search_place')}</span>
              </Link>
              <div className="flex gap-2">
                {(['home', 'work'] as const).map((k) => {
                  const saved = myPlaces.some((x) => x.kind === k);
                  const Icon = k === 'home' ? House : Briefcase;
                  return (
                    <Link
                      key={k}
                      href={saved ? `/map?go=${k}` : '/map'}
                      className="flex-1 min-w-0 min-h-[52px] rounded-2xl border-[1.5px] border-white/15 flex items-center gap-2.5 px-3"
                    >
                      <Icon className="w-5 h-5 text-accent shrink-0" />
                      <span className="flex flex-col min-w-0">
                        <span className="text-sm font-medium truncate">{t(k === 'home' ? 'home.saved_home' : 'home.saved_work')}</span>
                        <span className="text-[11px] text-white/60 truncate">{saved ? t('home.tap_go') : t('home.add_place')}</span>
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* active jobs */}
        {active.length > 0 && (
          <section className="px-5 mt-4 flex flex-col gap-2">
            {active.map((j) => (
              <Link key={`${j.kind}${j.id}`} href={jobHref(j.kind, j.id)} className="rounded-[22px] bg-accent text-ink p-4 flex items-center gap-3">
                <span className="relative flex h-3 w-3">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-ink animate-pulse_ring" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-ink" />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium opacity-70">{t('home.in_progress')}</p>
                  <p className="font-semibold truncate">{t(`status.${j.kind}.${j.status}` as any)}</p>
                  {j.title && <p className="text-xs opacity-70 truncate">{j.title}</p>}
                </div>
                <span className="w-10 h-10 rounded-full bg-ink text-accent flex items-center justify-center shrink-0" aria-label={t('home.track')}>
                  <ChevronLeft className="w-5 h-5 ltr:rotate-180" />
                </span>
              </Link>
            ))}
          </section>
        )}

        {/* services */}
        <section data-tour="services" className="px-5 mt-7">
          <h2 className="text-lg font-semibold mb-3">{t('home.need_today')}</h2>
          <div className={`grid grid-cols-2 gap-2.5 ${rideOn ? 'grid-rows-[120px_120px] auto-rows-[96px]' : 'auto-rows-[120px]'}`}>
            {rideOn && (
              <Link href="/ride/new" className="row-span-2 relative rounded-[26px] bg-accent text-ink p-[18px] flex flex-col justify-between overflow-hidden active:scale-[.98] transition-transform">
                <span className="flex flex-col gap-1">
                  <span className="text-[22px] font-semibold">{t('home.svc.ride')}</span>
                  <span className="text-[13px] leading-relaxed text-ink/75">{t('home.ride_sub2')}</span>
                </span>
                {badge.RIDE && <span className="self-start text-[11px] font-semibold bg-ink text-accent rounded-full px-2.5 py-1">{badge.RIDE}</span>}
                <svg aria-hidden width="130" height="80" viewBox="0 0 130 80" className="self-start rtl:-scale-x-100">
                  <path d="M8 58h114" stroke="#0D0D0F" strokeWidth="3" strokeLinecap="round" strokeDasharray="2 10" />
                  <path d="M18 50l10-22a8 8 0 0 1 7-5h46a8 8 0 0 1 7 4l13 23h8a6 6 0 0 1 6 6v6H12v-6a6 6 0 0 1 6-6Z" fill="#0D0D0F" />
                  <path d="M36 30h20v16H29ZM62 30h18l8 16H62Z" fill="#FFD100" />
                  <circle cx="36" cy="62" r="9" fill="#FFD100" stroke="#0D0D0F" strokeWidth="5" />
                  <circle cx="96" cy="62" r="9" fill="#FFD100" stroke="#0D0D0F" strokeWidth="5" />
                </svg>
              </Link>
            )}
            {small.map(({ key, href, title, Icon }, i) => {
              const row = rideOn && i >= 2;
              return (
                <Link
                  key={key}
                  href={href}
                  className={`rounded-[22px] bg-surface p-3.5 flex active:scale-[.98] transition-transform ${
                    row ? 'items-center gap-3' : 'flex-col justify-between'
                  }`}
                >
                  <Icon className={row ? 'w-7 h-7' : 'w-[30px] h-[30px]'} strokeWidth={1.8} />
                  <span className="flex items-center justify-between gap-1.5 min-w-0">
                    <span className="text-base font-semibold truncate">{title}</span>
                    {!row && badge[key] && (
                      <span className="text-[10px] font-semibold bg-ink text-accent dark:bg-accent dark:text-ink rounded-full px-2 py-0.5 whitespace-nowrap">{badge[key]}</span>
                    )}
                  </span>
                </Link>
              );
            })}
          </div>
        </section>

        {/* offers as tickets */}
        {flags?.OFFERS !== false && tickets.length > 0 && (
          <section className="px-5 mt-7">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold">{t('home.offers_today')}</h2>
              <Link href="/offers" className="text-[13px] text-muted min-h-[44px] flex items-center">
                {t('home.see_all')}
              </Link>
            </div>
            <div className="flex flex-col gap-2.5">
              {tickets.map((k, i) => {
                const dark = i === 0;
                return (
                  <div
                    key={k.code}
                    className={`relative rounded-[22px] flex items-stretch overflow-hidden ${dark ? 'bg-ink dark:bg-raised text-white' : 'bg-surface'}`}
                  >
                    <span className="flex-1 min-w-0 px-5 py-4 flex flex-col justify-center gap-0.5">
                      <span className={`text-xs truncate ${dark ? 'text-white/60' : 'text-muted'}`}>{k.sub}</span>
                      <span className={`text-[26px] font-bold leading-tight ${dark ? 'text-accent' : ''}`}>{k.big}</span>
                    </span>
                    <span className={`relative w-[128px] shrink-0 border-s-[1.5px] border-dashed flex flex-col items-center justify-center gap-2 py-4 ${dark ? 'border-white/20' : 'border-border'}`}>
                      <span aria-hidden className="absolute -top-[11px] -start-[11px] w-[22px] h-[22px] rounded-full bg-background" />
                      <span aria-hidden className="absolute -bottom-[11px] -start-[11px] w-[22px] h-[22px] rounded-full bg-background" />
                      <bdi dir="ltr" className="text-[13px] font-semibold tracking-wider max-w-[110px] truncate">
                        {k.code}
                      </bdi>
                      <button
                        type="button"
                        onClick={() => copy(k.code)}
                        className={`min-h-[34px] rounded-full px-3 text-xs font-semibold ${dark ? 'bg-accent text-ink' : 'bg-ink text-white dark:bg-white dark:text-ink'}`}
                      >
                        {copied === k.code ? t('common.copied') : t('home.use')}
                      </button>
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* personal map + captain */}
        <section className="px-5 mt-7 grid grid-cols-2 gap-2.5">
          <Link href="/map" data-tour="mymap" className="rounded-[22px] bg-surface p-4 flex flex-col gap-2 min-h-[112px]">
            <MapPin className="w-7 h-7" strokeWidth={1.8} />
            <span className="font-semibold">{t('home.mymap')}</span>
            <span className="text-xs text-muted leading-relaxed">{t('home.mymap_sub')}</span>
          </Link>
          <Link href="/driver" data-tour="drive" className="rounded-[22px] bg-ink dark:bg-raised text-white p-4 flex flex-col gap-2 min-h-[112px]">
            <span className="w-7 h-7 rounded-full bg-accent text-ink flex items-center justify-center">
              <ChevronLeft className="w-4 h-4 ltr:rotate-180" strokeWidth={2.6} />
            </span>
            <span className="font-semibold">{t('home.drive_title')}</span>
            <span className="text-xs text-white/60 leading-relaxed">{t('home.drive_big')}</span>
          </Link>
        </section>

        {/* nearby restaurants */}
        {flags?.FOOD !== false && stores.length > 0 && (
          <section className="px-5 mt-7">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-semibold">{t('home.nearby')}</h2>
              <Link href="/food" className="text-[13px] text-muted min-h-[44px] flex items-center">
                {t('home.see_all')}
              </Link>
            </div>
            <div className="flex flex-col gap-3.5">
              {stores.slice(0, 5).map((s, i) => {
                const name = pick(s.name_ar, s.name) || '';
                const tone = ['bg-ink text-accent dark:bg-raised', 'bg-accent text-ink', 'bg-surface text-fg'][i % 3];
                return (
                  <Link key={s.id} href={`/store/${s.id}`} className="flex items-center gap-3.5">
                    <span className={`w-[72px] h-[72px] rounded-[22px] flex items-center justify-center text-3xl font-bold shrink-0 ${tone}`}>
                      {s.logo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={s.logo_url} alt="" className="w-full h-full object-cover rounded-[22px]" loading="lazy" />
                      ) : (
                        Array.from(name)[0] ?? ''
                      )}
                    </span>
                    <span className="flex-1 min-w-0 flex flex-col gap-1">
                      <span className="text-base font-semibold truncate">{name}</span>
                      <StoreMeta store={s} currency={currency} />
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* campaign banners from the admin */}
        {flags?.OFFERS !== false && banners.length > 0 && (
          <section className="px-5 mt-7 flex flex-col gap-2.5">
            {banners.map((b) => {
              const dark = isDark(b.color);
              return (
                <Link
                  key={b.id}
                  href={b.link || '/offers'}
                  className="relative min-h-[120px] rounded-[26px] p-5 flex items-center overflow-hidden"
                  style={{ background: b.color || '#0D0D0F', color: dark ? '#fff' : '#0D0D0F' }}
                >
                  <div className="relative z-10 max-w-[64%]">
                    <p className="text-xl font-semibold leading-snug">{pick(b.title_ar, b.title)}</p>
                    {(b.description || b.description_ar) && (
                      <p className={`mt-2 text-sm ${dark ? 'text-white/70' : 'text-ink/70'}`}>{pick(b.description_ar, b.description)}</p>
                    )}
                  </div>
                  {b.emoji && (
                    <span aria-hidden className="absolute end-4 bottom-1 text-[72px] leading-none">
                      {b.emoji}
                    </span>
                  )}
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
