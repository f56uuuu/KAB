'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createContext, useContext, useEffect, useState } from 'react';
import {
  BadgePercent,
  Building2,
  Car,
  History,
  Megaphone,
  Settings2,
  Gauge,
  Languages,
  LogOut,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  ReceiptText,
  ShieldAlert,
  SlidersHorizontal,
  Store,
  Sun,
  ToggleRight,
  Users,
  X,
} from 'lucide-react';
import { KMark } from '@/components/Logo';
import { Button, Spinner, btn } from '@/components/ui';
import { LANGS, useI18n } from '@/lib/i18n';
import { useTheme } from '@/lib/theme';
import { sb } from '@/lib/hooks';

const NAV = [
  { href: '/admin', key: 'admin.nav.overview', Icon: Gauge },
  { href: '/admin/drivers', key: 'admin.nav.drivers', Icon: Car },
  { href: '/admin/trips', key: 'admin.nav.trips', Icon: ReceiptText },
  { href: '/admin/stores', key: 'admin.nav.stores', Icon: Store },
  { href: '/admin/pricing', key: 'admin.nav.pricing', Icon: SlidersHorizontal },
  { href: '/admin/services', key: 'admin.nav.services', Icon: ToggleRight },
  { href: '/admin/promos', key: 'admin.nav.promos', Icon: BadgePercent },
  { href: '/admin/users', key: 'admin.nav.users', Icon: Users },
  { href: '/admin/cities', key: 'admin.nav.cities', Icon: Building2 },
  { href: '/admin/broadcast', key: 'admin.nav.broadcast', Icon: Megaphone },
  { href: '/admin/system', key: 'admin.nav.system', Icon: Settings2, superOnly: true },
  { href: '/admin/audit', key: 'admin.nav.audit', Icon: History, superOnly: true },
] as { href: string; key: string; Icon: typeof Gauge; superOnly?: boolean }[];

type Me = { id: string; email: string | null; role: string; name: string };
const MeCtx = createContext<Me | null>(null);
export const useAdmin = () => useContext(MeCtx);

export function AdminShell({ children }: { children: React.ReactNode }) {
  const { t, lang, setLang } = useI18n();
  const { dark, setPref } = useTheme();
  const path = usePathname();
  const [me, setMe] = useState<Me | null | 'denied'>(null);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem('kap_admin_sidebar') === 'collapsed');
    } catch {
      /* storage blocked */
    }
  }, []);

  function toggleSidebar() {
    const next = !collapsed;
    setCollapsed(next);
    try {
      localStorage.setItem('kap_admin_sidebar', next ? 'collapsed' : 'open');
    } catch {
      /* storage blocked */
    }
  }

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await sb().auth.getUser();
      if (!user) return window.location.assign('/superadmin');
      const { data } = await sb().from('profiles').select('role,first_name,is_active').eq('id', user.id).maybeSingle();
      const role = (data as any)?.role;
      if (role !== 'admin' && role !== 'super_admin') return setMe('denied');
      setMe({ id: user.id, email: user.email ?? null, role, name: (user.user_metadata as any)?.username || (data as any)?.first_name || user.email || 'Admin' });
    })();
  }, []);

  async function signOut() {
    await sb().auth.signOut();
    window.location.assign('/superadmin');
  }

  if (me === null)
    return (
      <main className="min-h-screen flex items-center justify-center">
        <Spinner />
      </main>
    );
  if (me === 'denied')
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 text-center">
        <ShieldAlert className="w-12 h-12 text-danger" />
        <p className="font-extrabold text-lg max-w-sm">{t('admin.not_admin')}</p>
        <div className="flex gap-2">
          <Button variant="soft" size="md" onClick={signOut}>
            {t('admin.signout')}
          </Button>
          <Link href="/home" className={btn({ size: 'md' })}>
            {t('driver.back_to_app')}
          </Link>
        </div>
      </main>
    );

  const nav = NAV.filter((n) => !n.superOnly || me.role === 'super_admin');
  const nextLang = LANGS[(LANGS.findIndex((l) => l.code === lang) + 1) % LANGS.length];
  const active = (href: string) => (href === '/admin' ? path === '/admin' : path.startsWith(href));

  return (
    <MeCtx.Provider value={me}>
      <div className="min-h-screen bg-surface/60 lg:flex">
        {/* sidebar (desktop) — collapses to icons; the content column is flex-1/min-w-0 so it reflows instantly */}
        <aside
          className={`hidden lg:flex shrink-0 flex-col bg-ink text-white sticky top-0 h-screen transition-[width] duration-200 ease-out ${collapsed ? 'w-[76px]' : 'w-64'}`}
          onTransitionEnd={(e) => e.propertyName === 'width' && window.dispatchEvent(new Event('resize'))}
        >
          <div className={`h-20 flex items-center gap-3 border-b border-white/10 ${collapsed ? 'px-0 justify-center' : 'px-5'}`}>
            {!collapsed && (
              <>
                <KMark size={36} />
                <span className="flex-1 min-w-0 flex flex-col leading-tight">
                  <span className="font-black text-lg truncate">{t('admin.title')}</span>
                  <span className="text-[11px] font-extrabold text-accent">{me.role === 'super_admin' ? 'SUPER ADMIN' : 'ADMIN'}</span>
                </span>
              </>
            )}
            <button
              onClick={toggleSidebar}
              aria-label={collapsed ? t('admin.sidebar.expand') : t('admin.sidebar.collapse')}
              aria-expanded={!collapsed}
              title={collapsed ? t('admin.sidebar.expand') : t('admin.sidebar.collapse')}
              className="w-10 h-10 rounded-xl hover:bg-white/10 flex items-center justify-center shrink-0"
            >
              {collapsed ? <PanelLeftOpen className="w-5 h-5 rtl:-scale-x-100" /> : <PanelLeftClose className="w-5 h-5 rtl:-scale-x-100" />}
            </button>
          </div>
          <nav className="flex-1 overflow-y-auto overflow-x-hidden p-3 flex flex-col gap-1">
            {nav.map(({ href, key, Icon }) => (
              <Link
                key={href}
                href={href}
                title={collapsed ? t(key as any) : undefined}
                aria-label={collapsed ? t(key as any) : undefined}
                className={`relative h-11 rounded-xl flex items-center gap-3 font-bold text-sm transition-colors ${collapsed ? 'justify-center px-0' : 'px-3'} ${
                  active(href) ? 'bg-accent text-ink' : 'text-white/75 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Icon className="w-5 h-5 shrink-0" />
                {!collapsed && <span className="truncate">{t(key as any)}</span>}
              </Link>
            ))}
          </nav>
          <div className="p-3 border-t border-white/10 flex flex-col gap-1">
            {!collapsed && (
              <p className="px-3 text-xs text-white/50 truncate" dir="ltr">
                {me.name}
              </p>
            )}
            <div className={`flex gap-1 ${collapsed ? 'flex-col' : ''}`}>
              <button onClick={() => setPref(dark ? 'light' : 'dark')} className="flex-1 h-10 rounded-xl hover:bg-white/10 flex items-center justify-center" aria-label={t('account.theme')} title={t('account.theme')}>
                {dark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
              <button onClick={() => setLang(nextLang.code)} className="flex-1 h-10 rounded-xl hover:bg-white/10 flex items-center justify-center gap-1 text-xs font-bold" aria-label={t('account.language')} title={nextLang.name}>
                <Languages className="w-5 h-5" />
                {!collapsed && nextLang.name}
              </button>
              <button onClick={signOut} className="flex-1 h-10 rounded-xl hover:bg-white/10 flex items-center justify-center" aria-label={t('admin.signout')} title={t('admin.signout')}>
                <LogOut className="w-5 h-5 rtl:rotate-180" />
              </button>
            </div>
          </div>
        </aside>

        {/* top bar (mobile) */}
        <header className="lg:hidden sticky top-0 z-40 bg-ink text-white safe-top">
          <div className="h-14 px-4 flex items-center gap-3">
            <KMark size={30} />
            <span className="font-black flex-1">{t('admin.title')}</span>
            <button onClick={() => setPref(dark ? 'light' : 'dark')} className="w-10 h-10 flex items-center justify-center" aria-label={t('account.theme')}>
              {dark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <button onClick={() => setLang(nextLang.code)} className="w-10 h-10 flex items-center justify-center" aria-label={t('account.language')}>
              <Languages className="w-5 h-5" />
            </button>
            <button onClick={signOut} className="w-10 h-10 flex items-center justify-center" aria-label={t('admin.signout')}>
              <LogOut className="w-5 h-5 rtl:rotate-180" />
            </button>
          </div>
          <nav className="flex gap-1 overflow-x-auto no-scrollbar px-3 pb-2">
            {nav.map(({ href, key }) => (
              <Link
                key={href}
                href={href}
                className={`h-9 px-3 rounded-full text-xs font-bold whitespace-nowrap flex items-center ${active(href) ? 'bg-accent text-ink' : 'bg-white/10'}`}
              >
                {t(key as any)}
              </Link>
            ))}
          </nav>
        </header>

        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </MeCtx.Provider>
  );
}

export function PageHead({ title, sub, action }: { title: string; sub?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end gap-3 mb-6">
      <div className="flex-1 min-w-0">
        <h1 className="text-2xl lg:text-3xl font-black">{title}</h1>
        {sub && <p className="text-sm text-muted mt-1">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

export function Panel({ children, className = '', title, action }: { children: React.ReactNode; className?: string; title?: string; action?: React.ReactNode }) {
  return (
    <section className={`rounded-2xl bg-raised border border-border ${className}`}>
      {title && (
        <div className="flex items-center gap-3 px-5 pt-4 pb-2">
          <h2 className="font-extrabold flex-1">{title}</h2>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

const TONE: Record<string, string> = {
  good: 'bg-success/15 text-success',
  warn: 'bg-warning/20 text-warning',
  bad: 'bg-danger/15 text-danger',
  live: 'bg-accent text-ink',
  idle: 'bg-surface text-muted',
};
export function Pill({ tone = 'idle', children }: { tone?: keyof typeof TONE; children: React.ReactNode }) {
  return <span className={`inline-flex items-center h-6 px-2.5 rounded-full text-[11px] font-extrabold whitespace-nowrap ${TONE[tone]}`}>{children}</span>;
}

export function statusTone(status: string): keyof typeof TONE {
  if (['COMPLETED', 'DELIVERED', 'APPROVED'].includes(status)) return 'good';
  if (['CANCELLED', 'REJECTED', 'BLOCKED', 'SUSPENDED'].includes(status)) return 'bad';
  if (['PENDING', 'SEARCHING', 'CREATED', 'PLACED', 'MORE_INFO'].includes(status)) return 'warn';
  return 'live';
}

export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  const { t } = useI18n();
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[2000] bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-6" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-lg max-h-[90vh] overflow-y-auto bg-background rounded-t-sheet sm:rounded-3xl p-6 animate-slide-up"
      >
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-xl font-black flex-1">{title}</h2>
          <button onClick={onClose} aria-label={t('common.close')} className="w-9 h-9 rounded-full bg-surface flex items-center justify-center">
            <X className="w-5 h-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/** compact input for dense admin forms */
export const cellInput = 'w-full h-10 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-fg';

