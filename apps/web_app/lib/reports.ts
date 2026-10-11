'use client';

// Road reports (Waze-style): drivers flag traffic, police, accidents… for everyone nearby.
import { sb } from './hooks';
import type { LatLng } from './maps';

export type ReportKind = 'traffic' | 'police' | 'accident' | 'hazard' | 'closure' | 'lane' | 'map' | 'weather' | 'fuel' | 'animal' | 'help' | 'place';
export type RoadReport = { id: number | string; kind: ReportKind; lat: number; lng: number; note?: string | null; confirms?: number; created_at?: string };

export const REPORT_KINDS: { kind: ReportKind; emoji: string; tint: string }[] = [
  { kind: 'traffic', emoji: '🚗', tint: '#FFE9E5' },
  { kind: 'police', emoji: '👮', tint: '#E6EEFF' },
  { kind: 'accident', emoji: '💥', tint: '#FFE9E5' },
  { kind: 'hazard', emoji: '⚠️', tint: '#FFF6D6' },
  { kind: 'closure', emoji: '🚧', tint: '#FFF0E0' },
  { kind: 'lane', emoji: '🦺', tint: '#FFF0E0' },
  { kind: 'map', emoji: '🗺️', tint: '#EEF0F3' },
  { kind: 'weather', emoji: '⛈️', tint: '#E8F1FA' },
  { kind: 'fuel', emoji: '⛽', tint: '#E5F6EA' },
  { kind: 'animal', emoji: '🐄', tint: '#F6EDE4' },
  { kind: 'help', emoji: '🆘', tint: '#FFE9E5' },
  { kind: 'place', emoji: '📍', tint: '#F0E9FF' },
];
export const REPORT_EMOJI = Object.fromEntries(REPORT_KINDS.map((k) => [k.kind, k.emoji])) as Record<ReportKind, string>;

export const REPORT_TXT = {
  ar: {
    title: 'ماذا ترى؟', thanks: 'شكرًا! وصل بلاغك للسائقين القريبين', queued: 'بدون إنترنت — سنرسل البلاغ عند عودة الاتصال', failed: 'تعذّر الإرسال، حاول مرة أخرى', login: 'سجّل الدخول للإبلاغ', ahead: 'أمامك', note: 'ملاحظة (اختياري)', send: 'إبلاغ', report: 'إبلاغ',
    kinds: { traffic: 'ازدحام', police: 'شرطة', accident: 'حادث', hazard: 'خطر على الطريق', closure: 'طريق مغلق', lane: 'مسار مغلق', map: 'خطأ في الخريطة', weather: 'طقس سيئ', fuel: 'محطة وقود', animal: 'حيوان على الطريق', help: 'أحتاج مساعدة', place: 'مكان جديد' },
  },
  en: {
    title: 'What do you see?', thanks: 'Thanks! Drivers nearby will see your report', queued: 'Offline — we’ll send it when you’re back online', failed: 'Couldn’t send, try again', login: 'Sign in to report', ahead: 'Ahead', note: 'Note (optional)', send: 'Report', report: 'Report',
    kinds: { traffic: 'Traffic', police: 'Police', accident: 'Crash', hazard: 'Hazard', closure: 'Road closed', lane: 'Lane closed', map: 'Map issue', weather: 'Bad weather', fuel: 'Fuel station', animal: 'Animal', help: 'Need help', place: 'New place' },
  },
  ku: {
    title: 'چی دەبینیت؟', thanks: 'سوپاس! شۆفێرە نزیکەکان ڕاپۆرتەکەت دەبینن', queued: 'بێ ئینتەرنێت — کاتێک گەڕایەوە دەینێرین', failed: 'نەنێردرا، دووبارە هەوڵ بدە', login: 'بۆ ڕاپۆرت بچۆ ژوورەوە', ahead: 'لە پێشتە', note: 'تێبینی (ئارەزوومەندانە)', send: 'ڕاپۆرت', report: 'ڕاپۆرت',
    kinds: { traffic: 'قەرەباڵغی', police: 'پۆلیس', accident: 'ڕووداو', hazard: 'مەترسی', closure: 'ڕێگا داخراوە', lane: 'هێڵ داخراوە', map: 'هەڵەی نەخشە', weather: 'کەشی خراپ', fuel: 'بەنزینخانە', animal: 'ئاژەڵ', help: 'یارمەتیم دەوێت', place: 'شوێنی نوێ' },
  },
  tr: {
    title: 'Ne görüyorsun?', thanks: 'Teşekkürler! Yakındaki sürücüler raporunu görecek', queued: 'Çevrimdışı — bağlantı gelince göndereceğiz', failed: 'Gönderilemedi, tekrar dene', login: 'Bildirmek için giriş yap', ahead: 'İleride', note: 'Not (isteğe bağlı)', send: 'Bildir', report: 'Bildir',
    kinds: { traffic: 'Trafik', police: 'Polis', accident: 'Kaza', hazard: 'Tehlike', closure: 'Yol kapalı', lane: 'Şerit kapalı', map: 'Harita hatası', weather: 'Kötü hava', fuel: 'Akaryakıt', animal: 'Hayvan', help: 'Yardım lazım', place: 'Yeni yer' },
  },
};
export function reportTxt(lang: string) {
  return REPORT_TXT[(lang as keyof typeof REPORT_TXT) in REPORT_TXT ? (lang as keyof typeof REPORT_TXT) : 'en'];
}

const QUEUE = 'kap_report_queue_v1';
type Pending = { kind: ReportKind; lat: number; lng: number; note?: string; at: number };

function readQueue(): Pending[] {
  try {
    return JSON.parse(localStorage.getItem(QUEUE) || '[]');
  } catch {
    return [];
  }
}
function writeQueue(q: Pending[]) {
  try {
    localStorage.setItem(QUEUE, JSON.stringify(q.slice(-30)));
  } catch {
    /* storage blocked */
  }
}

async function send(r: Pending) {
  const { error } = await sb().rpc('report_road', { p_kind: r.kind, p_lat: r.lat, p_lng: r.lng, p_note: r.note ?? null });
  if (error) throw error;
}

/** 'sent' | 'queued' (offline, retried later) | 'login' | 'failed' */
export async function submitReport(kind: ReportKind, at: LatLng, note?: string): Promise<'sent' | 'queued' | 'login' | 'failed'> {
  const item: Pending = { kind, lat: at.lat, lng: at.lng, note: note?.trim() || undefined, at: Date.now() };
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    writeQueue([...readQueue(), item]);
    return 'queued';
  }
  try {
    await send(item);
    return 'sent';
  } catch (e: any) {
    const msg = String(e?.message ?? '');
    if (/not_authenticated|JWT/i.test(msg)) return 'login';
    if (/fetch|network/i.test(msg)) {
      writeQueue([...readQueue(), item]);
      return 'queued';
    }
    return 'failed';
  }
}

/** send reports made while offline (older than 2 h are dropped: no longer useful) */
export async function flushReports() {
  const q = readQueue().filter((r) => Date.now() - r.at < 2 * 3600 * 1000);
  if (!q.length) return writeQueue([]);
  const left: Pending[] = [];
  for (const r of q) {
    try {
      await send(r);
    } catch {
      left.push(r);
    }
  }
  writeQueue(left);
}

export async function reportsNear(p: LatLng, km = 25): Promise<RoadReport[]> {
  try {
    const { data, error } = await sb().rpc('road_reports_near', { p_lat: p.lat, p_lng: p.lng, p_km: km });
    if (error) return [];
    return (data as RoadReport[]) ?? [];
  } catch {
    return [];
  }
}
