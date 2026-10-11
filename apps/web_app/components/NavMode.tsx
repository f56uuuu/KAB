'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUp, ArrowUpLeft, ArrowUpRight, CornerUpLeft, CornerUpRight, Flag, RotateCw, Undo2, Volume2, VolumeX, X } from 'lucide-react';
import { KapMap, type MapMarker } from '@/components/KapMap';
import { ReportButton, ReportSheet } from '@/components/ReportSheet';
import { btn } from '@/components/ui';
import { useI18n } from '@/lib/i18n';
import { mapProvider, type LatLng, type RouteStep } from '@/lib/maps';
import { bearing, distanceShort, instruction, makePlan, metres, progress, say, spoken, turnOf, type NavPlan, type Turn } from '@/lib/nav';
import { flushReports, REPORT_EMOJI, reportsNear, reportTxt, type ReportKind, type RoadReport } from '@/lib/reports';

const TXT = {
  ar: { end: 'إنهاء', arrive: 'الوصول', min: 'د', km: 'كم', kmh: 'كم/س', arrived: 'وصلت! 🎉', arrivedSub: 'وصلت إلى', done: 'تم', rerouting: 'نعيد حساب الطريق…', follow: 'اتبع الخط الأصفر', toward: 'باتجاه', then: 'ثم', gps: 'نبحث عن إشارة GPS…', mute: 'كتم الصوت', unmute: 'تشغيل الصوت', offline: 'بدون إنترنت — نكمل على المسار المحفوظ' },
  en: { end: 'End', arrive: 'Arrival', min: 'min', km: 'km', kmh: 'km/h', arrived: 'You’ve arrived! 🎉', arrivedSub: 'You reached', done: 'Done', rerouting: 'Finding a new route…', follow: 'Follow the yellow line', toward: 'Toward', then: 'Then', gps: 'Looking for GPS…', mute: 'Mute', unmute: 'Unmute', offline: 'Offline — following your saved route' },
  ku: { end: 'کۆتایی', arrive: 'گەیشتن', min: 'خ', km: 'کم', kmh: 'کم/ک', arrived: 'گەیشتیت! 🎉', arrivedSub: 'گەیشتیتە', done: 'باشە', rerouting: 'ڕێگای نوێ دەدۆزینەوە…', follow: 'هێڵە زەردەکە بگرە', toward: 'بەرەو', then: 'پاشان', gps: 'بەدوای GPS دەگەڕێین…', mute: 'بێدەنگ', unmute: 'دەنگ', offline: 'بێ ئینتەرنێت — لەسەر ڕێگای پاشەکەوتکراو بەردەوامین' },
  tr: { end: 'Bitir', arrive: 'Varış', min: 'dk', km: 'km', kmh: 'km/s', arrived: 'Vardın! 🎉', arrivedSub: 'Ulaştığın yer', done: 'Tamam', rerouting: 'Yeni rota bulunuyor…', follow: 'Sarı çizgiyi takip et', toward: 'Yön', then: 'Sonra', gps: 'GPS aranıyor…', mute: 'Sesi kapat', unmute: 'Sesi aç', offline: 'Çevrimdışı — kayıtlı rotan izleniyor' },
};

const TURN_ICON: Record<Turn, typeof ArrowUp> = {
  left: CornerUpLeft,
  right: CornerUpRight,
  sharpLeft: CornerUpLeft,
  sharpRight: CornerUpRight,
  slightLeft: ArrowUpLeft,
  slightRight: ArrowUpRight,
  straight: ArrowUp,
  depart: ArrowUp,
  uturn: Undo2,
  round: RotateCw,
  arrive: Flag,
};

export type NavTarget = { lat: number; lng: number; name: string };
export type NavRoute = { path: [number, number][]; steps?: RouteStep[]; km: number; min: number };

const MUTE_KEY = 'kap_nav_muted';

/** Full-screen, Waze-style turn-by-turn navigation inside KAP. */
export function NavMode({ target, route, onExit, onRoute, toast }: { target: NavTarget; route: NavRoute; onExit: () => void; onRoute?: (r: NavRoute) => void; toast: (m: string) => void }) {
  const { lang, dir } = useI18n();
  const tx = TXT[lang as keyof typeof TXT] ?? TXT.en;
  const [plan, setPlan] = useState<NavPlan>(() => makePlan(route.path, route.steps));
  const [baseMin, setBaseMin] = useState(route.min);
  const [pos, setPos] = useState<LatLng | null>(null);
  const [speed, setSpeed] = useState(0);
  const [head, setHead] = useState<number | undefined>(undefined);
  const [muted, setMuted] = useState(false);
  const [arrived, setArrived] = useState(false);
  const [rerouting, setRerouting] = useState(false);
  const [online, setOnline] = useState(true);
  const [reports, setReports] = useState<RoadReport[]>([]);
  const [reportOpen, setReportOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const seg = useRef(0);
  const offCount = useRef(0);
  const lastReroute = useRef(0);
  const lastFix = useRef<LatLng | null>(null);
  const spokenKeys = useRef(new Set<string>());
  const mutedRef = useRef(muted);
  mutedRef.current = muted;

  const speak = useCallback((text: string) => !mutedRef.current && say(text, lang), [lang]);

  useEffect(() => {
    try {
      setMuted(localStorage.getItem(MUTE_KEY) === '1');
    } catch {
      /* storage blocked */
    }
    setOnline(navigator.onLine);
    const on = () => (setOnline(true), flushReports());
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    const clock = setInterval(() => setNow(Date.now()), 30000);
    // keep the screen awake while navigating
    let lock: any = null;
    const wake = async () => {
      try {
        lock = await (navigator as any).wakeLock?.request('screen');
      } catch {
        /* not supported */
      }
    };
    wake();
    const vis = () => document.visibilityState === 'visible' && wake();
    document.addEventListener('visibilitychange', vis);
    flushReports();
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
      document.removeEventListener('visibilitychange', vis);
      clearInterval(clock);
      lock?.release?.().catch?.(() => {});
      try {
        window.speechSynthesis?.cancel();
      } catch {
        /* none */
      }
    };
  }, []);

  // live GPS
  useEffect(() => {
    if (!navigator.geolocation) return;
    const id = navigator.geolocation.watchPosition(
      (p) => {
        const here = { lat: p.coords.latitude, lng: p.coords.longitude };
        const prev = lastFix.current;
        const moved = prev ? metres(prev, here) : 0;
        if (p.coords.speed != null && p.coords.speed >= 0) setSpeed(p.coords.speed * 3.6);
        if (p.coords.heading != null && !Number.isNaN(p.coords.heading) && (p.coords.speed ?? 0) > 1.5) setHead(p.coords.heading);
        else if (prev && moved > 8) setHead(bearing(prev, here));
        if (!prev || moved > 2) lastFix.current = here;
        setPos(here);
      },
      (e) => e.code === 1 && toast(tx.gps),
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 15000 },
    );
    return () => navigator.geolocation.clearWatch(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const prog = useMemo(() => (pos ? progress(plan, pos, seg.current) : null), [plan, pos]);

  // follow the route: voice, off-route, arrival
  useEffect(() => {
    if (!pos || !prog || arrived) return;
    seg.current = prog.seg;
    if (metres(pos, target) < 30 || (plan.total > 0 && prog.remaining < 25 && prog.off < 40)) {
      setArrived(true);
      speak(instruction(undefined, lang));
      return;
    }
    // spoken instructions at ~500 m, ~150 m and at the turn
    const key = prog.next ? `${prog.next.idx}` : 'end';
    const band = prog.toNext < 35 ? 'now' : prog.toNext < 180 ? 'near' : prog.toNext < 550 ? 'far' : null;
    if (band && prog.off < 45 && !spokenKeys.current.has(`${key}:${band}`)) {
      spokenKeys.current.add(`${key}:${band}`);
      if (band === 'far') spokenKeys.current.add(`${key}:far`);
      if (!(band === 'far' && prog.next && prog.next.km < 0.4)) speak(spoken(prog.next, band === 'now' ? 0 : prog.toNext, lang));
    }
    // off the line → new route
    if (prog.off > 45) offCount.current += 1;
    else offCount.current = 0;
    if (offCount.current >= 3 && navigator.onLine && Date.now() - lastReroute.current > 12000) {
      lastReroute.current = Date.now();
      offCount.current = 0;
      setRerouting(true);
      mapProvider
        .route(pos, target)
        .then((r) => {
          if (r?.path?.length) {
            seg.current = 0;
            spokenKeys.current.clear();
            setPlan(makePlan(r.path, r.steps));
            setBaseMin(r.durationMin);
            onRoute?.({ path: r.path, steps: r.steps, km: r.distanceKm, min: r.durationMin });
          }
        })
        .catch(() => {})
        .finally(() => setRerouting(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pos, prog]);

  // road reports around us
  useEffect(() => {
    if (!pos) return;
    let stop = false;
    const load = () => reportsNear(pos, 25).then((r) => !stop && setReports(r));
    load();
    const iv = setInterval(load, 90000);
    return () => {
      stop = true;
      clearInterval(iv);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!pos]);

  // the closest report lying on the road ahead (within 800 m)
  const ahead = useMemo(() => {
    if (!pos || !prog || !reports.length) return null;
    let best: { r: RoadReport; d: number } | null = null;
    for (const r of reports) {
      const d = metres(pos, r);
      if (d > 800) continue;
      const pr = progress(plan, r, prog.seg);
      if (pr.off > 40 || pr.along < prog.along) continue;
      const along = pr.along - prog.along;
      if (!best || along < best.d) best = { r, d: along };
    }
    return best;
  }, [pos, prog, reports, plan]);

  useEffect(() => {
    if (!ahead) return;
    const k = `rep:${ahead.r.id}`;
    if (ahead.d < 500 && !spokenKeys.current.has(k)) {
      spokenKeys.current.add(k);
      const rt = reportTxt(lang);
      speak(`${rt.kinds[ahead.r.kind as ReportKind]}، ${rt.ahead} ${distanceShort(ahead.d, lang)}`);
    }
  }, [ahead, lang, speak]);

  const remainingRoute = useMemo<[number, number][] | null>(() => {
    if (!plan.pts.length) return null;
    const rest = plan.pts.slice((prog?.seg ?? 0) + 1).map((p) => [p.lat, p.lng] as [number, number]);
    return pos && prog && prog.off < 45 ? [[pos.lat, pos.lng], ...rest] : plan.pts.map((p) => [p.lat, p.lng] as [number, number]);
  }, [plan, prog, pos]);

  const markers = useMemo<MapMarker[]>(() => {
    const m: MapMarker[] = reports.map((r) => ({ id: `r${r.id}`, kind: 'report', lat: r.lat, lng: r.lng, emoji: REPORT_EMOJI[r.kind as ReportKind] }));
    m.push({ id: 'dest', kind: 'dropoff', lat: target.lat, lng: target.lng, label: target.name });
    if (pos) m.push({ id: 'me', kind: 'nav', ...pos });
    return m;
  }, [reports, target, pos]);

  const remainingM = prog ? prog.remaining : plan.total;
  const remainingMin = plan.total > 0 ? Math.max(1, Math.round((baseMin * remainingM) / plan.total)) : Math.round(baseMin);
  const eta = new Date(now + remainingMin * 60000).toLocaleTimeString(`${lang}-u-nu-latn`, { hour: 'numeric', minute: '2-digit' });
  const hasSteps = plan.steps.length > 1;
  const turn = hasSteps ? turnOf(prog?.next) : 'straight';
  const Icon = TURN_ICON[turn];
  const ThenIcon = prog?.after && hasSteps ? TURN_ICON[turnOf(prog.after)] : null;
  const zoom = speed > 70 ? 15.5 : speed > 40 ? 16.3 : 17;

  function toggleMute() {
    const v = !muted;
    setMuted(v);
    try {
      localStorage.setItem(MUTE_KEY, v ? '1' : '0');
      if (v) window.speechSynthesis?.cancel();
    } catch {
      /* none */
    }
  }

  return (
    <div className="fixed inset-0 z-[1000] bg-background" dir={dir}>
      <KapMap
        className="absolute inset-0"
        markers={markers}
        route={remainingRoute}
        center={pos ?? target}
        follow={pos ? { ...pos, bearing: head ?? 0, zoom } : null}
        bottomInset={130}
        fitKey="nav"
      />

      {/* instruction banner */}
      <div className="absolute top-0 inset-x-0 z-[10] safe-top px-3 pt-2 flex flex-col gap-2 max-w-lg mx-auto pointer-events-none">
        <div className="rounded-[22px] bg-ink text-white shadow-float flex items-stretch overflow-hidden pointer-events-auto">
          <div className="w-[86px] shrink-0 bg-accent text-ink flex items-center justify-center" dir="ltr">
            <Icon className="w-12 h-12" strokeWidth={2.8} />
          </div>
          <div className="flex-1 min-w-0 px-4 py-3">
            {!pos ? (
              <p className="text-lg font-black">{tx.gps}</p>
            ) : rerouting ? (
              <p className="text-lg font-black">{tx.rerouting}</p>
            ) : hasSteps ? (
              <>
                <p className="text-[32px] leading-none font-black tracking-tight" dir="ltr" style={{ textAlign: dir === 'rtl' ? 'right' : 'left' }}>
                  {distanceShort(prog?.toNext ?? 0, lang)}
                </p>
                <p className="text-base font-bold mt-1 truncate">
                  {instruction(prog?.next, lang)}
                  {prog?.next?.name ? <span className="text-white/70"> · {prog.next.name}</span> : null}
                </p>
              </>
            ) : (
              <>
                <p className="text-[28px] leading-none font-black" dir="ltr" style={{ textAlign: dir === 'rtl' ? 'right' : 'left' }}>
                  {distanceShort(remainingM, lang)}
                </p>
                <p className="text-base font-bold mt-1 truncate">
                  {tx.follow} · {target.name}
                </p>
              </>
            )}
          </div>
        </div>
        <div className="flex items-start gap-2">
          {ThenIcon && prog && prog.toNext < 400 && (
            <div className="rounded-full bg-ink/90 text-white text-sm font-bold ps-3 pe-2 h-9 flex items-center gap-1.5 shadow-float pointer-events-auto">
              {tx.then}
              <span dir="ltr" className="flex">
                <ThenIcon className="w-5 h-5 text-accent" strokeWidth={2.8} />
              </span>
            </div>
          )}
          {ahead && (
            <div className="rounded-full bg-background text-fg text-sm font-bold px-3 h-9 flex items-center gap-1.5 shadow-float pointer-events-auto animate-slide-up">
              <span className="text-lg leading-none">{REPORT_EMOJI[ahead.r.kind as ReportKind]}</span>
              {reportTxt(lang).kinds[ahead.r.kind as ReportKind]}
              <span className="text-muted" dir="ltr">
                {distanceShort(ahead.d, lang)}
              </span>
            </div>
          )}
          <button
            onClick={toggleMute}
            aria-label={muted ? tx.unmute : tx.mute}
            className="ms-auto w-12 h-12 rounded-full bg-background text-fg shadow-float flex items-center justify-center pointer-events-auto"
          >
            {muted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
          </button>
        </div>
        {!online && <div className="self-center rounded-full bg-ink text-white text-xs font-bold px-3 py-1.5 pointer-events-auto">{tx.offline}</div>}
      </div>

      {/* speed + report */}
      <div dir="ltr" className="absolute inset-x-0 z-[10] px-4 flex items-end justify-between pointer-events-none" style={{ bottom: 'calc(118px + env(safe-area-inset-bottom))' }}>
        <div className="w-[76px] h-[76px] rounded-full bg-ink text-white border-4 border-white/90 shadow-float flex flex-col items-center justify-center pointer-events-auto" aria-live="off">
          <span className="text-[28px] leading-none font-black" dir="ltr">
            {pos ? Math.round(speed) : '–'}
          </span>
          <span className="text-[10px] font-bold text-white/70">{tx.kmh}</span>
        </div>
        <ReportButton onClick={() => setReportOpen(true)} className="pointer-events-auto" />
      </div>

      {/* trip summary */}
      <div className="absolute bottom-0 inset-x-0 z-[10] bg-background rounded-t-sheet shadow-sheet safe-bottom">
        <div className="max-w-lg mx-auto px-5 pt-3 pb-3 flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-2xl font-black leading-tight">
              <span dir="ltr">{remainingMin}</span> {tx.min}
            </p>
            <p className="text-sm text-muted font-bold truncate">
              <span dir="ltr">{(remainingM / 1000).toFixed(1)}</span> {tx.km} · {tx.arrive} <span dir="ltr">{eta}</span>
            </p>
          </div>
          <button onClick={onExit} className={`${btn({ variant: 'dangerSolid', size: 'md' })} !px-5`}>
            <X className="w-5 h-5" />
            {tx.end}
          </button>
        </div>
      </div>

      {arrived && (
        <div className="absolute inset-0 z-[20] bg-black/40 flex items-end justify-center animate-tour-fade">
          <div className="w-full max-w-md bg-background rounded-t-sheet shadow-sheet safe-bottom px-6 pt-6 pb-4 text-center animate-slide-up">
            <p className="text-5xl mb-2">🏁</p>
            <h2 className="text-2xl font-black">{tx.arrived}</h2>
            <p className="text-muted mt-1">
              {tx.arrivedSub} {target.name}
            </p>
            <button onClick={onExit} className={`${btn({ full: true })} mt-5`}>
              {tx.done}
            </button>
          </div>
        </div>
      )}

      <ReportSheet
        open={reportOpen}
        at={pos}
        onClose={() => setReportOpen(false)}
        onDone={(msg, kind) => {
          setReportOpen(false);
          toast(msg);
          if (kind && pos) setReports((r) => [{ id: `local-${Date.now()}`, kind, lat: pos.lat, lng: pos.lng }, ...r]);
        }}
      />
    </div>
  );
}
