'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Loader2 } from 'lucide-react';
import { forwardRef, useEffect, useState } from 'react';
import { useI18n } from '@/lib/i18n';

export type BtnVariant = 'primary' | 'dark' | 'soft' | 'outline' | 'ghost' | 'danger' | 'dangerSolid';
export type BtnSize = 'lg' | 'md' | 'sm';

/**
 * One button look for the whole app. Use <Button> for actions and `btn()` for links styled as buttons,
 * so a "Checkout" link, a "Save" button and a "Navigate" anchor all feel the same.
 */
export function btn({ variant = 'primary', size = 'lg', full = false }: { variant?: BtnVariant; size?: BtnSize; full?: boolean } = {}) {
  const v = {
    primary: 'bg-accent text-ink shadow-[0_6px_16px_-6px_rgb(255_209_0/0.7)] hover:bg-accentPressed hover:shadow-[0_8px_20px_-6px_rgb(255_209_0/0.8)]',
    dark: 'bg-ink text-white hover:bg-ink/85 dark:bg-white dark:text-ink dark:hover:bg-white/85',
    soft: 'bg-surface text-fg hover:bg-border/70',
    outline: 'border-2 border-border text-fg hover:border-fg bg-transparent',
    ghost: 'bg-transparent text-fg hover:bg-surface',
    danger: 'bg-danger/10 text-danger hover:bg-danger/15',
    dangerSolid: 'bg-danger text-white hover:bg-danger/90',
  }[variant];
  const s = { lg: 'h-14 px-6 text-base rounded-2xl', md: 'h-11 px-4 text-sm rounded-xl', sm: 'h-9 px-3 text-sm rounded-lg' }[size];
  return [
    'inline-flex items-center justify-center gap-2 font-extrabold select-none',
    'transition-[background-color,box-shadow,transform,border-color] duration-150 active:scale-[.98]',
    'disabled:bg-surface disabled:text-muted disabled:shadow-none disabled:border-transparent disabled:cursor-not-allowed disabled:active:scale-100',
    'aria-disabled:bg-surface aria-disabled:text-muted aria-disabled:shadow-none aria-disabled:pointer-events-none',
    v,
    s,
    full ? 'w-full' : '',
  ].join(' ');
}

type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: BtnVariant;
  size?: BtnSize;
  loading?: boolean;
  full?: boolean;
};

export const Button = forwardRef<HTMLButtonElement, BtnProps>(function Button(
  { variant = 'primary', size = 'lg', loading, full, className = '', children, disabled, ...rest },
  ref,
) {
  return (
    <button ref={ref} disabled={disabled || loading} aria-busy={loading || undefined} className={`${btn({ variant, size, full })} ${className}`} {...rest}>
      {loading && <Loader2 className="w-5 h-5 animate-spin" />}
      {children}
    </button>
  );
});

/** Themed checkbox with its label; the box itself is styled globally (globals.css). */
export function Checkbox({ checked, onChange, children, className = '' }: { checked: boolean; onChange: (v: boolean) => void; children: React.ReactNode; className?: string }) {
  return (
    <label className={`flex items-start gap-3 cursor-pointer select-none ${className}`}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-0.5" />
      <span className="text-sm font-medium leading-6">{children}</span>
    </label>
  );
}

export function Spinner({ className = '' }: { className?: string }) {
  return <Loader2 className={`w-6 h-6 animate-spin text-muted ${className}`} />;
}

export function BackButton({ href, className = '' }: { href?: string; className?: string }) {
  const router = useRouter();
  const { t } = useI18n();
  return (
    <button
      onClick={() => (href ? router.push(href) : window.history.length > 1 ? router.back() : router.push('/home'))}
      aria-label={t('common.back')}
      className={`w-11 h-11 rounded-full bg-raised shadow-float flex items-center justify-center shrink-0 ${className}`}
    >
      <ChevronLeft className="w-6 h-6 rtl:rotate-180" />
    </button>
  );
}

export function TopBar({ title, back, right }: { title?: string; back?: string | true; right?: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-30 bg-background safe-top">
      <div className="h-14 px-4 flex items-center gap-3 max-w-md md:max-w-2xl lg:max-w-3xl mx-auto">
        {back && <BackButton href={back === true ? undefined : back} className="shadow-none bg-surface w-10 h-10" />}
        {title && <h1 className="font-extrabold text-lg flex-1 truncate">{title}</h1>}
        {!title && <div className="flex-1" />}
        {right}
      </div>
    </header>
  );
}

export function Empty({ icon, title, sub, action }: { icon: React.ReactNode; title: string; sub?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center text-center px-8 py-16 gap-3">
      <div className="w-16 h-16 rounded-2xl bg-surface flex items-center justify-center text-muted">{icon}</div>
      <p className="font-extrabold text-lg">{title}</p>
      {sub && <p className="text-sm text-muted max-w-xs">{sub}</p>}
      {action}
    </div>
  );
}

export function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-bold">{label}</span>
      {children}
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </label>
  );
}

export const inputCls =
  'w-full h-12 rounded-xl border border-border bg-background px-4 text-base outline-none focus:border-fg focus:ring-0 placeholder:text-muted';

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative w-12 h-7 rounded-full transition-colors shrink-0 ${checked ? 'bg-success' : 'bg-border'}`}
    >
      <span
        className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-all ${checked ? 'start-[22px]' : 'start-0.5'}`}
      />
    </button>
  );
}

export function Chip({ active, onClick, children }: { active?: boolean; onClick?: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`h-9 px-4 rounded-full text-sm font-bold whitespace-nowrap border transition-colors ${
        active ? 'bg-fg text-background border-fg' : 'bg-background border-border text-fg hover:bg-surface'
      }`}
    >
      {children}
    </button>
  );
}

export function Card({ children, className = '', href }: { children: React.ReactNode; className?: string; href?: string }) {
  const cls = `block rounded-2xl bg-raised border border-border ${className}`;
  return href ? (
    <Link href={href} className={cls}>
      {children}
    </Link>
  ) : (
    <div className={cls}>{children}</div>
  );
}

/** Small transient message at the bottom of the screen. */
export function useToast() {
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(null), 2600);
    return () => clearTimeout(t);
  }, [msg]);
  const node = msg ? (
    <div role="status" className="fixed z-[1300] bottom-24 inset-x-0 flex justify-center px-4 pointer-events-none">
      <div className="bg-ink text-white dark:bg-white dark:text-ink rounded-full px-5 py-3 text-sm font-bold shadow-float animate-slide-up">
        {msg}
      </div>
    </div>
  ) : null;
  return { toast: setMsg, toastNode: node };
}

export function Stars({ value, onChange, size = 36 }: { value: number; onChange?: (v: number) => void; size?: number }) {
  return (
    <div className="flex gap-2 justify-center" dir="ltr">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          aria-label={`${n}`}
          onClick={() => onChange?.(n)}
          style={{ fontSize: size, lineHeight: 1 }}
          className={n <= value ? 'text-accent' : 'text-border'}
        >
          ★
        </button>
      ))}
    </div>
  );
}
