'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Home, ReceiptText, TicketPercent, UserRound } from 'lucide-react';
import { isOn } from '@/lib/features';
import { useFlags } from '@/lib/hooks';
import { useI18n } from '@/lib/i18n';
import type { Key } from '@/lib/locales/en';

const TABS: { href: string; label: Key; Icon: typeof Home; flag?: string }[] = [
  { href: '/home', label: 'nav.home', Icon: Home },
  { href: '/activity', label: 'nav.activity', Icon: ReceiptText },
  { href: '/offers', label: 'nav.offers', Icon: TicketPercent, flag: 'OFFERS' },
  { href: '/account', label: 'nav.account', Icon: UserRound },
];

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useI18n();
  const flags = useFlags();
  const tabs = TABS.filter((x) => !x.flag || isOn(flags, x.flag));
  // load every tab ahead of time so switching is instant
  useEffect(() => {
    TABS.forEach(({ href }) => router.prefetch(href));
  }, [router]);
  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 bg-background/95 backdrop-blur border-t border-border safe-bottom">
      <div className="max-w-md md:max-w-2xl lg:max-w-3xl mx-auto grid" style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}>
        {tabs.map(({ href, label, Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              prefetch
              aria-current={active ? 'page' : undefined}
              data-tour={`nav-${href.slice(1)}`}
              className="flex flex-col items-center gap-1 pt-2 pb-1.5 text-[12px] font-semibold"
            >
              <span className={`h-9 w-9 rounded-full flex items-center justify-center transition-colors ${active ? 'bg-accent dark:bg-accent/15 dark:shadow-[0_0_18px_rgb(255_209_0/0.35)]' : ''}`}>
                <Icon className={`w-[22px] h-[22px] ${active ? 'text-ink dark:text-accent' : 'text-muted'}`} strokeWidth={active ? 2.4 : 2} />
              </span>
              <span className={active ? 'text-fg dark:text-accent' : 'text-muted'}>{t(label)}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
