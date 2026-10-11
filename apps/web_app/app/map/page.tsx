'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Briefcase, CloudDownload, Crosshair, Home as HomeIcon, Navigation, Plus, Route as RouteIcon, Star, Trash2, WifiOff, X } from 'lucide-react';
import { KapMap, type MapMarker } from '@/components/KapMap';
import { BackButton, useToast, btn } from '@/components/ui';
import { useI18n } from '@/lib/i18n';
import { sb } from '@/lib/hooks';
import { getCurrentPosition, mapProvider, type LatLng } from '@/lib/maps';
import { downloadArea, places as placeStore, storageEstimate, trips as tripStore, type SavedPlace, type SavedTrip } from '@/lib/offline';

const TXT = {
  ar: {
    title: 'خرائطي', offline: 'أنت غير متصل — الخريطة والأماكن المحفوظة تعمل', places: 'أماكني', trips: 'آخر المسارات',
    home: 'البيت', work: 'العمل', fav: 'مفضل', setHome: 'تعيين البيت', setWork: 'تعيين العمل', addHint: 'اضغط على الخريطة لإضافة مكان',
    name: 'اسم المكان', save: 'حفظ', asHome: 'بيت', asWork: 'عمل', asFav: 'مفضل', route: 'المسار', go: 'ابدأ',
    download: 'حفظ المنطقة للاستخدام بدون إنترنت', downloading: 'جارٍ الحفظ…', downloaded: 'تم حفظ المنطقة', needOnline: 'تحتاج إنترنت لحفظ المنطقة أول مرة',
    noTrips: 'المسارات التي تفتحها تُحفظ هنا تلقائيًا', used: 'المساحة المستخدمة', km: 'كم', min: 'د', waze: 'Waze', google: 'Google Maps', ride: 'اطلب سيارة',
  },
  en: {
    title: 'My map', offline: 'You’re offline — your map and saved places still work', places: 'My places', trips: 'Recent routes',
    home: 'Home', work: 'Work', fav: 'Favourite', setHome: 'Set home', setWork: 'Set work', addHint: 'Tap the map to add a place',
    name: 'Place name', save: 'Save', asHome: 'Home', asWork: 'Work', asFav: 'Favourite', route: 'Route', go: 'Go',
    download: 'Save this area for offline use', downloading: 'Saving…', downloaded: 'Area saved', needOnline: 'You need internet to save an area the first time',
    noTrips: 'Routes you open are kept here automatically', used: 'Storage used', km: 'km', min: 'min', waze: 'Waze', google: 'Google Maps', ride: 'Get a ride',
  },
  ku: {
    title: 'نەخشەکەم', offline: 'ئۆفلاینیت — نەخشە و شوێنە پاشەکەوتکراوەکان کار دەکەن', places: 'شوێنەکانم', trips: 'دوایین ڕێگاکان',
    home: 'ماڵ', work: 'کار', fav: 'دڵخواز', setHome: 'دانانی ماڵ', setWork: 'دانانی کار', addHint: 'لەسەر نەخشە دابگرە بۆ زیادکردنی شوێن',
    name: 'ناوی شوێن', save: 'پاشەکەوت', asHome: 'ماڵ', asWork: 'کار', asFav: 'دڵخواز', route: 'ڕێگا', go: 'دەستپێبکە',
    download: 'ئەم ناوچەیە بۆ بەکارهێنانی بێ ئینتەرنێت پاشەکەوت بکە', downloading: 'پاشەکەوت دەکرێت…', downloaded: 'ناوچەکە پاشەکەوت کرا', needOnline: 'بۆ یەکەم جار ئینتەرنێتت پێویستە',
    noTrips: 'ئەو ڕێگایانەی دەیکەیتەوە لێرە پاشەکەوت دەبن', used: 'شوێنی بەکارهاتوو', km: 'کم', min: 'خ', waze: 'Waze', google: 'Google Maps', ride: 'ئۆتۆمبێل داوابکە',
  },
  tr: {
    title: 'Haritam', offline: 'Çevrimdışısın — haritan ve kayıtlı yerlerin çalışıyor', places: 'Yerlerim', trips: 'Son rotalar',
    home: 'Ev', work: 'İş', fav: 'Favori', setHome: 'Evi belirle', setWork: 'İşi belirle', addHint: 'Yer eklemek için haritaya dokun',
    name: 'Yer adı', save: 'Kaydet', asHome: 'Ev', asWork: 'İş', asFav: 'Favori', route: 'Rota', go: 'Git',
    download: 'Bu bölgeyi çevrimdışı kullanım için kaydet', downloading: 'Kaydediliyor…', downloaded: 'Bölge kaydedildi', needOnline: 'İlk kayıt için internet gerekir',
    noTrips: 'Açtığın rotalar burada otomatik saklanır', used: 'Kullanılan alan', km: 'km', min: 'dk', waze: 'Waze', google: 'Google Maps', ride: 'Araç çağır',
  },
};

const ICON = { home: HomeIcon, work: Briefcase, fav: Star };

export default function MyMapPage() {
  const { lang, dir } = useI18n();
  const tx = TXT[lang as keyof typeof TXT] ?? TXT.en;
  const [online, setOnline] = useState(true);
  const [me, setMe] = useState<LatLng | null>(null);
  const [saved, setSaved] = useState<SavedPlace[]>([]);
  const [recent, setRecent] = useState<SavedTrip[]>([]);
  const [draft, setDraft] = useState<{ point: LatLng; name: string; kind: SavedPlace['kind'] } | null>(null);
  const [active, setActive] = useState<SavedTrip | null>(null);
  const [focus, setFocus] = useState<LatLng | null>(null);
  const [fitKey, setFitKey] = useState(0);
  const [dl, setDl] = useState<{ done: number; total: number } | null>(null);
  const [used, setUsed] = useState<number | null>(null);
  const { toast, toastNode } = useToast();

  const refresh = useCallback(() => {
    setSaved(placeStore.all());
    setRecent(tripStore.all());
  }, []);

  useEffect(() => {
    setOnline(navigator.onLine);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    refresh();
    getCurrentPosition().then(({ point }) => setMe(point));
    storageEstimate().then((e) => e && setUsed(e.usedMb));
    // bring home/work saved in the account onto the device
    (async () => {
      try {
        const {
          data: { user },
        } = await sb().auth.getUser();
        if (!user) return;
        const { data } = await sb().from('addresses').select('*').eq('profile_id', user.id);
        (data ?? []).forEach((a: any) => {
          if ((a.address_type === 'home' || a.address_type === 'work') && a.latitude)
            placeStore.save({ kind: a.address_type, name: a.street_address || a.address_type, lat: +a.latitude, lng: +a.longitude });
        });
        refresh();
      } catch {
        /* offline */
      }
    })();
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, [refresh]);

  const markers = useMemo<MapMarker[]>(() => {
    const m: MapMarker[] = saved.map((p) => ({ id: p.id, kind: p.kind === 'fav' ? 'job' : 'dropoff', lat: p.lat, lng: p.lng, emoji: p.kind === 'fav' ? '⭐' : undefined, label: p.name }));
    if (me) m.push({ id: 'me', kind: 'me', ...me });
    if (draft) m.push({ id: 'draft', kind: 'pickup', ...draft.point });
    return m;
  }, [saved, me, draft]);

  async function routeTo(p: { lat: number; lng: number; name: string }) {
    const from = me ?? (await getCurrentPosition()).point;
    const cached = tripStore.all().find((t) => Math.abs(t.to.lat - p.lat) < 1e-4 && Math.abs(t.to.lng - p.lng) < 1e-4);
    if (!navigator.onLine) {
      if (cached) {
        setActive(cached);
        setFitKey((k) => k + 1);
      } else toast(tx.needOnline);
      return;
    }
    try {
      const r = await mapProvider.route(from, { lat: p.lat, lng: p.lng });
      if (r?.path?.length) {
        const t = tripStore.save({ from, to: { lat: p.lat, lng: p.lng }, toName: p.name, path: r.path, km: r.distanceKm, min: r.durationMin });
        setActive(t);
        refresh();
        setFitKey((k) => k + 1);
      }
    } catch {
      if (cached) setActive(cached);
    }
  }

  async function saveArea() {
    if (!navigator.onLine) return toast(tx.needOnline);
    const centres = [me, ...saved.filter((p) => p.kind !== 'fav').map((p) => ({ lat: p.lat, lng: p.lng }))].filter(Boolean) as LatLng[];
    if (!centres.length) return;
    setDl({ done: 0, total: 1 });
    try {
      await downloadArea(centres, (done, total) => setDl({ done, total }));
      toast(tx.downloaded);
      storageEstimate().then((e) => e && setUsed(e.usedMb));
    } catch {
      toast(tx.needOnline);
    }
    setDl(null);
  }

  const home = saved.find((p) => p.kind === 'home');
  const work = saved.find((p) => p.kind === 'work');
  const favs = saved.filter((p) => p.kind === 'fav');

  return (
    <main className="fixed inset-0 bg-background" dir={dir}>
      <KapMap
        className="absolute inset-0"
        markers={markers}
        route={active?.path ?? null}
        center={focus ?? me}
        zoom={15}
        fitKey={`${fitKey}-${focus?.lat ?? ''}`}
        bottomInset={300}
        padding={[40, 110]}
        onClick={(p) => setDraft({ point: p, name: '', kind: 'fav' })}
      />

      <div className="absolute top-0 inset-x-0 z-[500] safe-top px-4 pt-2 flex flex-col gap-2 max-w-md mx-auto">
        <div className="flex items-center gap-2">
          <BackButton href="/home" />
          <div className="flex-1 h-11 rounded-full bg-raised shadow-float flex items-center px-4 font-black">{tx.title}</div>
          <button onClick={() => me && (setFocus({ ...me }), setFitKey((k) => k + 1))} aria-label="GPS" className="w-11 h-11 rounded-full bg-raised shadow-float flex items-center justify-center">
            <Crosshair className="w-5 h-5" />
          </button>
        </div>
        {!online && (
          <div className="rounded-2xl bg-ink text-white px-4 py-2.5 text-sm font-bold flex items-center gap-2">
            <WifiOff className="w-4 h-4 text-accent" />
            {tx.offline}
          </div>
        )}
      </div>

      <section className="absolute bottom-0 inset-x-0 z-[600] max-h-[58vh] overflow-y-auto bg-background rounded-t-sheet shadow-sheet">
        <div className="max-w-md mx-auto px-5 pt-4 safe-bottom flex flex-col gap-4">
          {draft ? (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <p className="font-extrabold flex-1">{tx.name}</p>
                <button onClick={() => setDraft(null)} aria-label="x" className="w-9 h-9 rounded-full bg-surface flex items-center justify-center">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <input autoFocus value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} className="h-12 rounded-xl border border-border bg-background px-4 outline-none focus:border-fg" />
              <div className="grid grid-cols-3 gap-2">
                {(['home', 'work', 'fav'] as const).map((k) => (
                  <button key={k} onClick={() => setDraft({ ...draft, kind: k })} className={`h-11 rounded-xl border-2 text-sm font-bold ${draft.kind === k ? 'border-fg bg-surface' : 'border-border'}`}>
                    {k === 'home' ? tx.asHome : k === 'work' ? tx.asWork : tx.asFav}
                  </button>
                ))}
              </div>
              <button
                onClick={() => {
                  placeStore.save({ kind: draft.kind, name: draft.name.trim() || (draft.kind === 'home' ? tx.home : draft.kind === 'work' ? tx.work : tx.fav), lat: draft.point.lat, lng: draft.point.lng });
                  setDraft(null);
                  refresh();
                }}
                className={btn({ size: 'md', full: true })}
              >
                {tx.save}
              </button>
            </div>
          ) : active ? (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted font-bold">{tx.route}</p>
                  <p className="font-black text-lg truncate">{active.toName}</p>
                  <p className="text-sm text-muted">
                    {active.km.toFixed(1)} {tx.km} · {Math.round(active.min)} {tx.min}
                  </p>
                </div>
                <button onClick={() => setActive(null)} aria-label="x" className="w-9 h-9 rounded-full bg-surface flex items-center justify-center">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <a href={`https://waze.com/ul?ll=${active.to.lat},${active.to.lng}&navigate=yes`} target="_blank" rel="noreferrer" className={`${btn({ size: 'md' })} !bg-[#33CCFF] !shadow-none !px-2`}>
                  <Navigation className="w-4 h-4" />
                  {tx.waze}
                </a>
                <a href={`https://www.google.com/maps/dir/?api=1&destination=${active.to.lat},${active.to.lng}&travelmode=driving`} target="_blank" rel="noreferrer" className={`${btn({ variant: 'soft', size: 'md' })} !px-2`}>
                  {tx.google}
                </a>
                <Link href={`/ride/new?to=${active.to.lat},${active.to.lng}&label=${encodeURIComponent(active.toName)}`} className={`${btn({ size: 'md' })} !px-2`}>
                  {tx.ride}
                </Link>
              </div>
            </div>
          ) : (
            <>
              <div>
                <h2 className="font-extrabold mb-2">{tx.places}</h2>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { p: home, label: tx.home, set: tx.setHome, kind: 'home' as const },
                    { p: work, label: tx.work, set: tx.setWork, kind: 'work' as const },
                  ].map(({ p, label, set, kind }) => {
                    const Icon = ICON[kind];
                    return (
                      <button
                        key={kind}
                        onClick={() => (p ? routeTo(p) : me && setDraft({ point: me, name: label, kind }))}
                        className="h-16 rounded-2xl bg-surface px-3 flex items-center gap-3 text-start"
                      >
                        <span className="w-10 h-10 rounded-xl bg-ink text-accent flex items-center justify-center shrink-0">
                          <Icon className="w-5 h-5" />
                        </span>
                        <span className="min-w-0">
                          <span className="block font-extrabold">{label}</span>
                          <span className="block text-xs text-muted truncate">{p ? p.name : set}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
                {favs.length > 0 && (
                  <ul className="mt-2 divide-y divide-border">
                    {favs.map((p) => (
                      <li key={p.id} className="flex items-center gap-3 py-2.5">
                        <Star className="w-5 h-5 fill-accent text-accent shrink-0" />
                        <button onClick={() => routeTo(p)} className="flex-1 text-start font-bold truncate">
                          {p.name}
                        </button>
                        <button onClick={() => (placeStore.remove(p.id), refresh())} aria-label="delete" className="w-8 h-8 rounded-lg text-muted flex items-center justify-center">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <p className="text-xs text-muted mt-2 flex items-center gap-1">
                  <Plus className="w-3.5 h-3.5" />
                  {tx.addHint}
                </p>
              </div>

              <div>
                <h2 className="font-extrabold mb-2">{tx.trips}</h2>
                {recent.length === 0 ? (
                  <p className="text-sm text-muted">{tx.noTrips}</p>
                ) : (
                  <ul className="divide-y divide-border">
                    {recent.slice(0, 8).map((t) => (
                      <li key={t.id} className="flex items-center gap-3 py-2.5">
                        <RouteIcon className="w-5 h-5 text-muted shrink-0" />
                        <button onClick={() => (setActive(t), setFitKey((k) => k + 1))} className="flex-1 min-w-0 text-start">
                          <span className="block font-bold truncate">{t.toName}</span>
                          <span className="block text-xs text-muted">
                            {t.km.toFixed(1)} {tx.km} · {Math.round(t.min)} {tx.min}
                          </span>
                        </button>
                        <button onClick={() => (tripStore.remove(t.id), refresh())} aria-label="delete" className="w-8 h-8 rounded-lg text-muted flex items-center justify-center">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <button onClick={saveArea} disabled={!!dl} className={btn({ variant: 'dark', full: true })}>
                <CloudDownload className="w-5 h-5 text-accent" />
                {dl ? `${tx.downloading} ${Math.round((dl.done / Math.max(dl.total, 1)) * 100)}%` : tx.download}
              </button>
              {used !== null && (
                <p className="text-xs text-muted text-center -mt-2">
                  {tx.used}: {used} MB
                </p>
              )}
            </>
          )}
        </div>
      </section>
      {toastNode}
    </main>
  );
}
