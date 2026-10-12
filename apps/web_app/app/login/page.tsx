'use client';

import { useEffect, useState } from 'react';
import { Globe } from 'lucide-react';
import Link from 'next/link';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';
import { KMark } from '@/components/Logo';
import { Button } from '@/components/ui';
import { langInfo, useI18n } from '@/lib/i18n';
import { PhoneVerify, otpReady } from '@/components/PhoneVerify';

const COUNTRIES = [
  { code: '+964', flag: '🇮🇶' },
  { code: '+971', flag: '🇦🇪' },
  { code: '+963', flag: '🇸🇾' },
];

// When the admin has connected an SMS gateway, sign-in is by a 6-digit code sent to the phone.
// Until then a real session is created without SMS (anonymous sign-in) and the number is kept on the profile.
function goNext() {
  const next = new URLSearchParams(window.location.search).get('next');
  window.location.assign(next && next.startsWith('/') && !next.startsWith('//') ? next : '/home');
}

export default function LoginPage() {
  const { t, dir, lang } = useI18n();
  const [country, setCountry] = useState('+964');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sms, setSms] = useState<boolean | null>(null);
  useEffect(() => {
    otpReady().then(setSms);
  }, []);
  const digits = phone.replace(/\D/g, '').replace(/^0+/, '');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (digits.length < 7 || digits.length > 12) {
      setError(t('login.invalid'));
      return;
    }
    setLoading(true);
    setError(null);
    const supabase = createSupabaseBrowserClient();
    const full = `${country}${digits}`;
    const { data, error: err } = await supabase.auth.signInAnonymously({ options: { data: { phone: full } } });
    if (err || !data.user) {
      setLoading(false);
      setError(t('login.failed', { msg: err?.message ?? '' }));
      return;
    }
    await supabase.from('profiles').update({ phone_number: full }).eq('id', data.user.id);
    goNext();
  }

  return (
    <main className="min-h-[100dvh] flex flex-col bg-ink">
      <section className="relative overflow-hidden h-[42vh] min-h-[280px] shrink-0 px-6 pt-[max(env(safe-area-inset-top),24px)] text-white">
        {/* a city at night with your route to the pin */}
        <svg aria-hidden viewBox="0 0 390 400" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 w-full h-full">
          <g stroke="#26262C" strokeWidth="10" fill="none">
            <path d="M-10 120 L400 60" /><path d="M-10 260 L400 220" /><path d="M-10 380 L400 340" />
            <path d="M70 -10 L120 420" /><path d="M210 -10 L250 420" /><path d="M330 -10 L360 420" />
          </g>
          <g stroke="#1B1B20" strokeWidth="4" fill="none">
            <path d="M-10 190 L400 140" /><path d="M150 -10 L180 420" /><path d="M-10 320 L400 290" />
          </g>
          <path d="M318 330 C 290 300, 260 240, 232 236 S 160 250, 140 180 S 110 110, 96 82" fill="none" stroke="#FFD100" strokeWidth="6" strokeLinecap="round" />
          <circle cx="318" cy="330" r="9" fill="#0D0D0F" stroke="#FFD100" strokeWidth="4" />
          <path d="M96 84c-11-13-18-22-18-31a18 18 0 1 1 36 0c0 9-7 18-18 31Z" fill="#FFD100" />
          <circle cx="96" cy="53" r="6" fill="#0D0D0F" />
        </svg>
        <div className="relative z-10 flex items-center justify-between">
          <span className="flex items-center gap-2.5">
            <KMark size={44} className="rounded-xl" />
            <span className="text-2xl font-bold">كاب</span>
          </span>
          <Link href="/welcome" className="flex items-center gap-1.5 text-sm text-white/80 h-10 px-3 rounded-full bg-white/10 backdrop-blur">
            <Globe className="w-4 h-4" />
            <span>{langInfo(lang).name}</span>
          </Link>
        </div>
      </section>

      <form onSubmit={submit} className="relative flex-1 -mt-8 rounded-t-[32px] bg-background dark:bg-surface px-6 pt-8 safe-bottom flex flex-col gap-4">
        <div>
          <h1 className="text-[26px] font-semibold">{t('login.hello')}</h1>
          <p className="text-muted mt-1">{t('login.hello_sub')}</p>
        </div>
        {sms ? (
          <PhoneVerify mode="login" onDone={goNext} />
        ) : sms === null ? (
          <div className="h-36 rounded-2xl bg-surface animate-pulse" />
        ) : (
          <>
        <div className="flex gap-2" dir="ltr">
          <select
            aria-label={t('login.country')}
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="h-14 rounded-[18px] border-[1.5px] border-border bg-surface px-3 font-semibold text-base"
          >
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.flag} {c.code}
              </option>
            ))}
          </select>
          <input
            type="tel"
            inputMode="tel"
            autoComplete="tel-national"
            autoFocus
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder={t('login.placeholder')}
            aria-invalid={!!error}
            className="flex-1 min-w-0 h-14 rounded-[18px] border-[1.5px] border-border bg-background px-4 text-lg font-semibold tracking-wide outline-none focus:border-fg aria-[invalid=true]:border-danger"
          />
        </div>
        {error && (
          <p role="alert" className="text-danger text-sm font-medium" dir={dir}>
            {error}
          </p>
        )}
        <Button type="submit" variant="dark" loading={loading} full>
          {loading ? t('login.signing_in') : t('login.continue')}
        </Button>
          </>
        )}
        <p className="text-xs text-muted text-center mt-2 pb-2 leading-6">
          {t('login.terms')}{' '}
          <Link href="/terms" className="underline font-bold">
            {t('legal.terms')}
          </Link>
          {' · '}
          <Link href="/privacy" className="underline font-bold">
            {t('legal.privacy')}
          </Link>
        </p>
      </form>
    </main>
  );
}
