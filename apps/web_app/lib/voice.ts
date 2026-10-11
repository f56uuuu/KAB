'use client';

// Voice commands for the map: speech → text (browser speech recognition) → an action.
import type { ReportKind } from './reports';

const LOCALE: Record<string, string> = { ar: 'ar-IQ', en: 'en-US', ku: 'ckb-IQ', tr: 'tr-TR' };

export function voiceSupported() {
  return typeof window !== 'undefined' && !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
}

/** Listen once; resolves with what was said ('' if nothing). */
export function listen(lang: string, onInterim?: (t: string) => void): { done: Promise<string>; stop: () => void } {
  const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  const r = new SR();
  r.lang = LOCALE[lang] ?? 'ar-IQ';
  r.interimResults = true;
  r.maxAlternatives = 1;
  r.continuous = false;
  let text = '';
  const done = new Promise<string>((resolve) => {
    r.onresult = (e: any) => {
      text = Array.from(e.results)
        .map((x: any) => x[0].transcript)
        .join(' ')
        .trim();
      onInterim?.(text);
    };
    r.onerror = () => resolve(text);
    r.onend = () => resolve(text);
  });
  try {
    r.start();
  } catch {
    /* already listening */
  }
  return { done, stop: () => r.stop() };
}

export type VoiceCommand =
  | { type: 'go'; place: 'home' | 'work' }
  | { type: 'report'; kind: ReportKind }
  | { type: 'end' }
  | { type: 'mute' }
  | { type: 'unmute' }
  | { type: 'search'; query: string };

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
    .replace(/[إأآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const REPORTS: [ReportKind, RegExp][] = [
  ['police', /شرطه|سيطره|مفرزه|police|polis|پۆلیس/],
  ['accident', /حادث|تصادم|دعمه|accident|crash|kaza|ڕووداو/],
  ['traffic', /زحام|ازدحام|زحمه|traffic|trafik|قەرەباڵغی/],
  ['closure', /طريق مغلق|مسدود|مغلق|road closed|closure|yol kapal/],
  ['hazard', /خطر|حفره|طسه|hazard|danger|tehlike|مەترسی/],
  ['weather', /مطر|عاصفه|غبار|ضباب|weather|rain|storm|fog/],
  ['animal', /حيوان|بقره|غنم|كلب|animal|hayvan/],
  ['help', /ساعدني|مساعده|عطل|عطلان|help|yardım/],
];

/** Understands short commands in Arabic (incl. Iraqi dialect), English, Kurdish and Turkish. */
export function parseCommand(said: string): VoiceCommand | null {
  const t = norm(said);
  if (!t) return null;
  if (/^(بلغ|ابلغ|تبليغ|report|bildir)/.test(t) || /بلغ عن|report a?/.test(t)) {
    for (const [kind, re] of REPORTS) if (re.test(t)) return { type: 'report', kind };
  }
  for (const [kind, re] of REPORTS) if (re.test(t) && t.split(' ').length <= 3) return { type: 'report', kind };
  if (/(^| )(انهاء|انهي|اوقف|وقف|بطل|خلص|stop|end|cancel|bitir)( |$)/.test(t)) return { type: 'end' };
  if (/كتم|اسكت|بدون صوت|mute|sessiz/.test(t) && !/الغ|unmute/.test(t)) return { type: 'mute' };
  if (/شغل الصوت|ارجع الصوت|unmute|sesi aç/.test(t)) return { type: 'unmute' };
  if (/(البيت|بيتي|للبيت|المنزل|home|eve|ماڵ)/.test(t)) return { type: 'go', place: 'home' };
  if (/(العمل|الشغل|للشغل|الدوام|للدوام|work|office|işe|کار)/.test(t)) return { type: 'go', place: 'work' };
  const query = said
    .replace(/^(خذني|وديني|ودّيني|روح|اريد اروح|اريد سياره|اريد|ابي|navigate|take me|go|drive)( (الى|إلى|ل|لـ|على|to))?/i, '')
    .trim();
  return { type: 'search', query: query || said.trim() };
}
