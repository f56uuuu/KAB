'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Bell, Briefcase, Car, ChevronLeft, Headphones, Home as HomeIcon, LogOut, Moon, Phone, Sun, SunMoon } from 'lucide-react';
import { BottomNav } from '@/components/BottomNav';
import { Button, TopBar, inputCls, useToast } from '@/components/ui';
import { KMark } from '@/components/Logo';
import { LANGS, useI18n } from '@/lib/i18n';
import { useTheme, type ThemePref } from '@/lib/theme';
import { sb, useProfile } from '@/lib/hooks';
import { getCurrentPosition, mapProvider } from '@/lib/maps';

export default function AccountPage() {
  const { t, lang, setLang } = useI18n();
  const { pref, setPref } = useTheme();
  const profile = useProfile();
  const [name, setName] = useState('');
  const [places, setPlaces] = useState<any[]>([]);
  const [support, setSupport] = useState<string | null>(null);
  const [confirmOut, setConfirmOut] = useState(false);
  const { toast, toastNode } = useToast();

  useEffect(() => {
    if (profile) setName(profile.first_name ?? '');
  }, [profile]);

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await sb().auth.getUser();
      if (!user) return;
      const [{ data: a }, { data: s }] = await Promise.all([
        sb().from('addresses').select('*').eq('profile_id', user.id),
        sb().from('settings').select('value').eq('key', 'support_phone').maybeSingle(),
      ]);
      setPlaces(a ?? []);
      setSupport((s as any)?.value ?? null);
    })();
  }, []);

  async function saveName() {
    if (!profile) return;
    await sb().from('profiles').update({ first_name: name.trim() || null }).eq('id', profile.id);
    toast(t('common.saved'));
  }

  async function setPlace(kind: 'home' | 'work') {
    if (!profile) return;
    const { point } = await getCurrentPosition();
    const label = (await mapProvider.reverse(point).catch(() => null)) ?? '';
    const existing = places.find((p) => p.address_type === kind);
    const row = { profile_id: profile.id, address_type: kind, label: kind, street_address: label.slice(0, 250), latitude: point.lat, longitude: point.lng };
    const { data } = existing
      ? await sb().from('addresses').update(row).eq('id', existing.id).select().single()
      : await sb().from('addresses').insert(row).select().single();
    if (data) setPlaces((ps) => [...ps.filter((p) => p.address_type !== kind), data]);
    toast(t('places.saved'));
  }

  async function logout() {
    await sb().auth.signOut();
    window.location.assign('/login');
  }

  const themes: { v: ThemePref; label: string; Icon: typeof Sun }[] = [
    { v: 'light', label: t('account.theme.light'), Icon: Sun },
    { v: 'dark', label: t('account.theme.dark'), Icon: Moon },
    { v: 'system', label: t('account.theme.system'), Icon: SunMoon },
  ];

  return (
    <main className="min-h-screen bg-background pb-28">
      <TopBar title={t('account.title')} />
      <div className="max-w-md mx-auto px-5 flex flex-col gap-7">
        {/* identity */}
        <section className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-ink text-accent text-2xl font-black flex items-center justify-center shrink-0">
            {(name || 'K').trim().charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={saveName}
              placeholder={t('account.name_ph')}
              aria-label={t('account.name')}
              className="w-full bg-transparent text-xl font-extrabold outline-none placeholder:text-muted"
            />
            <p className="text-sm text-muted flex items-center gap-1.5" dir="ltr">
              <Phone className="w-3.5 h-3.5" />
              {profile?.phone_number ?? '—'}
            </p>
          </div>
        </section>

        {/* language */}
        <section>
          <h2 className="font-extrabold mb-3">{t('account.language')}</h2>
          <div className="grid grid-cols-2 gap-2">
            {LANGS.map((l) => (
              <button
                key={l.code}
                onClick={() => setLang(l.code)}
                aria-pressed={lang === l.code}
                dir={l.dir}
                className={`h-12 rounded-xl border-2 font-bold ${lang === l.code ? 'border-fg bg-surface' : 'border-border'}`}
              >
                {l.name}
              </button>
            ))}
          </div>
        </section>

        {/* theme */}
        <section>
          <h2 className="font-extrabold mb-3">{t('account.theme')}</h2>
          <div className="grid grid-cols-3 gap-2 p-1 rounded-2xl bg-surface" role="radiogroup">
            {themes.map(({ v, label, Icon }) => (
              <button
                key={v}
                role="radio"
                aria-checked={pref === v}
                onClick={() => setPref(v)}
                className={`h-12 rounded-xl flex items-center justify-center gap-2 text-sm font-bold ${
                  pref === v ? 'bg-background shadow-float' : 'text-muted'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>
        </section>

        {/* saved places */}
        <section id="places">
          <h2 className="font-extrabold mb-1">{t('account.places')}</h2>
          <ul className="divide-y divide-border">
            {(['home', 'work'] as const).map((k) => {
              const p = places.find((x) => x.address_type === k);
              const Icon = k === 'home' ? HomeIcon : Briefcase;
              return (
                <li key={k} className="flex items-center gap-3 py-3">
                  <span className="w-10 h-10 rounded-full bg-surface flex items-center justify-center">
                    <Icon className="w-5 h-5" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold">{t(`places.${k}`)}</p>
                    <p className="text-xs text-muted truncate">{p?.street_address || t('places.not_set')}</p>
                  </div>
                  <button onClick={() => setPlace(k)} className="text-xs font-bold h-9 px-3 rounded-lg bg-surface">
                    {t('places.set')}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        {/* links */}
        <section className="rounded-2xl border border-border divide-y divide-border overflow-hidden">
          <Row href="/notifications" Icon={Bell} label={t('account.notifications')} />
          <Row href="/driver" Icon={Car} label={t('account.drive')} />
          <Row
            href={support ? `tel:${support}` : '#'}
            Icon={Headphones}
            label={t('account.support')}
            sub={support ? t('account.support_sub', { phone: support }) : undefined}
          />
        </section>

        {/* sign out */}
        {!confirmOut ? (
          <Button variant="danger" size="md" onClick={() => setConfirmOut(true)}>
            <LogOut className="w-4 h-4" />
            {t('account.logout')}
          </Button>
        ) : (
          <div className="rounded-2xl bg-danger/10 p-4 flex flex-col gap-3">
            {profile?.is_anonymous && <p className="text-sm font-medium">{t('account.logout_warn')}</p>}
            <div className="flex gap-2">
              <Button variant="soft" size="md" className="flex-1" onClick={() => setConfirmOut(false)}>
                {t('common.cancel')}
              </Button>
              <button onClick={logout} className="flex-1 h-11 rounded-xl bg-danger text-white font-bold text-sm">
                {t('account.logout')}
              </button>
            </div>
          </div>
        )}

        <div className="flex flex-col items-center gap-2 py-4 text-muted">
          <KMark size={32} />
          <p className="text-xs font-bold">{t('common.tagline')}</p>
          <p className="text-[11px]">KAP 2.0</p>
        </div>
      </div>
      {toastNode}
      <BottomNav />
    </main>
  );
}

function Row({ href, Icon, label, sub }: { href: string; Icon: typeof Bell; label: string; sub?: string }) {
  return (
    <Link href={href} className="flex items-center gap-3 px-4 py-3.5">
      <Icon className="w-5 h-5" />
      <span className="flex-1">
        <span className="block font-bold">{label}</span>
        {sub && <span className="block text-xs text-muted" dir="auto">{sub}</span>}
      </span>
      <ChevronLeft className="w-5 h-5 text-muted ltr:rotate-180" />
    </Link>
  );
}
