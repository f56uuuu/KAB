'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const COUNTRY_CODES = [
  { code: '+964', flag: '🇮🇶' },
  { code: '+971', flag: '🇦🇪' },
  { code: '+963', flag: '🇸🇾' },
];

export default function LoginPage() {
  const [countryCode, setCountryCode] = useState('+964');
  const [phone, setPhone] = useState('');
  const router = useRouter();

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!phone.trim()) return;

    // حفظ البيانات مباشرة
    localStorage.setItem('userPhone', `${countryCode}${phone}`);
    localStorage.setItem('userId', 'temp-' + Date.now());
    document.cookie = `kap_session=${encodeURIComponent(countryCode + phone)}; path=/; max-age=2592000; samesite=lax`;

    router.replace('/home');
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

        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <h1 className="text-xl font-extrabold">أدخل رقم هاتفك</h1>
          <p className="text-sm text-neutralGray -mt-2">لتسجيل الدخول للتطبيق</p>
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
          <button
            type="submit"
            className="h-14 rounded-2xl bg-accent text-ink font-extrabold"
          >
            متابعة
          </button>
        </form>
      </div>
    </main>
  );
}
