'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';

const COUNTRY_CODES = [
  { code: '+964', flag: '🇮🇶' },
  { code: '+971', flag: '🇦🇪' },
  { code: '+963', flag: '🇸🇾' },
];

export default function LoginPage() {
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [countryCode, setCountryCode] = useState('+964');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const e164 = `${countryCode}${phone.trim()}`;

  async function sendOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!phone.trim()) return;
    setLoading(true);
    setError(null);
    const supabase = createSupabaseBrowserClient();
    const { error: err } = await supabase.auth.signInWithOtp({ phone: e164 });
    setLoading(false);
    if (err) {
      setError('تعذر إرسال الرمز. حاول مجددًا.');
      return;
    }
    setStep('otp');
  }

  async function verifyOtp(e: React.FormEvent) {
    e.preventDefault();
    if (code.trim().length < 4) return;
    setLoading(true);
    setError(null);
    const supabase = createSupabaseBrowserClient();
    const { error: err } = await supabase.auth.verifyOtp({ phone: e164, token: code.trim(), type: 'sms' });
    setLoading(false);
    if (err) {
      setError('الرمز غير صحيح. تحقق منه وحاول مجددًا.');
      return;
    }
    router.push('/home');
    router.refresh();
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

        {step === 'phone' ? (
          <form onSubmit={sendOtp} className="flex flex-col gap-4">
            <h1 className="text-xl font-extrabold">أدخل رقم هاتفك</h1>
            <p className="text-sm text-neutralGray -mt-2">سنرسل لك رمز تحقق عبر الرسائل النصية</p>
            <div className="flex gap-2">
              <select
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                className="border border-border rounded-xl px-2 h-14 bg-surface"
              >
                {COUNTRY_CODES.map((c) => (
                  <option key={c.code} value={c.code}>{c.flag} {c.code}</option>
                ))}
              </select>
              <input
                type="tel"
                autoFocus
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="رقم الهاتف"
                className="flex-1 border border-border rounded-xl px-4 h-14 focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            {error && <p className="text-danger text-sm">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="h-14 rounded-2xl bg-accent text-ink font-extrabold disabled:opacity-50"
            >
              {loading ? 'جارٍ الإرسال…' : 'متابعة'}
            </button>
          </form>
        ) : (
          <form onSubmit={verifyOtp} className="flex flex-col gap-4">
            <h1 className="text-xl font-extrabold">أدخل رمز التحقق</h1>
            <p className="text-sm text-neutralGray -mt-2" dir="ltr">{e164}</p>
            <input
              type="text"
              inputMode="numeric"
              autoFocus
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="••••••"
              className="h-16 text-center text-3xl tracking-[0.5em] border border-border rounded-2xl focus:outline-none focus:ring-2 focus:ring-accent"
            />
            {error && <p className="text-danger text-sm text-center">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="h-14 rounded-2xl bg-accent text-ink font-extrabold disabled:opacity-50"
            >
              {loading ? 'جارٍ التحقق…' : 'تأكيد'}
            </button>
            <button
              type="button"
              onClick={() => setStep('phone')}
              className="text-sm text-neutralGray"
            >
              تغيير رقم الهاتف
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
