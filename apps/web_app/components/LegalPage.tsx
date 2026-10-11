'use client';

import Link from 'next/link';
import { KMark } from '@/components/Logo';
import { BackButton } from '@/components/ui';
import { useI18n } from '@/lib/i18n';
import { LEGAL, LEGAL_UPDATED, legalLang } from '@/lib/legal';

const LINKS = {
  ar: { privacy: 'الخصوصية', terms: 'الشروط', deletion: 'حذف الحساب', support: 'الدعم' },
  en: { privacy: 'Privacy', terms: 'Terms', deletion: 'Delete account', support: 'Support' },
};

/** Public, readable legal page (store reviewers open these without signing in). */
export function LegalPage({ doc, children, title, hideBody }: { doc: keyof typeof LEGAL; children?: React.ReactNode; title?: string; hideBody?: boolean }) {
  const { lang } = useI18n();
  const l = legalLang(lang);
  const d = LEGAL[doc][l];
  const nav = LINKS[l];
  return (
    <main className="min-h-screen bg-background" dir={l === 'ar' ? 'rtl' : 'ltr'} lang={l}>
      <header className="sticky top-0 z-10 bg-background/95 border-b border-border">
        <div className="max-w-2xl mx-auto px-5 h-14 flex items-center gap-3 safe-top">
          <BackButton />
          <KMark size={26} />
          <span className="font-black">KAP</span>
        </div>
      </header>
      <article className="max-w-2xl mx-auto px-5 py-8">
        <h1 className="text-3xl font-black">{title ?? d.title}</h1>
        {!hideBody && (
          <>
            <p className="text-sm text-muted mt-1">
              {d.updated}: <time dateTime={LEGAL_UPDATED}>{LEGAL_UPDATED}</time>
            </p>
            <p className="mt-5 leading-8">{d.intro}</p>
          </>
        )}
        {children}
        {!hideBody && d.sections.map((s) => (
          <section key={s.h} className="mt-8">
            <h2 className="text-lg font-extrabold mb-2">{s.h}</h2>
            <ul className="flex flex-col gap-2 list-disc ps-5 leading-8 marker:text-muted">
              {s.p.map((p) => (
                <li key={p.slice(0, 40)}>{p}</li>
              ))}
            </ul>
          </section>
        ))}
        <nav className="mt-12 pt-6 border-t border-border flex flex-wrap gap-x-5 gap-y-2 text-sm font-bold text-muted">
          <Link href="/privacy">{nav.privacy}</Link>
          <Link href="/terms">{nav.terms}</Link>
          <Link href="/delete-account">{nav.deletion}</Link>
          <Link href="/support">{nav.support}</Link>
        </nav>
        <p className="mt-4 text-xs text-muted" dir="ltr">
          © {new Date().getFullYear()} KAP. Developed by Ahmed Ihsan Hussein. Map data © OpenStreetMap contributors.
        </p>
      </article>
    </main>
  );
}
