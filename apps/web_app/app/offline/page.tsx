'use client';

import { btn } from '@/components/ui';
import Link from 'next/link';
import { Map as MapIcon, RotateCw, WifiOff } from 'lucide-react';
import { KMark } from '@/components/Logo';
import { useI18n } from '@/lib/i18n';
import { legalLang } from '@/lib/legal';

const TXT = {
  ar: { title: 'لا يوجد اتصال بالإنترنت', sub: 'خرائطك وأماكنك المحفوظة ومساراتك الأخيرة متاحة الآن. الطلبات تحتاج إنترنت.', map: 'افتح خرائطي', retry: 'إعادة المحاولة' },
  en: { title: 'No internet connection', sub: 'Your map, saved places and recent routes are available. Booking needs internet.', map: 'Open my map', retry: 'Try again' },
};

export default function OfflinePage() {
  const { lang } = useI18n();
  const tx = TXT[legalLang(lang)];
  return (
    <main className="min-h-screen bg-background flex flex-col items-center justify-center gap-5 p-8 text-center">
      <KMark size={56} />
      <span className="w-14 h-14 rounded-2xl bg-ink text-accent flex items-center justify-center">
        <WifiOff className="w-7 h-7" />
      </span>
      <h1 className="text-2xl font-black">{tx.title}</h1>
      <p className="text-muted max-w-xs leading-7">{tx.sub}</p>
      <Link href="/map" className={`${btn({ full: true })} max-w-xs`}>
        <MapIcon className="w-5 h-5" />
        {tx.map}
      </Link>
      <button onClick={() => window.location.reload()} className={`${btn({ variant: 'soft', full: true })} max-w-xs`}>
        <RotateCw className="w-4 h-4" />
        {tx.retry}
      </button>
    </main>
  );
}
