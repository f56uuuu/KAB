'use client';

import { btn } from '@/components/ui';
import { useEffect, useMemo, useState } from 'react';
import { Check } from 'lucide-react';
import { KMark } from '@/components/Logo';
import { LANGS, useI18n, type Lang } from '@/lib/i18n';
import { translate } from '@/lib/i18n';

const GREETINGS = ['مرحبًا', 'Hello', 'سڵاو', 'Merhaba', 'Bonjour', 'Hola', 'سلام'];

function detect(): Lang {
  const nav = (typeof navigator !== 'undefined' ? navigator.languages?.[0] || navigator.language : 'ar').toLowerCase();
  if (nav.startsWith('ckb') || nav.startsWith('ku')) return 'ku';
  if (nav.startsWith('tr')) return 'tr';
  if (nav.startsWith('en')) return 'en';
  return 'ar';
}

export default function WelcomePage() {
  const { setLang } = useI18n();
  const [i, setI] = useState(0);
  const [showPicker, setShowPicker] = useState(false);
  const [detected, setDetected] = useState<Lang>('ar');
  const [choice, setChoice] = useState<Lang>('ar');

  useEffect(() => {
    const d = detect();
    setDetected(d);
    setChoice(d);
    const tick = setInterval(() => setI((x) => x + 1), 1100);
    const show = setTimeout(() => setShowPicker(true), 1500);
    return () => {
      clearInterval(tick);
      clearTimeout(show);
    };
  }, []);

  const greeting = GREETINGS[i % GREETINGS.length];
  const info = useMemo(() => LANGS.find((l) => l.code === choice)!, [choice]);

  function start() {
    setLang(choice);
    window.location.assign('/login');
  }

  return (
    <main className="min-h-[100dvh] bg-accent text-ink flex flex-col relative overflow-hidden" dir={info.dir}>
      {/* the road that ends at your pin */}
      <div className="relative flex-1 flex flex-col px-7 pt-[max(env(safe-area-inset-top),40px)] pb-8">
      <svg aria-hidden viewBox="-20 120 360 360" preserveAspectRatio="xMidYMid meet" className={`flex-1 min-h-[110px] w-full max-h-[300px] ${info.dir === 'rtl' ? '' : '-scale-x-100'}`}>
        <path className="kap-road" d="M-20 470 C 70 470, 110 400, 190 390 S 320 350, 300 280 S 170 220, 250 160" fill="none" stroke="#0D0D0F" strokeWidth="14" strokeLinecap="round" />
        <path d="M-20 470 C 70 470, 110 400, 190 390 S 320 350, 300 280 S 170 220, 250 160" fill="none" stroke="#FFD100" strokeWidth="2" strokeDasharray="10 12" strokeLinecap="round" />
        <g className="kap-pin">
          <path d="M250 164c-12-14-20-24-20-34a20 20 0 1 1 40 0c0 10-8 20-20 34Z" fill="#0D0D0F" />
          <circle cx="250" cy="130" r="7" fill="#FFD100" />
        </g>
      </svg>
        <div className="mt-4 flex items-center gap-4 h-20" aria-live="polite">
          <KMark size={56} className="rounded-2xl" />
          <h1 key={i} className="text-6xl font-bold animate-greet leading-tight" dir="auto">
            {greeting}
          </h1>
        </div>
        <p className="text-xl leading-relaxed flex flex-col">
          <span>{translate(choice, 'welcome.line1')}</span>
          <span>{translate(choice, 'welcome.line2')}</span>
        </p>
      </div>

      <section
        className={`relative bg-background text-fg rounded-t-sheet px-6 pt-7 safe-bottom transition-all duration-500 ${
          showPicker ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
        }`}
      >
        <h2 className="text-xl font-semibold mb-1">{translate(choice, 'welcome.choose')}</h2>
        <div className="grid grid-cols-2 gap-3 mt-4" role="radiogroup">
          {LANGS.map((l) => (
            <button
              key={l.code}
              role="radio"
              aria-checked={choice === l.code}
              onClick={() => setChoice(l.code)}
              className={`relative h-16 rounded-2xl border-2 px-4 flex flex-col items-start justify-center text-start transition-colors ${
                choice === l.code ? 'border-ink dark:border-accent bg-surface' : 'border-border'
              }`}
              dir={l.dir}
            >
              <span className="font-semibold text-lg leading-tight">{l.name}</span>
              {detected === l.code && (
                <span className="text-[11px] text-muted leading-tight">{translate(l.code, 'welcome.detected')}</span>
              )}
              {choice === l.code && (
                <span className="absolute top-2 end-2 w-5 h-5 rounded-full bg-accent text-ink flex items-center justify-center">
                  <Check className="w-3.5 h-3.5" strokeWidth={3} />
                </span>
              )}
            </button>
          ))}
        </div>
        <button onClick={start} className={`${btn({ variant: 'dark', full: true })} mt-6 mb-2 !text-lg`}>
          {translate(choice, 'welcome.start')}
        </button>
      </section>
    </main>
  );
}
