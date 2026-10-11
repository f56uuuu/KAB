'use client';

import Link from 'next/link';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { MapPin, Search, Store as StoreIcon } from 'lucide-react';
import { BottomNav } from '@/components/BottomNav';
import { Chip, Empty, TopBar } from '@/components/ui';
import { StoreMeta } from '@/components/StoreMeta';
import { CartBar } from '@/components/CartBar';
import { CityPicker } from '@/components/CityPicker';
import { useCities } from '@/lib/cities';
import { useI18n } from '@/lib/i18n';
import { sb } from '@/lib/hooks';
import { useMyLocation } from '@/lib/location';
import { FOOD_CATS, MARKET_CATS } from '@/lib/jobs';

export default function FoodPage() {
  return (
    <Suspense>
      <Food />
    </Suspense>
  );
}

function readCity(): number | null {
  try {
    const v = localStorage.getItem('kap_city');
    return v ? Number(v) : null;
  } catch {
    return null;
  }
}

function Food() {
  const { t, pick } = useI18n();
  const params = useSearchParams();
  const market = params.get('type') === 'market';
  const cats = market ? MARKET_CATS : FOOD_CATS;
  const loc = useMyLocation();
  const cities = useCities();
  const [cityId, setCityId] = useState<number | null>(null);
  const [currency, setCurrency] = useState('IQD');
  const [stores, setStores] = useState<any[] | null>(null);
  const [cat, setCat] = useState<string>('all');
  const [q, setQ] = useState('');

  // city: saved choice, else nearest to the user
  useEffect(() => {
    const saved = readCity();
    if (saved) return setCityId(saved);
    if (!loc.ready) return;
    sb()
      .rpc('nearest_city', { p_lat: loc.point.lat, p_lng: loc.point.lng })
      .maybeSingle()
      .then(({ data }) => setCityId((data as any)?.id ?? null));
  }, [loc.ready]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!cityId) return;
    setStores(null);
    sb()
      .from('stores')
      .select('*')
      .eq('city_id', cityId)
      .in('category', cats as unknown as string[])
      .order('sort')
      .then(({ data }) => setStores(data ?? []));
  }, [cityId, market]); // eslint-disable-line react-hooks/exhaustive-deps

  const city = cities.find((c) => c.id === cityId);
  useEffect(() => {
    if (city?.countries?.currency_code) setCurrency(city.countries.currency_code);
  }, [city]);

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (stores ?? []).filter(
      (s) =>
        (cat === 'all' || s.category === cat) &&
        (!needle || `${s.name} ${s.name_ar}`.toLowerCase().includes(needle)),
    );
  }, [stores, cat, q]);

  function changeCity(id: number) {
    setCityId(id);
    try {
      localStorage.setItem('kap_city', String(id));
    } catch {
      /* not persisted */
    }
  }

  return (
    <main className="min-h-screen bg-background pb-40">
      <TopBar back="/home" title={market ? t('market.title') : t('food.title')} />
      <div className="max-w-md md:max-w-2xl lg:max-w-3xl mx-auto px-5 flex flex-col gap-4">
        <div className="flex items-center gap-2 text-sm">
          <MapPin className="w-4 h-4 shrink-0" />
          <span className="text-muted">{t('food.delivering_in')}</span>
          <CityPicker value={cityId} onChange={(id) => changeCity(id)} />
        </div>

        <div className="h-12 rounded-2xl bg-surface flex items-center gap-2 px-4">
          <Search className="w-5 h-5 text-muted" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t('food.search')}
            className="flex-1 bg-transparent outline-none font-medium"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-5 px-5">
          <Chip active={cat === 'all'} onClick={() => setCat('all')}>
            {t('food.cat.all')}
          </Chip>
          {cats.map((c) => (
            <Chip key={c} active={cat === c} onClick={() => setCat(c)}>
              {t(`food.cat.${c}` as any)}
            </Chip>
          ))}
        </div>

        {stores === null ? (
          <div className="grid gap-4 md:grid-cols-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-40 rounded-3xl bg-surface animate-pulse" />
            ))}
          </div>
        ) : shown.length === 0 ? (
          <Empty icon={<StoreIcon className="w-7 h-7" />} title={t('food.no_stores')} />
        ) : (
          <div className="grid gap-5 md:grid-cols-2">
            {shown.map((s) => (
              <Link key={s.id} href={`/store/${s.id}`} className={`block ${s.is_open ? '' : 'opacity-60'}`}>
                <div
                  className="relative h-36 rounded-3xl flex items-center justify-center overflow-hidden"
                  style={{ background: `linear-gradient(135deg, ${s.color}33, ${s.color}14)` }}
                >
                  <span className="text-7xl" aria-hidden>
                    {s.emoji}
                  </span>
                  {!s.is_open && (
                    <span className="absolute top-3 start-3 bg-ink text-white text-xs font-bold px-3 py-1 rounded-full">
                      {t('food.closed')}
                    </span>
                  )}
                </div>
                <div className="flex items-start justify-between mt-2.5 gap-2">
                  <div className="min-w-0">
                    <p className="font-extrabold text-lg leading-tight truncate">{pick(s.name_ar, s.name)}</p>
                    <p className="text-xs text-muted">{t(`food.cat.${s.category}` as any)}</p>
                  </div>
                </div>
                <StoreMeta store={s} currency={currency} className="mt-1.5" />
              </Link>
            ))}
          </div>
        )}
      </div>
      <CartBar />
      <BottomNav />
    </main>
  );
}
