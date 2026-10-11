'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { KMark } from '@/components/Logo';
import { btn } from '@/components/ui';
import { useI18n } from '@/lib/i18n';

const DONE_KEY = 'kap_tour_v1';
export const TOUR_EVENT = 'kap-tour';

/** Open the tour again from anywhere (e.g. the Account page). */
export function replayTour() {
  try {
    localStorage.removeItem(DONE_KEY);
  } catch {
    /* storage blocked */
  }
  window.dispatchEvent(new Event(TOUR_EVENT));
}

type Step = { target?: string; emoji: string; title: string; body: string };
type Copy = { steps: Step[]; start: string; skip: string; next: string; back: string; finish: string; of: (a: number, b: number) => string };

const COPY: Record<'ar' | 'en' | 'ku' | 'tr', Copy> = {
  ar: {
    start: 'يلا نبدأ',
    skip: 'تخطّي',
    next: 'التالي',
    back: 'رجوع',
    finish: 'ابدأ استخدام كاب',
    of: (a, b) => `${a} من ${b}`,
    steps: [
      { emoji: '👋', title: 'أهلاً بك في كاب!', body: 'جولة سريعة بنصف دقيقة نعرّفك فيها على أهم الأشياء. وعد ما نطوّل 😄' },
      { target: 'where', emoji: '🚕', title: 'وين رايح؟', body: 'اكتب وجهتك من هنا، وتشوف السعر قبل ما تأكّد. بدون مفاجآت.' },
      { target: 'services', emoji: '🍔', title: 'كل شي بمكان واحد', body: 'طعام، توصيل طرود، متجر، وعروض — اضغط أي خدمة وابدأ. الشارة الحمراء تعني في خصم الآن!' },
      { target: 'mymap', emoji: '🗺️', title: 'خرائطك حتى بدون إنترنت', body: 'احفظ بيتك وعملك ومساراتك، ونزّل منطقتك — الخريطة تشتغل حتى لو انقطع النت.' },
      { target: 'nav-activity', emoji: '📍', title: 'تابع كل طلب', body: 'رحلاتك وطلباتك هنا، وتشوف الكابتن على الخريطة لحظة بلحظة.' },
      { target: 'nav-offers', emoji: '🎁', title: 'لا تفوّت العروض', body: 'كوبونات وخصومات جديدة تنتظرك. انسخ الكود واستخدمه عند الدفع.' },
      { emoji: '🎉', title: 'جاهز تنطلق!', body: 'هذا كل شي. أول مشوار عليك يكون أسهل من أي وقت. تقدر تعيد الجولة من صفحة الحساب.' },
    ],
  },
  en: {
    start: 'Let’s go',
    skip: 'Skip',
    next: 'Next',
    back: 'Back',
    finish: 'Start using KAP',
    of: (a, b) => `${a} of ${b}`,
    steps: [
      { emoji: '👋', title: 'Welcome to KAP!', body: 'A 30-second tour of the essentials. We promise to keep it short 😄' },
      { target: 'where', emoji: '🚕', title: 'Where to?', body: 'Type your destination here and see the price before you confirm. No surprises.' },
      { target: 'services', emoji: '🍔', title: 'Everything in one place', body: 'Food, parcels, market and offers — tap any service to start. A red badge means there’s a deal right now!' },
      { target: 'mymap', emoji: '🗺️', title: 'Your map, even offline', body: 'Save home, work and routes, and download your area — the map keeps working without internet.' },
      { target: 'nav-activity', emoji: '📍', title: 'Follow every order', body: 'Your trips and orders live here, with the captain live on the map.' },
      { target: 'nav-offers', emoji: '🎁', title: 'Never miss a deal', body: 'Fresh coupons are waiting. Copy a code and use it at checkout.' },
      { emoji: '🎉', title: 'You’re all set!', body: 'That’s it. Your first ride is easier than ever. You can replay this tour from Account.' },
    ],
  },
  ku: {
    start: 'با دەست پێبکەین',
    skip: 'تێپەڕاندن',
    next: 'دواتر',
    back: 'گەڕانەوە',
    finish: 'دەست بکە بە KAP',
    of: (a, b) => `${a} لە ${b}`,
    steps: [
      { emoji: '👋', title: 'بەخێربێیت بۆ KAP!', body: 'گەشتێکی خێرای نیو خولەکی بۆ گرنگترین شتەکان. بەڵێن دەدەین درێژی نەکەینەوە 😄' },
      { target: 'where', emoji: '🚕', title: 'بۆ کوێ دەچیت؟', body: 'شوێنی مەبەست لێرە بنووسە و نرخەکە ببینە پێش پشتڕاستکردنەوە.' },
      { target: 'services', emoji: '🍔', title: 'هەموو شت لە یەک شوێن', body: 'خواردن، گەیاندن، بازاڕ و ئۆفەر — هەر خزمەتگوزارییەک دابگرە. نیشانەی سوور واتە داشکاندن هەیە!' },
      { target: 'mymap', emoji: '🗺️', title: 'نەخشەکەت بێ ئینتەرنێتیش', body: 'ماڵ و کار و ڕێگاکانت پاشەکەوت بکە و ناوچەکەت دابگرە — بێ ئینتەرنێتیش کار دەکات.' },
      { target: 'nav-activity', emoji: '📍', title: 'هەموو داواکارییەک بەدواداچوون بکە', body: 'گەشت و داواکارییەکانت لێرەن، کاپتن لەسەر نەخشە دەبینیت.' },
      { target: 'nav-offers', emoji: '🎁', title: 'ئۆفەرەکان لەدەست مەدە', body: 'کوپۆنی نوێ چاوەڕێتن. کۆدەکە کۆپی بکە و لە کاتی پارەداندا بەکاری بهێنە.' },
      { emoji: '🎉', title: 'ئامادەیت!', body: 'ئەوە بوو. دەتوانیت لە پەڕەی هەژمارەوە گەشتەکە دووبارە بکەیتەوە.' },
    ],
  },
  tr: {
    start: 'Hadi başlayalım',
    skip: 'Geç',
    next: 'İleri',
    back: 'Geri',
    finish: 'KAP’ı kullanmaya başla',
    of: (a, b) => `${a} / ${b}`,
    steps: [
      { emoji: '👋', title: 'KAP’a hoş geldin!', body: 'Önemli şeylerle 30 saniyelik hızlı bir tur. Kısa tutacağımıza söz 😄' },
      { target: 'where', emoji: '🚕', title: 'Nereye?', body: 'Gideceğin yeri buraya yaz, onaylamadan önce fiyatı gör. Sürpriz yok.' },
      { target: 'services', emoji: '🍔', title: 'Her şey tek yerde', body: 'Yemek, kargo, market ve fırsatlar — bir hizmete dokun ve başla. Kırmızı rozet şu an indirim var demek!' },
      { target: 'mymap', emoji: '🗺️', title: 'Haritan, internetsiz bile', body: 'Ev, iş ve rotalarını kaydet, bölgeni indir — harita internet olmadan da çalışır.' },
      { target: 'nav-activity', emoji: '📍', title: 'Her siparişi takip et', body: 'Yolculukların ve siparişlerin burada, kaptanı haritada canlı gör.' },
      { target: 'nav-offers', emoji: '🎁', title: 'Fırsatları kaçırma', body: 'Yeni kuponlar seni bekliyor. Kodu kopyala, ödemede kullan.' },
      { emoji: '🎉', title: 'Hazırsın!', body: 'Hepsi bu. Turu Hesap sayfasından tekrar izleyebilirsin.' },
    ],
  },
};

type Rect = { top: number; left: number; width: number; height: number };
const PAD = 8;

/** First-run guided tour of the home screen: spotlight + playful cards, shown once after sign-up. */
export function Tour() {
  const { lang, dir } = useI18n();
  const copy = COPY[(lang as keyof typeof COPY) in COPY ? (lang as keyof typeof COPY) : 'en'];
  const [open, setOpen] = useState(false);
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [vh, setVh] = useState(800);
  const touchX = useRef<number | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  // only steps whose target is actually on screen (a service may be switched off by the admin)
  const steps = useMemo(() => {
    if (!open) return copy.steps;
    return copy.steps.filter((s) => !s.target || document.querySelector(`[data-tour="${s.target}"]`));
  }, [open, copy]);
  const step = steps[Math.min(i, steps.length - 1)];
  const last = i >= steps.length - 1;

  useEffect(() => {
    const show = () => {
      setI(0);
      setOpen(true);
    };
    let done = false;
    try {
      done = localStorage.getItem(DONE_KEY) === 'done';
    } catch {
      done = true;
    }
    const url = new URL(window.location.href);
    const forced = url.searchParams.get('tour') === '1';
    if (forced) {
      url.searchParams.delete('tour');
      window.history.replaceState(null, '', url.toString());
    }
    // let the home screen paint first so the spotlight has something to land on
    const tm = !done || forced ? setTimeout(show, 700) : undefined;
    window.addEventListener(TOUR_EVENT, show);
    return () => {
      clearTimeout(tm);
      window.removeEventListener(TOUR_EVENT, show);
    };
  }, []);

  const measure = useCallback(() => {
    setVh(window.innerHeight);
    if (!step?.target) return setRect(null);
    const el = document.querySelector(`[data-tour="${step.target}"]`) as HTMLElement | null;
    if (!el) return setRect(null);
    const r = el.getBoundingClientRect();
    setRect({ top: r.top - PAD, left: r.left - PAD, width: r.width + PAD * 2, height: r.height + PAD * 2 });
  }, [step]);

  // bring the target into view, then measure (and keep measuring while things move)
  useLayoutEffect(() => {
    if (!open) return;
    const el = step?.target ? (document.querySelector(`[data-tour="${step.target}"]`) as HTMLElement | null) : null;
    if (el) {
      const r = el.getBoundingClientRect();
      const vhNow = window.innerHeight;
      // leave ~290px under the target for the card when the target is small enough; otherwise just bring it into view
      if (r.height < vhNow - 380 && (r.top < 80 || r.bottom > vhNow - 290)) window.scrollBy({ top: r.top - 90, behavior: 'smooth' });
      else if (r.top < 0 || r.bottom > vhNow) el.scrollIntoView({ block: 'start', behavior: 'smooth' });
    }
    measure();
    const t1 = setTimeout(measure, 350);
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      clearTimeout(t1);
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [open, i, step, measure]);

  useEffect(() => {
    if (open) cardRef.current?.focus();
  }, [open, i]);

  function close() {
    try {
      localStorage.setItem(DONE_KEY, 'done');
    } catch {
      /* storage blocked */
    }
    setOpen(false);
  }
  const next = () => (last ? close() : setI((n) => Math.min(n + 1, steps.length - 1)));
  const back = () => setI((n) => Math.max(n - 1, 0));

  function onKey(e: React.KeyboardEvent) {
    const fwd = dir === 'rtl' ? 'ArrowLeft' : 'ArrowRight';
    const bwd = dir === 'rtl' ? 'ArrowRight' : 'ArrowLeft';
    if (e.key === 'Escape') close();
    else if (e.key === fwd || e.key === 'Enter') next();
    else if (e.key === bwd) back();
  }

  if (!open || !step) return null;

  // card goes on whichever side of the spotlight has room; a very tall target gets the card docked at the bottom
  const CARD_H = 250;
  const spaceBelow = rect ? vh - (rect.top + rect.height) : 0;
  const spaceAbove = rect ? rect.top : 0;
  const cardStyle: React.CSSProperties = !rect
    ? { top: '50%', transform: 'translateY(-50%)' }
    : spaceBelow >= CARD_H + 24 && spaceBelow >= spaceAbove
      ? { top: rect.top + rect.height + 14 }
      : spaceAbove >= CARD_H + 24
        ? { bottom: vh - rect.top + 14 }
        : { bottom: 16 };
  const Fwd = dir === 'rtl' ? ChevronLeft : ChevronRight;
  const Bwd = dir === 'rtl' ? ChevronRight : ChevronLeft;
  const center = !rect;

  return (
    <div className="fixed inset-0 z-[3000]" role="dialog" aria-modal="true" aria-labelledby="kap-tour-title" onKeyDown={onKey} dir={dir}>
      {/* dimmer with a moving spotlight hole */}
      {rect ? (
        <div
          aria-hidden
          className="absolute rounded-[22px] transition-all duration-500 ease-[cubic-bezier(.2,.9,.25,1.15)] pointer-events-none"
          style={{ ...rect, boxShadow: '0 0 0 9999px rgb(13 13 15 / 0.74)' }}
        >
          <span className="absolute inset-0 rounded-[22px] ring-[3px] ring-accent" />
          <span className="absolute inset-0 rounded-[22px] ring-[3px] ring-accent animate-tour-ping" />
        </div>
      ) : (
        <div aria-hidden className="absolute inset-0 bg-ink/80 animate-tour-fade" />
      )}
      {/* clicks outside the card do nothing (no accidental exits), but swipes work */}
      <div className="absolute inset-0" onClick={(e) => e.stopPropagation()} />

      <div className="absolute inset-x-0 px-4 flex justify-center pointer-events-none" style={cardStyle}>
        <div
          ref={cardRef}
          tabIndex={-1}
          key={i}
          onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
          onTouchEnd={(e) => {
            if (touchX.current === null) return;
            const dx = e.changedTouches[0].clientX - touchX.current;
            touchX.current = null;
            if (Math.abs(dx) < 50) return;
            const forward = dir === 'rtl' ? dx > 0 : dx < 0;
            forward ? next() : back();
          }}
          className={`pointer-events-auto w-full max-w-sm rounded-3xl bg-raised text-fg shadow-float p-5 outline-none focus-visible:outline-none animate-tour-pop relative overflow-hidden ${center ? 'text-center' : ''}`}
        >
          {last && <Confetti />}
          <div className={`flex items-start gap-3 ${center ? 'flex-col items-center' : ''}`}>
            {i === 0 ? (
              <span className="animate-tour-bounce">
                <KMark size={center ? 64 : 44} />
              </span>
            ) : (
              <span aria-hidden className={`${center ? 'text-6xl' : 'text-4xl'} leading-none animate-tour-bounce`}>
                {step.emoji}
              </span>
            )}
            <div className="flex-1 min-w-0">
              <h2 id="kap-tour-title" className={`font-black ${center ? 'text-2xl mt-2' : 'text-lg'}`}>
                {step.title}
              </h2>
              <p className="text-sm text-muted leading-6 mt-1">{step.body}</p>
            </div>
            {!last && !center && (
              <button onClick={close} aria-label={copy.skip} className="w-8 h-8 -mt-1 -me-1 rounded-full hover:bg-surface flex items-center justify-center text-muted shrink-0">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* progress: one segment per step */}
          <div className="flex gap-1.5 mt-5" aria-label={copy.of(i + 1, steps.length)}>
            {steps.map((_, n) => (
              <span key={n} className="h-1.5 flex-1 rounded-full bg-surface overflow-hidden">
                <span className={`block h-full rounded-full bg-accent transition-[width] duration-500 ${n <= i ? 'w-full' : 'w-0'}`} />
              </span>
            ))}
          </div>

          <div className="flex items-center gap-2 mt-4">
            {i === 0 ? (
              <>
                <button onClick={close} className={`${btn({ variant: 'ghost', size: 'md' })} text-muted`}>
                  {copy.skip}
                </button>
                <button onClick={next} className={`${btn({ size: 'md' })} flex-1`}>
                  {copy.start}
                  <Fwd className="w-4 h-4" />
                </button>
              </>
            ) : last ? (
              <button onClick={close} className={btn({ size: 'md', full: true })}>
                {copy.finish} 🚀
              </button>
            ) : (
              <>
                <button onClick={back} aria-label={copy.back} className={btn({ variant: 'soft', size: 'md' })}>
                  <Bwd className="w-4 h-4" />
                </button>
                <span className="flex-1 text-center text-xs font-bold text-muted">{copy.of(i + 1, steps.length)}</span>
                <button onClick={next} className={btn({ size: 'md' })}>
                  {copy.next}
                  <Fwd className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/** A small burst of brand-coloured confetti for the last step. */
function Confetti() {
  const bits = useMemo(
    () =>
      Array.from({ length: 26 }, (_, n) => ({
        x: Math.round(Math.cos((n / 26) * Math.PI * 2) * (90 + (n % 5) * 22)),
        y: Math.round(Math.sin((n / 26) * Math.PI * 2) * (60 + (n % 4) * 18)) - 30,
        r: (n * 47) % 360,
        c: ['#FFD100', '#0D0D0F', '#FFFFFF', '#FFD100', '#22A06B'][n % 5],
        d: (n % 6) * 30,
      })),
    [],
  );
  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 top-10 flex justify-center">
      {bits.map((b, n) => (
        <span
          key={n}
          className="absolute w-2 h-3 rounded-[2px] animate-tour-confetti border border-black/10"
          style={{ background: b.c, ['--x' as any]: `${b.x}px`, ['--y' as any]: `${b.y}px`, ['--r' as any]: `${b.r}deg`, animationDelay: `${b.d}ms` }}
        />
      ))}
    </div>
  );
}
