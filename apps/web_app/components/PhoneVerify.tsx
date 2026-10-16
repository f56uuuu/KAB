'use client';

import { Glyph } from '@/components/Glyph';
import { useEffect, useRef, useState } from 'react';
import { MessageSquareText, Pencil } from 'lucide-react';
import { Button } from '@/components/ui';
import { useI18n } from '@/lib/i18n';
import { sb } from '@/lib/hooks';

export const COUNTRIES = [
  { code: '+964', flag: 'flag_iq' },
  { code: '+971', flag: 'flag_ae' },
  { code: '+963', flag: 'flag_sy' },
];

const TXT = {
  ar: {
    send: 'أرسل رمز التحقق', sending: 'جارٍ الإرسال…', codeTitle: 'أدخل الرمز', codeSub: (p: string) => `أرسلنا رمزًا من 6 أرقام إلى ${p}`,
    verify: 'تأكيد', verifying: 'جارٍ التأكيد…', resend: 'إعادة الإرسال', resendIn: (s: number) => `إعادة الإرسال بعد ${s} ث`, change: 'تغيير الرقم',
    invalid: 'أدخل رقم هاتف صحيح', wrong: 'الرمز غير صحيح أو انتهت صلاحيته', taken: 'هذا الرقم مسجّل بحساب آخر — سجّل الخروج وادخل به',
    failed: 'تعذّر إرسال الرسالة الآن، حاول بعد قليل', wait: 'انتظر قليلًا قبل طلب رمز جديد', placeholder: '7XX XXX XXXX',
  },
  en: {
    send: 'Send code', sending: 'Sending…', codeTitle: 'Enter the code', codeSub: (p: string) => `We sent a 6-digit code to ${p}`,
    verify: 'Verify', verifying: 'Verifying…', resend: 'Resend code', resendIn: (s: number) => `Resend in ${s}s`, change: 'Change number',
    invalid: 'Enter a valid phone number', wrong: 'Wrong or expired code', taken: 'This number belongs to another account — sign out and log in with it',
    failed: 'Couldn’t send the message right now, try again shortly', wait: 'Please wait a little before asking for a new code', placeholder: '7XX XXX XXXX',
  },
  ku: {
    send: 'کۆدی پشتڕاستکردنەوە بنێرە', sending: 'دەنێردرێت…', codeTitle: 'کۆدەکە بنووسە', codeSub: (p: string) => `کۆدێکی 6 ژمارەییمان نارد بۆ ${p}`,
    verify: 'پشتڕاستکردنەوە', verifying: 'پشتڕاست دەکرێتەوە…', resend: 'دووبارە ناردنەوە', resendIn: (s: number) => `دووبارە ناردن دوای ${s} چ`, change: 'گۆڕینی ژمارە',
    invalid: 'ژمارەیەکی دروست بنووسە', wrong: 'کۆدەکە هەڵەیە یان بەسەرچووە', taken: 'ئەم ژمارەیە هی هەژمارێکی ترە',
    failed: 'نامەکە نەنێردرا، دواتر هەوڵ بدەرەوە', wait: 'کەمێک چاوەڕێ بکە', placeholder: '7XX XXX XXXX',
  },
  tr: {
    send: 'Kod gönder', sending: 'Gönderiliyor…', codeTitle: 'Kodu gir', codeSub: (p: string) => `${p} numarasına 6 haneli bir kod gönderdik`,
    verify: 'Doğrula', verifying: 'Doğrulanıyor…', resend: 'Tekrar gönder', resendIn: (s: number) => `${s} sn sonra tekrar gönder`, change: 'Numarayı değiştir',
    invalid: 'Geçerli bir numara gir', wrong: 'Kod yanlış veya süresi dolmuş', taken: 'Bu numara başka bir hesaba ait',
    failed: 'Mesaj şu an gönderilemedi, biraz sonra dene', wait: 'Yeni kod için biraz bekle', placeholder: '7XX XXX XXXX',
  },
};

export function phoneTxt(lang: string) {
  return TXT[(lang as keyof typeof TXT) in TXT ? (lang as keyof typeof TXT) : 'en'];
}

/** Is SMS-code delivery switched on? (decided by the admin in System settings) */
export async function otpReady() {
  try {
    const { data } = await sb().rpc('otp_ready');
    return !!data;
  } catch {
    return false;
  }
}

/**
 * Phone number + 6-digit SMS code.
 * mode 'login': signs in (or creates the account) with the phone number.
 * mode 'link' : confirms a number for the signed-in user, keeping their account and history.
 */
export function PhoneVerify({ mode, initialPhone, onDone }: { mode: 'login' | 'link'; initialPhone?: string; onDone: () => void }) {
  const { lang, dir } = useI18n();
  const tx = phoneTxt(lang);
  const init = COUNTRIES.find((c) => initialPhone?.startsWith(c.code));
  const [country, setCountry] = useState(init?.code ?? '+964');
  const [phone, setPhone] = useState(init ? initialPhone!.slice(init.code.length) : '');
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wait, setWait] = useState(0);
  const codeRef = useRef<HTMLInputElement>(null);
  const digits = phone.replace(/\D/g, '').replace(/^0+/, '');
  const full = `${country}${digits}`;

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  // Android Chrome can read the code straight from the SMS
  useEffect(() => {
    if (step !== 'code' || !('OTPCredential' in window)) return;
    const ac = new AbortController();
    (navigator.credentials as any)
      .get({ otp: { transport: ['sms'] }, signal: ac.signal })
      .then((o: any) => o?.code && (setCode(o.code), verify(o.code)))
      .catch(() => {});
    return () => ac.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  function explain(msg: string) {
    if (/already|registered|exists/i.test(msg)) return tx.taken;
    if (/rate|frequency|seconds|too many/i.test(msg)) return tx.wait;
    if (/expired|invalid|token/i.test(msg)) return tx.wrong;
    return tx.failed;
  }

  async function send() {
    if (digits.length < 8 || digits.length > 12) return setError(tx.invalid);
    setBusy(true);
    setError(null);
    const { error: err } = mode === 'login' ? await sb().auth.signInWithOtp({ phone: full }) : await sb().auth.updateUser({ phone: full });
    setBusy(false);
    if (err) return setError(explain(err.message));
    setStep('code');
    setWait(60);
    setTimeout(() => codeRef.current?.focus(), 50);
  }

  async function verify(c = code) {
    if (c.length !== 6) return;
    setBusy(true);
    setError(null);
    const { error: err } = await sb().auth.verifyOtp({ phone: full, token: c, type: mode === 'login' ? 'sms' : 'phone_change' });
    setBusy(false);
    if (err) {
      setCode('');
      return setError(explain(err.message));
    }
    onDone();
  }

  return (
    <div className="flex flex-col gap-4">
      {step === 'phone' ? (
        <>
          <div className="flex gap-2" dir="ltr">
            <div className="relative shrink-0">
              <Glyph name={COUNTRIES.find((c) => c.code === country)?.flag} className="absolute start-2.5 top-1/2 -translate-y-1/2 w-7 h-7 pointer-events-none" />
              <select
                aria-label="country"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="h-14 rounded-2xl border border-border bg-surface ps-11 pe-3 appearance-none font-bold text-base"
              >
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code}
                  </option>
                ))}
              </select>
            </div>
            <input
              type="tel"
              inputMode="tel"
              autoComplete="tel-national"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), send())}
              placeholder={tx.placeholder}
              aria-invalid={!!error}
              className="flex-1 min-w-0 h-14 rounded-2xl border border-border bg-background px-4 text-lg font-bold tracking-wide outline-none focus:border-fg"
            />
          </div>
          {error && (
            <p role="alert" className="text-danger text-sm font-medium" dir={dir}>
              {error}
            </p>
          )}
          <Button type="button" loading={busy} full onClick={send}>
            <MessageSquareText className="w-5 h-5" />
            {busy ? tx.sending : tx.send}
          </Button>
        </>
      ) : (
        <>
          <div>
            <p className="text-xl font-black">{tx.codeTitle}</p>
            <p className="text-muted text-sm mt-1">
              {tx.codeSub('')}
              <span dir="ltr" className="font-bold text-fg">
                {full}
              </span>
            </p>
          </div>
          <input
            ref={codeRef}
            value={code}
            onChange={(e) => {
              const v = e.target.value.replace(/\D/g, '').slice(0, 6);
              setCode(v);
              if (v.length === 6) verify(v);
            }}
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]*"
            maxLength={6}
            dir="ltr"
            aria-label={tx.codeTitle}
            placeholder="••••••"
            className="h-16 rounded-2xl border-2 border-border bg-background text-center text-3xl font-black tracking-[0.5em] outline-none focus:border-fg"
          />
          {error && (
            <p role="alert" className="text-danger text-sm font-medium" dir={dir}>
              {error}
            </p>
          )}
          <Button type="button" loading={busy} full disabled={code.length !== 6} onClick={() => verify()}>
            {busy ? tx.verifying : tx.verify}
          </Button>
          <div className="flex items-center justify-between text-sm font-bold">
            <button type="button" onClick={() => (setStep('phone'), setCode(''), setError(null))} className="flex items-center gap-1.5 text-muted">
              <Pencil className="w-4 h-4" />
              {tx.change}
            </button>
            <button type="button" disabled={wait > 0 || busy} onClick={send} className="text-fg disabled:text-muted">
              {wait > 0 ? tx.resendIn(wait) : tx.resend}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

const SHEET = {
  ar: { title: 'تأكيد رقم الهاتف', sub: 'نرسل رمزًا لمرة واحدة إلى رقمك. رقمك لا يظهر لأي أحد.', verified: 'مؤكَّد', verify: 'أكّد رقمك' },
  en: { title: 'Confirm your phone', sub: 'We text a one-time code to your number. Your number is never shown to anyone.', verified: 'Verified', verify: 'Confirm your number' },
  ku: { title: 'پشتڕاستکردنەوەی ژمارە', sub: 'کۆدێکی یەکجاری بۆ ژمارەکەت دەنێرین. ژمارەکەت بۆ کەس دەرناکەوێت.', verified: 'پشتڕاستکراوە', verify: 'ژمارەکەت پشتڕاست بکەرەوە' },
  tr: { title: 'Telefonunu doğrula', sub: 'Numarana tek kullanımlık bir kod gönderiyoruz. Numaran kimseye gösterilmez.', verified: 'Doğrulandı', verify: 'Numaranı doğrula' },
};
export function sheetTxt(lang: string) {
  return SHEET[(lang as keyof typeof SHEET) in SHEET ? (lang as keyof typeof SHEET) : 'en'];
}

export function PhoneVerifySheet({ open, initialPhone, onClose, onDone }: { open: boolean; initialPhone?: string; onClose: () => void; onDone: () => void }) {
  const { lang, dir } = useI18n();
  const tx = sheetTxt(lang);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[1200] flex items-end sm:items-center justify-center" dir={dir} role="dialog" aria-modal="true" aria-label={tx.title}>
      <button aria-label="close" onClick={onClose} className="absolute inset-0 bg-black/40 animate-tour-fade" />
      <div className="relative w-full max-w-md bg-background rounded-t-sheet sm:rounded-3xl shadow-sheet safe-bottom px-5 pt-5 pb-5 animate-slide-up">
        <h2 className="text-xl font-black">{tx.title}</h2>
        <p className="text-sm text-muted mt-1 mb-4">{tx.sub}</p>
        <PhoneVerify mode="link" initialPhone={initialPhone} onDone={onDone} />
      </div>
    </div>
  );
}
