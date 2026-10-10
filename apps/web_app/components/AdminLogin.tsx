'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { KeyRound, ShieldCheck } from 'lucide-react';
import { Button, Field, inputCls } from '@/components/ui';
import { KMark } from '@/components/Logo';
import { useI18n } from '@/lib/i18n';
import { sb } from '@/lib/hooks';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Usernames sign in through an internal address derived from the exact username (matches SQL username_email). */
export function loginEmail(id: string) {
  const v = id.trim();
  if (EMAIL_RE.test(v)) return v.toLowerCase();
  const hex = Array.from(new TextEncoder().encode(v))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return `u${hex}@admin.kap.app`;
}

export function AdminLogin({ superMode = false }: { superMode?: boolean }) {
  const { t } = useI18n();
  const params = useSearchParams();
  const [mode, setMode] = useState<'in' | 'setup' | 'signup'>('in');
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'error' | 'info'; text: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const s = sb();
    try {
      if (mode === 'setup') {
        const { data, error } = await s.rpc('setup_super_admin', { p_username: id.trim(), p_password: password, p_code: code.trim() });
        const err = error?.message ?? (data as any)?.error;
        if (err) {
          setMsg({ kind: 'error', text: t(`admin.setup_err.${err}` as any) || err });
          return;
        }
      }
      if (mode === 'signup') {
        const { data, error } = await s.auth.signUp({
          email: id.trim(),
          password,
          options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/admin` },
        });
        if (error) return setMsg({ kind: 'error', text: error.message });
        if (!data.session) return setMsg({ kind: 'info', text: t('admin.check_email') });
      } else {
        const { error } = await s.auth.signInWithPassword({ email: loginEmail(id), password });
        if (error) return setMsg({ kind: 'error', text: /confirm/i.test(error.message) ? t('admin.check_email') : t('admin.bad_login') });
      }
      await s.rpc('claim_first_admin').then(() => {}, () => {});
      window.location.assign(params.get('next') || '/admin');
    } finally {
      setBusy(false);
    }
  }

  const title = mode === 'setup' ? t('admin.setup_title') : mode === 'signup' ? t('admin.signup') : superMode ? t('admin.super_sign_in') : t('admin.sign_in');

  return (
    <main className="min-h-screen grid lg:grid-cols-2 bg-background">
      <section className="hidden lg:flex relative bg-ink text-white p-12 flex-col justify-between kap-slash thin overflow-hidden">
        <KMark size={56} className="relative z-10" />
        <div className="relative z-10">
          <span className="inline-flex items-center gap-2 h-8 px-3 rounded-full bg-accent text-ink text-sm font-black mb-5">
            <ShieldCheck className="w-4 h-4" />
            {superMode ? 'Super Admin' : 'Admin'}
          </span>
          <h1 className="text-5xl font-black leading-tight max-w-[12ch]">{t('admin.title')}</h1>
          <p className="text-neutralGray mt-4 max-w-sm">{t('admin.tagline')}</p>
        </div>
      </section>
      <section className="flex items-center justify-center p-6">
        <form onSubmit={submit} className="w-full max-w-sm flex flex-col gap-4">
          <KMark size={48} className="lg:hidden" />
          <h2 className="text-2xl font-black">{title}</h2>
          <Field label={mode === 'signup' ? t('admin.email') : t('admin.username_or_email')}>
            <input
              required
              value={id}
              onChange={(e) => setId(e.target.value)}
              className={inputCls}
              dir="ltr"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              type={mode === 'signup' ? 'email' : 'text'}
            />
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
          {mode === 'setup' && (
            <Field label={t('admin.setup_code')} hint={t('admin.setup_hint')}>
              <input required value={code} onChange={(e) => setCode(e.target.value)} className={`${inputCls} uppercase tracking-widest`} dir="ltr" autoComplete="one-time-code" />
            </Field>
          )}
          {msg && (
            <p role="alert" className={`text-sm font-medium ${msg.kind === 'error' ? 'text-danger' : 'text-success'}`}>
              {msg.text}
            </p>
          )}
          <Button type="submit" full loading={busy}>
            {mode === 'setup' ? t('admin.setup_btn') : mode === 'signup' ? t('admin.signup') : t('admin.login')}
          </Button>
          <div className="flex flex-col items-center gap-2 text-sm font-bold text-muted">
            {mode !== 'in' && (
              <button type="button" onClick={() => (setMode('in'), setMsg(null))}>
                {t('admin.have_account')}
              </button>
            )}
            {mode === 'in' && superMode && (
              <button type="button" onClick={() => (setMode('setup'), setMsg(null))} className="inline-flex items-center gap-1.5">
                <KeyRound className="w-4 h-4" />
                {t('admin.setup_link')}
              </button>
            )}
            {mode === 'in' && !superMode && (
              <button type="button" onClick={() => (setMode('signup'), setMsg(null))}>
                {t('admin.no_account')}
              </button>
            )}
          </div>
        </form>
      </section>
    </main>
  );
}
