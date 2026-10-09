'use client';

import { useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';

const COUNTRY_CODES = [
  { code: '+964', flag: '🇮🇶', label: 'العراق' },
  { code: '+971', flag: '🇦🇪', label: 'الإمارات' },
  { code: '+963', flag: '🇸🇾', label: 'سوريا' },
];

// Testing phase: a real Supabase session is created without SMS (anonymous sign-in),
// and the phone number is stored on the user's profile. Swap to phone OTP once an
// SMS provider is configured — every other screen already works off the real session.
export default function LoginPage() {
  const [countryCode, setCountryCode] = useState('+964');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const digits = phone.replace(/\D/g, '').replace(/^0+/, '');

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (digits.length < 7) {
      setError('أدخل رقم هاتف صحيح');
      return;
    }
    setLoading(true);
    setError(null);

    const supabase = createSupabaseBrowserClient();
    const { data, error: err } = await supabase.auth.signInAnonymously({
      options: { data: { phone: `${countryCode}${digits}` } },
    });

    if (err || !data.user) {
      setLoading(false);
      setError(`تعذر تسجيل الدخول (${err?.message ?? 'unknown'})`);
      return;
    }

    // Best effort: the profile row is created by a DB trigger.
    await supabase.from('profiles').update({ phone_number: `${countryCode}${digits}` }).eq('id', data.user.id);

    // Full navigation so the middleware sees the fresh auth cookie.
    window.location.assign('/home');
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 mb-10 justify-center">
          <div className="w-9 h-9 rounded-lg bg-ink flex items-center justify-center">
            <span className="text-accent font-black">K</span>
          </div>
          <span className="font-black text-lg">KAP كاب</span>
        </div>

        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <h1 className="text-xl font-extrabold">أدخل رقم هاتفك</h1>
          <p className="text-sm text-neutralGray -mt-2">للدخول إلى KAP</p>
          <div className="flex gap-2" dir="ltr">
            <select
              value={countryCode}
              onChange={(e) => setCountryCode(e.target.value)}
              className="border border-border rounded-xl px-2 h-14 bg-surface"
              aria-label="رمز الدولة"
            >
              {COUNTRY_CODES.map((c) => (
                <option key={c.code} value={c.code}>{c.flag} {c.code}</option>
              ))}
            </select>
            <input
              type="tel"
              inputMode="tel"
              autoFocus
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="7XX XXX XXXX"
              className="flex-1 min-w-0 border border-border rounded-xl px-4 h-14 focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
          {error && <p className="text-danger text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="h-14 rounded-2xl bg-accent text-ink font-extrabold disabled:opacity-50"
          >
            {loading ? 'جارٍ الدخول…' : 'متابعة'}
          </button>
        </form>
      </div>
    </main>
  );
}
