'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { PauseCircle } from 'lucide-react';
import { isOn } from '@/lib/features';
import { useFlags } from '@/lib/hooks';
import { useI18n } from '@/lib/i18n';

/**
 * Shows a "paused" screen instead of the page when the super admin has switched the feature off,
 * so a saved link or an old notification can't open a disabled service.
 * `marketKeys` replaces `keys` when the URL has ?type=market (the stores side of /food).
 */
export function FeatureGate({ keys, marketKeys, children }: { keys: string[]; marketKeys?: string[]; children: React.ReactNode }) {
  const flags = useFlags();
  const { t } = useI18n();
  const [market, setMarket] = useState(false);
  useEffect(() => {
    setMarket(new URLSearchParams(window.location.search).get('type') === 'market');
  }, []);
  const need = market && marketKeys ? marketKeys : keys;
  if (!flags || need.every((k) => isOn(flags, k))) return <>{children}</>;
  return (
    <main className="min-h-[100dvh] bg-background flex flex-col items-center justify-center gap-4 p-8 text-center">
      <span className="w-16 h-16 rounded-2xl bg-surface flex items-center justify-center">
        <PauseCircle className="w-8 h-8 text-muted" />
      </span>
      <h1 className="text-xl font-semibold">{t('error.service_disabled')}</h1>
      <Link href="/home" className="h-12 px-6 rounded-2xl bg-ink text-white dark:bg-white dark:text-ink font-semibold flex items-center">
        {t('nav.home')}
      </Link>
    </main>
  );
}
