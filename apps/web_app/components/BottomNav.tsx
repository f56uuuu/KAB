'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { href: '/home', label: 'الرئيسية', icon: '🏠' },
  { href: '/ride/new', label: 'رحلة', icon: '🚗' },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      className="fixed bottom-0 inset-x-0 bg-background border-t border-border flex justify-around"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      {TABS.map((tab) => {
        const active = pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className="flex flex-col items-center gap-1 py-3 px-6 text-xs"
          >
            <span className="text-lg">{tab.icon}</span>
            <span className={active ? 'text-ink font-bold' : 'text-neutralGray'}>{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
