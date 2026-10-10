'use client';

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
    <main className="min-h-[100dvh] bg-ink text-white flex flex-col relative overflow-hidden" dir={info.dir}>
      {/* the livery stripe */}
      <div
        aria-hidden
        className="absolute -top-24 h-[140%] w-40 bg-accent opacity-95"
        style={{ insetInlineEnd: '-56px', transform: `skewX(${info.dir === 'rtl' ? 24 : -24}deg)` }}
      />
      <div className="relative flex-1 flex flex-col px-7 pt-[max(env(safe-area-inset-top),48px)]">
        <KMark size={64} />
        <div className="mt-16 h-24" aria-live="polite">
          <h1 key={i} className="text-6xl font-black animate-greet" dir="auto">
            {greeting}
          </h1>
        </div>
        <p className="text-neutralGray text-lg font-medium">{translate(choice, 'common.tagline')}</p>
      </div>

      <section
        className={`relative bg-background text-fg rounded-t-sheet px-6 pt-7 safe-bottom transition-all duration-500 ${
          showPicker ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
        }`}
      >
        <h2 className="text-xl font-extrabold mb-1">{translate(choice, 'welcome.choose')}</h2>
        <div className="grid grid-cols-2 gap-3 mt-4" role="radiogroup">
          {LANGS.map((l) => (
            <button
              key={l.code}
              role="radio"
              aria-checked={choice === l.code}
              onClick={() => setChoice(l.code)}
              className={`relative h-16 rounded-2xl border-2 px-4 flex flex-col items-start justify-center text-start transition-colors ${
                choice === l.code ? 'border-fg bg-surface' : 'border-border'
              }`}
              dir={l.dir}
            >
              <span className="font-extrabold text-lg leading-tight">{l.name}</span>
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
        <button onClick={start} className="mt-6 mb-2 w-full h-14 rounded-2xl bg-accent text-ink font-extrabold text-lg">
          {translate(choice, 'welcome.start')}
        </button>
      </section>
    </main>
  );
}
