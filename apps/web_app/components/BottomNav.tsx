'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Home, ReceiptText, TicketPercent, UserRound } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import type { Key } from '@/lib/locales/en';

const TABS: { href: string; label: Key; Icon: typeof Home }[] = [
  { href: '/home', label: 'nav.home', Icon: Home },
  { href: '/activity', label: 'nav.activity', Icon: ReceiptText },
  { href: '/offers', label: 'nav.offers', Icon: TicketPercent },
  { href: '/account', label: 'nav.account', Icon: UserRound },
];

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useI18n();
  // load every tab ahead of time so switching is instant
  useEffect(() => {
    TABS.forEach(({ href }) => router.prefetch(href));
  }, [router]);
  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 px-4 pointer-events-none pb-[max(env(safe-area-inset-bottom),12px)]">
      <div className="pointer-events-auto max-w-md md:max-w-2xl lg:max-w-3xl mx-auto h-16 rounded-[26px] bg-ink dark:bg-raised dark:border dark:border-border shadow-[0_16px_30px_rgb(13_13_15/0.25)] grid grid-cols-4 items-center px-2">
        {TABS.map(({ href, label, Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              prefetch
              aria-current={active ? 'page' : undefined}
              aria-label={active ? undefined : t(label)}
              data-tour={`nav-${href.slice(1)}`}
              className="justify-self-center"
            >
              {active ? (
                <span className="h-12 rounded-[18px] bg-accent text-ink flex items-center gap-1.5 px-3.5 text-[13px] font-semibold whitespace-nowrap">
                  <Icon className="w-5 h-5" strokeWidth={2.3} />
                  {t(label)}
                </span>
              ) : (
                <span className="w-12 h-12 rounded-[18px] flex items-center justify-center text-neutralGray hover:text-white transition-colors">
                  <Icon className="w-[22px] h-[22px]" strokeWidth={2} />
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
