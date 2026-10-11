// Turn-by-turn helpers: progress along a route, off-route detection and spoken instructions.
import type { LatLng, RouteStep } from './maps';

const R = 6371000;
const rad = (d: number) => (d * Math.PI) / 180;

/** metres between two points */
export function metres(a: LatLng, b: LatLng) {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** compass bearing from a to b, degrees */
export function bearing(a: LatLng, b: LatLng) {
  const y = Math.sin(rad(b.lng - a.lng)) * Math.cos(rad(b.lat));
  const x = Math.cos(rad(a.lat)) * Math.sin(rad(b.lat)) - Math.sin(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.cos(rad(b.lng - a.lng));
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

/** distance (m) from p to segment ab, using a local flat projection (fine at street scale) */
function toSegment(p: LatLng, a: LatLng, b: LatLng) {
  const k = Math.cos(rad(p.lat));
  const ax = a.lng * k, ay = a.lat, bx = b.lng * k, by = b.lat, px = p.lng * k, py = p.lat;
  const dx = bx - ax, dy = by - ay;
  const len = dx * dx + dy * dy;
  const t = len ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len)) : 0;
  const q = { lat: ay + t * dy, lng: (ax + t * dx) / k };
  return { d: metres(p, q), t };
}

export type NavPlan = {
  pts: LatLng[];
  /** cumulative metres at each point */
  cum: number[];
  total: number;
  steps: (RouteStep & { idx: number })[];
};

export function makePlan(path: [number, number][], steps: RouteStep[] = []): NavPlan {
  const pts = path.map(([lat, lng]) => ({ lat, lng }));
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + metres(pts[i - 1], pts[i]));
  // pin every maneuver to the closest point of the (possibly thinned) path, keeping order
  let from = 0;
  const pinned = steps
    .filter((s) => Array.isArray(s.loc) && Number.isFinite(s.loc[0]))
    .map((s) => {
      const loc = { lat: s.loc[0], lng: s.loc[1] };
      let best = from, bestD = Infinity;
      for (let i = from; i < pts.length; i++) {
        const d = metres(loc, pts[i]);
        if (d < bestD) (bestD = d), (best = i);
        if (bestD < 5) break;
      }
      from = best;
      return { ...s, idx: best };
    });
  return { pts, cum, total: cum[cum.length - 1] ?? 0, steps: pinned };
}

export type Progress = {
  /** metres off the route line */
  off: number;
  /** metres travelled along the route */
  along: number;
  remaining: number;
  /** next maneuver (undefined once only the arrival is left) */
  next?: NavPlan['steps'][number];
  toNext: number;
  /** the maneuver after next, for "then …" */
  after?: NavPlan['steps'][number];
  seg: number;
};

/** Where are we on the plan? `hint` = last segment index, so the search stays local and never jumps back. */
export function progress(plan: NavPlan, p: LatLng, hint = 0): Progress {
  const { pts, cum } = plan;
  if (pts.length < 2) return { off: 0, along: 0, remaining: 0, toNext: 0, seg: 0 };
  let best = { d: Infinity, seg: hint, t: 0 };
  const lo = Math.max(0, hint - 5);
  const hi = Math.min(pts.length - 1, hint + 150);
  for (let i = lo; i < hi; i++) {
    const r = toSegment(p, pts[i], pts[i + 1]);
    if (r.d < best.d) best = { d: r.d, seg: i, t: r.t };
  }
  // lost track (e.g. GPS jump): search the whole line once
  if (best.d > 120) {
    for (let i = 0; i < pts.length - 1; i++) {
      const r = toSegment(p, pts[i], pts[i + 1]);
      if (r.d < best.d) best = { d: r.d, seg: i, t: r.t };
    }
  }
  const along = cum[best.seg] + (cum[best.seg + 1] - cum[best.seg]) * best.t;
  const k = plan.steps.findIndex((s, i) => i > 0 && cum[s.idx] > along + 3);
  const next = k >= 0 ? plan.steps[k] : undefined;
  const after = k >= 0 ? plan.steps[k + 1] : undefined;
  return {
    off: best.d,
    along,
    remaining: Math.max(0, plan.total - along),
    next,
    after,
    toNext: next ? Math.max(0, cum[next.idx] - along) : Math.max(0, plan.total - along),
    seg: best.seg,
  };
}

// ---------------------------------------------------------------- words
type Lang = 'ar' | 'en' | 'ku' | 'tr';
const W: Record<Lang, Record<string, string>> = {
  ar: {
    left: 'انعطف يسارًا', right: 'انعطف يمينًا', slightLeft: 'خذ يسارًا قليلًا', slightRight: 'خذ يمينًا قليلًا', sharpLeft: 'انعطف يسارًا بحدّة', sharpRight: 'انعطف يمينًا بحدّة',
    straight: 'استمر بشكل مستقيم', uturn: 'استدر للخلف', round: 'في الدوّار خذ المخرج', arrive: 'وصلت إلى وجهتك', depart: 'انطلق', onto: 'إلى', in: 'بعد', m: 'متر', km: 'كيلومتر', then: 'ثم',
    keepLeft: 'ابقَ على اليسار', keepRight: 'ابقَ على اليمين', merge: 'اندمج', ramp: 'خذ المخرج',
  },
  en: {
    left: 'Turn left', right: 'Turn right', slightLeft: 'Bear left', slightRight: 'Bear right', sharpLeft: 'Sharp left', sharpRight: 'Sharp right',
    straight: 'Continue straight', uturn: 'Make a U-turn', round: 'At the roundabout, take exit', arrive: 'You have arrived', depart: 'Head out', onto: 'onto', in: 'In', m: 'metres', km: 'kilometres', then: 'then',
    keepLeft: 'Keep left', keepRight: 'Keep right', merge: 'Merge', ramp: 'Take the ramp',
  },
  ku: {
    left: 'بپێچەوە بۆ چەپ', right: 'بپێچەوە بۆ ڕاست', slightLeft: 'کەمێک بۆ چەپ', slightRight: 'کەمێک بۆ ڕاست', sharpLeft: 'بە توندی بۆ چەپ', sharpRight: 'بە توندی بۆ ڕاست',
    straight: 'ڕاستەوخۆ بڕۆ', uturn: 'بگەڕێوە', round: 'لە فلکەکە دەرچەی', arrive: 'گەیشتیت', depart: 'دەست پێبکە', onto: 'بۆ', in: 'دوای', m: 'مەتر', km: 'کیلۆمەتر', then: 'پاشان',
    keepLeft: 'لە چەپ بمێنەوە', keepRight: 'لە ڕاست بمێنەوە', merge: 'تێکەڵ ببە', ramp: 'دەرچەکە بگرە',
  },
  tr: {
    left: 'Sola dön', right: 'Sağa dön', slightLeft: 'Hafif sola', slightRight: 'Hafif sağa', sharpLeft: 'Keskin sola', sharpRight: 'Keskin sağa',
    straight: 'Düz devam et', uturn: 'U dönüşü yap', round: 'Dönelde çıkışı al:', arrive: 'Varış noktasına ulaştın', depart: 'Yola çık', onto: '→', in: '', m: 'metre', km: 'kilometre', then: 'sonra',
    keepLeft: 'Soldan devam et', keepRight: 'Sağdan devam et', merge: 'Katıl', ramp: 'Rampaya gir',
  },
};

export type Turn = 'left' | 'right' | 'slightLeft' | 'slightRight' | 'sharpLeft' | 'sharpRight' | 'straight' | 'uturn' | 'round' | 'arrive' | 'depart';

export function turnOf(s?: RouteStep): Turn {
  if (!s) return 'arrive';
  if (s.type === 'arrive') return 'arrive';
  if (s.type === 'depart') return 'depart';
  if (s.type === 'roundabout' || s.type === 'rotary' || s.type === 'roundabout turn') return 'round';
  switch (s.modifier) {
    case 'left': return 'left';
    case 'right': return 'right';
    case 'slight left': return 'slightLeft';
    case 'slight right': return 'slightRight';
    case 'sharp left': return 'sharpLeft';
    case 'sharp right': return 'sharpRight';
    case 'uturn': return 'uturn';
    default: return 'straight';
  }
}

export function instruction(s: RouteStep | undefined, lang: string) {
  const w = W[(lang as Lang) in W ? (lang as Lang) : 'en'];
  const t = turnOf(s);
  if (!s || t === 'arrive') return w.arrive;
  let base = w[t] ?? w.straight;
  if (s.type === 'fork' || s.type === 'end of road') base = s.modifier?.includes('left') ? w.keepLeft : s.modifier?.includes('right') ? w.keepRight : base;
  if (s.type === 'merge') base = w.merge;
  if (t === 'round') base = `${base} ${s.exit ?? 1}`;
  return base;
}

export function distanceWords(m: number, lang: string) {
  const w = W[(lang as Lang) in W ? (lang as Lang) : 'en'];
  if (m >= 1000) return `${(m / 1000).toFixed(m >= 10000 ? 0 : 1)} ${w.km}`;
  const r = m > 300 ? Math.round(m / 100) * 100 : m > 50 ? Math.round(m / 10) * 10 : Math.round(m);
  return `${r} ${w.m}`;
}

/** short distance label for the banner: "350 م" / "1.2 كم" */
export function distanceShort(m: number, lang: string) {
  const ar = lang === 'ar' || lang === 'ku';
  if (m >= 1000) return `${(m / 1000).toFixed(m >= 10000 ? 0 : 1)} ${ar ? 'كم' : 'km'}`;
  const r = m > 300 ? Math.round(m / 50) * 50 : Math.round(m / 10) * 10;
  return `${Math.max(r, 0)} ${ar ? 'م' : 'm'}`;
}

export function spoken(s: RouteStep | undefined, dist: number, lang: string) {
  const w = W[(lang as Lang) in W ? (lang as Lang) : 'en'];
  const what = instruction(s, lang);
  if (!s || s.type === 'arrive') return dist < 40 ? w.arrive : `${w.in} ${distanceWords(dist, lang)} ${w.arrive}`.trim();
  const street = s.name ? ` ${w.onto} ${s.name}` : '';
  return dist < 40 ? `${what}${street}` : `${w.in} ${distanceWords(dist, lang)}، ${what}${street}`.replace('، ', lang === 'ar' || lang === 'ku' ? '، ' : ', ').trim();
}

const VOICE_LANG: Record<string, string> = { ar: 'ar-SA', en: 'en-US', ku: 'ar-IQ', tr: 'tr-TR' };

export function say(text: string, lang: string) {
  try {
    const synth = window.speechSynthesis;
    if (!synth) return;
    const u = new SpeechSynthesisUtterance(text);
    const want = VOICE_LANG[lang] ?? 'en-US';
    u.lang = want;
    const v = synth.getVoices().find((x) => x.lang === want) ?? synth.getVoices().find((x) => x.lang.startsWith(want.slice(0, 2)));
    if (v) u.voice = v;
    u.rate = 1;
    synth.cancel();
    synth.speak(u);
  } catch {
    /* no speech on this device */
  }
}
