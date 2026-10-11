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
      <section className="relative overflow-hidden px-7 pt-[max(env(safe-area-inset-top),40px)] pb-14 text-white kap-slash">
        <div className="relative z-10 flex items-center justify-between">
          <KMark size={52} />
          <Link href="/welcome" className="flex items-center gap-1.5 text-sm text-neutralGray h-10 px-3 rounded-full bg-white/10">
            <Globe className="w-4 h-4" />
            <span>{langInfo(lang).name}</span>
          </Link>
        </div>
        <p className="relative z-10 mt-10 text-4xl font-black leading-tight max-w-[14ch]">{t('common.tagline')}</p>
      </section>

      <form onSubmit={submit} className="flex-1 -mt-6 rounded-t-sheet bg-background px-6 pt-8 safe-bottom flex flex-col gap-4">
        <div>
          <h1 className="text-2xl font-extrabold">{t('login.title')}</h1>
          <p className="text-muted mt-1">{t('login.subtitle')}</p>
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
            className="h-14 rounded-2xl border border-border bg-surface px-3 font-bold text-base"
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
            className="flex-1 min-w-0 h-14 rounded-2xl border border-border bg-background px-4 text-lg font-bold tracking-wide outline-none focus:border-fg"
          />
        </div>
        {error && (
          <p role="alert" className="text-danger text-sm font-medium" dir={dir}>
            {error}
          </p>
        )}
        <Button type="submit" loading={loading} full>
          {loading ? t('login.signing_in') : t('login.continue')}
        </Button>
          </>
        )}
        <p className="text-xs text-muted text-center mt-auto pb-2 leading-6">
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
