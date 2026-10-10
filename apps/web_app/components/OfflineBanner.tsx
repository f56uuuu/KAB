'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { legalLang } from '@/lib/legal';

const TXT = { ar: { off: 'غير متصل', map: 'افتح خرائطي' }, en: { off: 'Offline', map: 'Open my map' } };

/** Thin notice when the connection drops, with a shortcut to the offline map. */
export function OfflineBanner() {
  const path = usePathname();
  const { lang } = useI18n();
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    const sync = () => setOffline(!navigator.onLine);
    sync();
    window.addEventListener('online', sync);
    window.addEventListener('offline', sync);
    return () => {
      window.removeEventListener('online', sync);
      window.removeEventListener('offline', sync);
    };
  }, []);
  if (!offline || path.startsWith('/map') || path.startsWith('/offline')) return null;
  const tx = TXT[legalLang(lang)];
  return (
    <div role="status" className="fixed top-0 inset-x-0 z-[4000] flex justify-center pointer-events-none safe-top">
      <Link href="/map" className="pointer-events-auto mt-1 rounded-full bg-ink text-white text-sm font-bold px-4 h-9 flex items-center gap-2 shadow-float">
        <WifiOff className="w-4 h-4 text-accent" />
        {tx.off} · <span className="text-accent">{tx.map}</span>
      </Link>
    </div>
  );
}
