'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Bell, Car, ChevronLeft, Headphones, Map as MapIcon, Menu, Search, Store as StoreIcon, UserRound, X } from 'lucide-react';
import { BottomNav } from '@/components/BottomNav';
import { ServiceArt, type ArtKind } from '@/components/ServiceArt';
import { StoreMeta } from '@/components/StoreMeta';
import { Tour } from '@/components/Tour';
import { useToast } from '@/components/ui';
import { isOn } from '@/lib/features';
import { currentUser, sb, useFlags, useProfile, useStickyState, useUnreadCount } from '@/lib/hooks';
import { useI18n } from '@/lib/i18n';
import { ACTIVE, jobHref, type JobKind } from '@/lib/jobs';
import { useMyLocation } from '@/lib/location';

type ActiveJob = { kind: JobKind; id: number; status: string; title: string };

const TX = {
  ar: {
    hello: 'مرحبًا بك',
    helloName: 'مرحبًا بك، {n}',
    title: 'ماذا تحتاج اليوم؟',
    search: 'ابحث عن مطعم أو متجر أو منتج…',
    taxi: 'تكسي',
    delivery: 'توصيل',
    food: 'مطاعم',
    market: 'متاجر',
    pharmacy: 'صيدليات',
    gifts: 'هدايا وورود',
    homeSvc: 'خدمات منزلية',
    carSvc: 'خدمات السيارات',
    soon: 'قريبًا',
    soonToast: 'هذه الخدمة قادمة قريبًا إلى مدينتك.',
    slides: {
      RIDE: ['اطلب تكسي الآن', 'بسرعة وأمان إلى أي مكان'],
      FOOD: ['جائع؟ اطلب من مطعمك المفضل', 'توصيل سريع من مطاعم مدينتك'],
      DELIVERY: ['أرسل أي غرض', 'من الباب إلى الباب بأمان'],
      MARKET: ['تسوّق من المتاجر القريبة', 'بقالة وصيدليات وورود'],
    } as Record<string, [string, string]>,
    open: 'افتح',
    offersTitle: 'عروض حصرية',
    offersSub: 'خصومات على خدماتك المفضلة',
    menu: 'القائمة',
    mAccount: 'حسابي',
    mMap: 'خرائطي والتوجيه',
    mDrive: 'اعمل كابتن مع كاب',
    mStore: 'شاشة المطعم أو المتجر',
    mSupport: 'المساعدة والدعم',
    close: 'إغلاق',
    notif: 'الإشعارات',
  },
  en: {
    hello: 'Welcome',
    helloName: 'Welcome, {n}',
    title: 'What do you need today?',
    search: 'Search restaurants, stores or products…',
    taxi: 'Taxi',
    delivery: 'Delivery',
    food: 'Restaurants',
    market: 'Stores',
    pharmacy: 'Pharmacies',
    gifts: 'Gifts & flowers',
    homeSvc: 'Home services',
    carSvc: 'Car services',
    soon: 'Soon',
    soonToast: 'This service is coming to your city soon.',
    slides: {
      RIDE: ['Get a taxi now', 'Fast and safe, anywhere'],
      FOOD: ['Hungry? Order from your favourite place', 'Fast delivery from restaurants near you'],
      DELIVERY: ['Send anything', 'Door to door, safely'],
      MARKET: ['Shop from stores nearby', 'Groceries, pharmacies and flowers'],
    } as Record<string, [string, string]>,
    open: 'Open',
    offersTitle: 'Exclusive offers',
    offersSub: 'Discounts on the services you love',
    menu: 'Menu',
    mAccount: 'My account',
    mMap: 'My map & directions',
    mDrive: 'Drive with KAP',
    mStore: 'Store screen',
    mSupport: 'Help & support',
    close: 'Close',
    notif: 'Notifications',
  },
  ku: {
    hello: 'بەخێربێیت',
    helloName: 'بەخێربێیت، {n}',
    title: 'ئەمڕۆ چیت پێویستە؟',
    search: 'بەدوای چێشتخانە، دوکان یان بەرهەم بگەڕێ…',
    taxi: 'تاکسی',
    delivery: 'گەیاندن',
    food: 'چێشتخانەکان',
    market: 'دوکانەکان',
    pharmacy: 'دەرمانخانەکان',
    gifts: 'دیاری و گوڵ',
    homeSvc: 'خزمەتگوزاری ماڵ',
    carSvc: 'خزمەتگوزاری ئۆتۆمبێل',
    soon: 'بەم زووانە',
    soonToast: 'ئەم خزمەتگوزارییە بەم زووانە دێتە شارەکەت.',
    slides: {
      RIDE: ['ئێستا تاکسی داوا بکە', 'بە خێرایی و سەلامەتی بۆ هەر شوێنێک'],
      FOOD: ['برسیتە؟ لە چێشتخانەی دڵخوازت داوا بکە', 'گەیاندنی خێرا لە چێشتخانەکانی شارەکەت'],
      DELIVERY: ['هەر شتێک بنێرە', 'لە دەرگاوە بۆ دەرگا بە سەلامەتی'],
      MARKET: ['لە دوکانە نزیکەکان بکڕە', 'بەقاڵی، دەرمانخانە و گوڵ'],
    } as Record<string, [string, string]>,
    open: 'بیکەرەوە',
    offersTitle: 'ئۆفەری تایبەت',
    offersSub: 'داشکاندن لەسەر خزمەتگوزارییە دڵخوازەکانت',
    menu: 'لیست',
    mAccount: 'هەژمارەکەم',
    mMap: 'نەخشەکەم و ڕێنمایی',
    mDrive: 'لەگەڵ کاب ببە کاپتن',
    mStore: 'شاشەی چێشتخانە',
    mSupport: 'یارمەتی و پشتگیری',
    close: 'داخستن',
    notif: 'ئاگادارکردنەوەکان',
  },
  tr: {
    hello: 'Hoş geldin',
    helloName: 'Hoş geldin, {n}',
    title: 'Bugün neye ihtiyacın var?',
    search: 'Restoran, mağaza veya ürün ara…',
    taxi: 'Taksi',
    delivery: 'Kurye',
    food: 'Restoranlar',
    market: 'Mağazalar',
    pharmacy: 'Eczaneler',
    gifts: 'Hediye ve çiçek',
    homeSvc: 'Ev hizmetleri',
    carSvc: 'Araç hizmetleri',
    soon: 'Yakında',
    soonToast: 'Bu hizmet yakında şehrinde.',
    slides: {
      RIDE: ['Hemen taksi çağır', 'Hızlı ve güvenli, her yere'],
      FOOD: ['Acıktın mı? Sevdiğin yerden sipariş ver', 'Yakındaki restoranlardan hızlı teslimat'],
      DELIVERY: ['İstediğini gönder', 'Kapıdan kapıya, güvenle'],
      MARKET: ['Yakındaki mağazalardan alışveriş', 'Market, eczane ve çiçek'],
    } as Record<string, [string, string]>,
    open: 'Aç',
    offersTitle: 'Özel fırsatlar',
    offersSub: 'Sevdiğin hizmetlerde indirimler',
    menu: 'Menü',
    mAccount: 'Hesabım',
    mMap: 'Haritam ve yol tarifi',
    mDrive: "KAP'ta kaptan ol",
    mStore: 'Mağaza ekranı',
    mSupport: 'Yardım ve destek',
    close: 'Kapat',
    notif: 'Bildirimler',
  },
};

type Tile = { key: string; flag: string; parent?: string; href?: string; art: ArtKind; label: string; soon?: boolean };
type Slide = { id: string; title: string; sub: string; href: string; art: ArtKind };

export default function HomePage() {
  const { t, pick, lang, dir } = useI18n();
  const tx = TX[(lang as keyof typeof TX) in TX ? (lang as keyof typeof TX) : 'en'];
  const flags = useFlags();
  const on = (k: string) => isOn(flags, k);
  const unread = useUnreadCount();
  const profile = useProfile();
  const loc = useMyLocation();
  const { toast, toastNode } = useToast();
  const [banners, setBanners] = useStickyState<any[]>('home.banners', []);
  const [stores, setStores] = useStickyState<any[]>('home.stores', []);
  const [currency, setCurrency] = useStickyState('home.currency', 'IQD');
  const [active, setActive] = useStickyState<ActiveJob[]>('home.active', []);
  const [menu, setMenu] = useState(false);

  useEffect(() => {
    const s = sb();
    s.from('banners').select('*').eq('is_active', true).order('sort').then(({ data }) => setBanners(data ?? []));
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
        s.from('stores').select('*').eq('city_id', (city as any).id).eq('is_active', true).in('category', ['restaurant', 'cafe', 'sweets']).order('rating', { ascending: false }).limit(6),
        s.from('countries').select('currency_code').eq('id', (city as any).country_id).single(),
      ]);
      setStores(st ?? []);
      if (co) setCurrency((co as any).currency_code);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loc.ready, loc.point.lat, loc.point.lng]);

  // every service the super admin has switched on, in a fixed order
  const tiles = useMemo(() => {
    const all: Tile[] = [
      { key: 'taxi', flag: 'RIDE', href: '/ride/new', art: 'taxi', label: tx.taxi },
      { key: 'delivery', flag: 'DELIVERY', href: '/send', art: 'scooter', label: tx.delivery },
      { key: 'food', flag: 'FOOD', href: '/food', art: 'burger', label: tx.food },
      { key: 'market', flag: 'MARKET', href: '/food?type=market', art: 'bags', label: tx.market },
      { key: 'pharmacy', flag: 'PHARMACY', parent: 'MARKET', href: '/food?type=market&cat=pharmacy', art: 'pharmacy', label: tx.pharmacy },
      { key: 'gifts', flag: 'GIFTS', parent: 'MARKET', href: '/food?type=market&cat=flowers', art: 'gift', label: tx.gifts },
      { key: 'home', flag: 'HOME_SERVICES', art: 'home', label: tx.homeSvc, soon: true },
      { key: 'car', flag: 'CAR_SERVICES', art: 'car', label: tx.carSvc, soon: true },
    ];
    return all.filter((x) => on(x.flag) && (!x.parent || on(x.parent)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flags, lang]);

  const slides = useMemo(() => {
    const svc: Slide[] = (
      [
        ['RIDE', '/ride/new', 'taxi'],
        ['FOOD', '/food', 'burger'],
        ['DELIVERY', '/send', 'scooter'],
        ['MARKET', '/food?type=market', 'bags'],
      ] as const
    )
      .filter(([k]) => on(k))
      .map(([k, href, art]) => ({ id: k, title: tx.slides[k][0], sub: tx.slides[k][1], href, art }));
    const promo: Slide[] = on('OFFERS')
      ? banners.map((b) => ({ id: `b${b.id}`, title: pick(b.title_ar, b.title), sub: pick(b.description_ar, b.description) ?? '', href: b.link || '/offers', art: 'gift' as ArtKind }))
      : [];
    return [...svc, ...promo];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flags, lang, banners]);

  const name = (profile?.first_name || profile?.full_name || '').split(' ')[0];

  return (
    <main className="min-h-screen bg-background pb-28">
      <div className="max-w-md md:max-w-2xl lg:max-w-3xl mx-auto px-5">
        {/* top bar */}
        <header className="safe-top pt-2 grid grid-cols-[48px_1fr_48px] items-center">
          <Link href="/notifications" aria-label={tx.notif} className="relative w-12 h-12 rounded-full bg-surface flex items-center justify-center">
            <Bell className="w-[22px] h-[22px]" />
            {unread > 0 && <span className="absolute top-2.5 end-3 w-2.5 h-2.5 rounded-full bg-accent ring-2 ring-surface" />}
          </Link>
          <p className="text-center text-[28px] font-bold tracking-tight leading-none" dir="ltr" aria-label="KAP">
            K<span className="text-accent">A</span>P
          </p>
          <button onClick={() => setMenu(true)} aria-label={tx.menu} className="w-12 h-12 rounded-full bg-surface flex items-center justify-center justify-self-end">
            <Menu className="w-[22px] h-[22px]" />
          </button>
        </header>

        {/* greeting */}
        <section className="mt-6">
          <p className="text-muted">{name ? tx.helloName.replace('{n}', name) : tx.hello}</p>
          <h1 className="text-[28px] font-bold leading-snug mt-0.5">{tx.title}</h1>
        </section>

        <Link href="/food" className="mt-4 h-14 rounded-2xl bg-surface border border-border flex items-center gap-3 px-4 text-muted">
          <Search className="w-5 h-5 shrink-0" />
          <span className="truncate">{tx.search}</span>
        </Link>

        {/* what is in progress right now */}
        {active.length > 0 && (
          <section className="mt-4 flex flex-col gap-2">
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

        {on('HOME_HERO') && slides.length > 0 && <Hero slides={slides} dir={dir} openLabel={tx.open} />}

        {/* all services */}
        {tiles.length > 0 && (
          <section data-tour="services" className="mt-5 grid grid-cols-6 gap-3">
            {tiles.map((x, i) => {
              const rest = tiles.length % 3;
              const wide = rest !== 0 && i >= tiles.length - rest; // last row fills the width
              const span = wide ? (rest === 1 ? 'col-span-6' : 'col-span-3') : 'col-span-2';
              const body = (
                <>
                  {x.soon && <span className="absolute top-2 start-2 text-[10px] font-semibold rounded-full px-2 py-0.5 bg-accent text-ink">{tx.soon}</span>}
                  <ServiceArt kind={x.art} uid={`tile-${x.key}`} className={`h-[68px] w-auto ${x.soon ? 'opacity-80' : ''}`} />
                  <span className="text-[15px] font-semibold text-center leading-tight">{x.label}</span>
                </>
              );
              const cls = `${span} relative min-h-[132px] rounded-[22px] bg-surface border border-border flex flex-col items-center justify-center gap-2 px-2 py-3 active:scale-[.97] transition-transform`;
              return x.href ? (
                <Link key={x.key} href={x.href} data-tour={x.key === 'taxi' ? 'where' : undefined} className={cls}>
                  {body}
                </Link>
              ) : (
                <button key={x.key} onClick={() => toast(tx.soonToast)} className={cls}>
                  {body}
                </button>
              );
            })}
          </section>
        )}

        {on('OFFERS') && (
          <Link href="/offers" className="mt-5 relative min-h-[108px] rounded-[24px] overflow-hidden flex items-center ps-5 pe-3 py-3 gap-3" style={{ background: goldBg(dir) }}>
            <span className="flex-1 min-w-0">
              <span className="block text-lg font-bold text-accent leading-snug">{tx.offersTitle}</span>
              <span className="block text-[13px] text-white/80 mt-1 leading-relaxed">{tx.offersSub}</span>
            </span>
            <span className="w-11 h-11 rounded-full bg-accent text-ink flex items-center justify-center shrink-0">
              <ArrowLeft className="w-5 h-5 ltr:rotate-180" />
            </span>
            <ServiceArt kind="gift" uid="offer" className="w-[96px] h-auto shrink-0" />
          </Link>
        )}

        {on('HOME_STORES') && on('FOOD') && stores.length > 0 && (
          <section className="mt-7">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-semibold">{t('home.nearby')}</h2>
              <Link href="/food" className="text-[13px] text-muted min-h-[44px] flex items-center">
                {t('home.see_all')}
              </Link>
            </div>
            <div className="flex flex-col gap-3">
              {stores.slice(0, 4).map((s, i) => {
                const nm = pick(s.name_ar, s.name) || '';
                const tone = ['bg-accent text-ink', 'bg-surface text-fg border border-border', 'bg-ink text-accent dark:bg-raised'][i % 3];
                return (
                  <Link key={s.id} href={`/store/${s.id}`} className="flex items-center gap-3.5">
                    <span className={`w-16 h-16 rounded-[20px] flex items-center justify-center text-2xl font-bold shrink-0 ${tone}`}>{Array.from(nm)[0] ?? ''}</span>
                    <span className="flex-1 min-w-0 flex flex-col gap-1">
                      <span className="text-base font-semibold truncate">{nm}</span>
                      <StoreMeta store={s} currency={currency} />
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>
        )}
      </div>

      {menu && <MenuSheet tx={tx} dir={dir} on={on} onClose={() => setMenu(false)} />}
      <BottomNav />
      <Tour />
      {toastNode}
    </main>
  );
}

function goldBg(dir: string) {
  // dark where the text sits (the start side), gold toward the picture
  const to = dir === 'rtl' ? 'to left' : 'to right';
  return `linear-gradient(${to}, #15120A 0%, #2E2408 38%, #8A6A00 78%, #D9A800 100%)`;
}

function Hero({ slides, dir, openLabel }: { slides: Slide[]; dir: string; openLabel: string }) {
  const [i, setI] = useState(0);
  const touch = useRef<number | null>(null);
  const n = slides.length;
  useEffect(() => {
    if (i >= n) setI(0);
  }, [n, i]);
  useEffect(() => {
    if (n < 2) return;
    const iv = setInterval(() => setI((x) => (x + 1) % n), 5000);
    return () => clearInterval(iv);
  }, [n, i]);
  const sign = dir === 'rtl' ? 1 : -1;
  return (
    <section
      className="mt-5 relative rounded-[26px] overflow-hidden"
      aria-roledescription="carousel"
      onTouchStart={(e) => (touch.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touch.current === null) return;
        const dx = (e.changedTouches[0].clientX - touch.current) * sign;
        touch.current = null;
        if (Math.abs(dx) < 40) return;
        setI((x) => (dx < 0 ? (x - 1 + n) % n : (x + 1) % n));
      }}
    >
      <div className="flex transition-transform duration-500 ease-out" style={{ transform: `translateX(${sign * i * 100}%)` }}>
        {slides.map((s, k) => (
          <Link
            key={s.id}
            href={s.href}
            aria-hidden={k !== i}
            tabIndex={k === i ? 0 : -1}
            className="w-full shrink-0 min-h-[172px] relative flex items-center ps-5 pe-3 pt-5 pb-8 gap-1"
            style={{ background: goldBg(dir) }}
          >
            <span className="flex-1 min-w-0 relative z-10">
              <span className="block text-[20px] font-bold text-white leading-snug">{s.title}</span>
              <span className="block text-[13px] text-white/75 mt-1 line-clamp-2">{s.sub}</span>
              <span className="mt-3 w-10 h-10 rounded-full bg-accent text-ink flex items-center justify-center" aria-label={openLabel}>
                <ArrowLeft className="w-5 h-5 ltr:rotate-180" />
              </span>
            </span>
            <ServiceArt kind={s.art} uid={`hero-${s.id}`} className="w-[44%] max-w-[170px] h-auto shrink-0" />
          </Link>
        ))}
      </div>
      {n > 1 && (
        <div className="absolute bottom-3 inset-x-0 flex justify-center gap-1.5">
          {slides.map((s, k) => (
            <button
              key={s.id}
              onClick={() => setI(k)}
              aria-label={`${k + 1} / ${n}`}
              className={`h-2 rounded-full transition-all ${k === i ? 'w-5 bg-accent' : 'w-2 bg-white/40'}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function MenuSheet({ tx, dir, on, onClose }: { tx: (typeof TX)['ar']; dir: string; on: (k: string) => boolean; onClose: () => void }) {
  const items = [
    { href: '/account', label: tx.mAccount, Icon: UserRound, show: true },
    { href: '/map', label: tx.mMap, Icon: MapIcon, show: on('MY_MAP') },
    { href: '/driver', label: tx.mDrive, Icon: Car, show: on('DRIVER_SIGNUP') },
    { href: '/merchant', label: tx.mStore, Icon: StoreIcon, show: on('STORE_DEVICE') },
    { href: '/support', label: tx.mSupport, Icon: Headphones, show: true },
  ].filter((x) => x.show);
  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center" dir={dir} role="dialog" aria-modal="true" aria-label={tx.menu}>
      <button aria-label={tx.close} onClick={onClose} className="absolute inset-0 bg-black/50 animate-tour-fade" />
      <div className="relative w-full max-w-md bg-background rounded-t-[28px] sm:rounded-[28px] safe-bottom p-5 animate-slide-up">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-semibold">{tx.menu}</h2>
          <button onClick={onClose} aria-label={tx.close} className="w-10 h-10 rounded-full bg-surface flex items-center justify-center">
            <X className="w-5 h-5" />
          </button>
        </div>
        <nav className="flex flex-col">
          {items.map(({ href, label, Icon }) => (
            <Link key={href} href={href} className="h-14 flex items-center gap-3 border-b border-border last:border-0">
              <span className="w-10 h-10 rounded-xl bg-surface flex items-center justify-center">
                <Icon className="w-5 h-5" />
              </span>
              <span className="flex-1 font-medium">{label}</span>
              <ChevronLeft className="w-5 h-5 text-muted ltr:rotate-180" />
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
