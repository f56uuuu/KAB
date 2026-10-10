'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button, Field, inputCls } from '@/components/ui';
import { KMark } from '@/components/Logo';
import { useI18n } from '@/lib/i18n';
import { sb } from '@/lib/hooks';

export default function AdminLoginPage() {
  return (
    <Suspense>
      <AdminLogin />
    </Suspense>
  );
}

function AdminLogin() {
  const { t } = useI18n();
  const params = useSearchParams();
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'error' | 'info'; text: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const s = sb();
    if (mode === 'up') {
      const { data, error } = await s.auth.signUp({
        email: email.trim(),
        password,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/admin` },
      });
      setBusy(false);
      if (error) return setMsg({ kind: 'error', text: error.message });
      if (!data.session) return setMsg({ kind: 'info', text: t('admin.check_email') });
    } else {
      const { error } = await s.auth.signInWithPassword({ email: email.trim(), password });
      if (error) {
        setBusy(false);
        return setMsg({ kind: 'error', text: t('admin.bad_login') });
      }
    }
    // first owner account becomes admin automatically (only works while no admin exists)
    await s.rpc('claim_first_admin').then(() => {}, () => {});
    window.location.assign(params.get('next') || '/admin');
  }

  return (
    <main className="min-h-screen grid lg:grid-cols-2 bg-background">
      <section className="hidden lg:flex relative bg-ink text-white p-12 flex-col justify-between kap-slash thin overflow-hidden">
        <KMark size={56} className="relative z-10" />
        <div className="relative z-10">
          <h1 className="text-5xl font-black leading-tight max-w-[12ch]">{t('admin.title')}</h1>
          <p className="text-neutralGray mt-4 max-w-sm">{t('admin.tagline')}</p>
        </div>
      </section>
      <section className="flex items-center justify-center p-6">
        <form onSubmit={submit} className="w-full max-w-sm flex flex-col gap-4">
          <KMark size={48} className="lg:hidden" />
          <h2 className="text-2xl font-black">{mode === 'in' ? t('admin.sign_in') : t('admin.signup')}</h2>
          <Field label={t('admin.email')}>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} dir="ltr" autoComplete="email" />
          </Field>
          <Field label={t('admin.password')}>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputCls}
              dir="ltr"
              autoComplete={mode === 'in' ? 'current-password' : 'new-password'}
            />
          </Field>
          {msg && (
            <p role="alert" className={`text-sm font-medium ${msg.kind === 'error' ? 'text-danger' : 'text-success'}`}>
              {msg.text}
            </p>
          )}
          <Button type="submit" full loading={busy}>
            {mode === 'in' ? t('admin.login') : t('admin.signup')}
          </Button>
          <button type="button" onClick={() => (setMode(mode === 'in' ? 'up' : 'in'), setMsg(null))} className="text-sm font-bold text-muted">
            {mode === 'in' ? t('admin.no_account') : t('admin.have_account')}
          </button>
        </form>
      </section>
    </main>
  );
}
