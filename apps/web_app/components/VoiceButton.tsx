'use client';

import { isOn } from '@/lib/features';
import { useFlags } from '@/lib/hooks';

import { useEffect, useRef, useState } from 'react';
import { Mic } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { listen, voiceSupported } from '@/lib/voice';

const HINT: Record<string, { listening: string; label: string; tryIt: string }> = {
  ar: { listening: 'أسمعك…', label: 'أمر صوتي', tryIt: 'قل مثلًا: «خذني للبيت» أو «بلّغ عن شرطة»' },
  en: { listening: 'Listening…', label: 'Voice command', tryIt: 'Try “Take me home” or “Report police”' },
  ku: { listening: 'گوێم لێتە…', label: 'فەرمانی دەنگی', tryIt: '«بمبە بۆ ماڵ» یان «ڕاپۆرتی پۆلیس»' },
  tr: { listening: 'Dinliyorum…', label: 'Sesli komut', tryIt: '“Beni eve götür” ya da “Polis bildir” de' },
};

/** Microphone button: listens once and hands back what was said. Hidden where the browser has no speech recognition. */
function VoiceButtonInner({ onText, className = '' }: { onText: (text: string) => void; className?: string }) {
  const { lang, dir } = useI18n();
  const h = HINT[lang] ?? HINT.en;
  const [ok, setOk] = useState(false);
  const [on, setOn] = useState(false);
  const [interim, setInterim] = useState('');
  const stopRef = useRef<(() => void) | null>(null);

  useEffect(() => setOk(voiceSupported()), []);
  if (!ok) return null;

  async function start() {
    if (on) return stopRef.current?.();
    setOn(true);
    setInterim('');
    const l = listen(lang, setInterim);
    stopRef.current = l.stop;
    const text = await l.done;
    setOn(false);
    setInterim('');
    if (text) onText(text);
  }

  return (
    <>
      <button type="button" onClick={start} aria-label={h.label} aria-pressed={on} className={`relative flex items-center justify-center ${className}`}>
        {on && <span className="absolute inset-0 rounded-full bg-accent/50 animate-pulse_ring" />}
        <Mic className={`relative w-5 h-5 ${on ? 'text-danger' : ''}`} />
      </button>
      {on && (
        <div className="fixed inset-x-0 top-[max(env(safe-area-inset-top),16px)] z-[1500] flex justify-center px-4 pointer-events-none" dir={dir}>
          <div className="max-w-sm w-full rounded-2xl bg-ink text-white px-4 py-3 shadow-float animate-slide-up">
            <p className="font-black flex items-center gap-2">
              <Mic className="w-4 h-4 text-accent" />
              {h.listening}
            </p>
            <p className="text-sm text-white/80 mt-1 min-h-5">{interim || h.tryIt}</p>
          </div>
        </div>
      )}
    </>
  );
}

/** Hidden when the super admin switches VOICE_SEARCH off. */
export function VoiceButton(props: React.ComponentProps<typeof VoiceButtonInner>) {
  const flags = useFlags();
  if (!isOn(flags, 'VOICE_SEARCH')) return null;
  return <VoiceButtonInner {...props} />;
}
