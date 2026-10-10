'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
  const { t } = useI18n();
  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 bg-background/95 backdrop-blur border-t border-border safe-bottom">
      <div className="max-w-md mx-auto grid grid-cols-4">
        {TABS.map(({ href, label, Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className="relative flex flex-col items-center gap-1 pt-2.5 pb-1 text-[11px] font-bold"
            >
              {active && (
                <span aria-hidden className="absolute top-0 h-1 w-8 bg-accent" style={{ transform: 'skewX(-28deg)' }} />
              )}
              <Icon className={`w-6 h-6 ${active ? 'text-fg' : 'text-muted'}`} strokeWidth={active ? 2.4 : 2} />
              <span className={active ? 'text-fg' : 'text-muted'}>{t(label)}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
