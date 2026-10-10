'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Wrench } from 'lucide-react';
import { KMark } from '@/components/Logo';
import { useI18n } from '@/lib/i18n';
import { sb } from '@/lib/hooks';

/** Full-screen notice while the super admin has maintenance mode on (admin pages stay reachable). */
export function MaintenanceGate() {
  const path = usePathname();
  const { t } = useI18n();
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    sb()
      .from('settings')
      .select('key,value')
      .in('key', ['maintenance_mode', 'maintenance_message'])
      .then(({ data }) => {
        const m = Object.fromEntries((data ?? []).map((r: any) => [r.key, String(r.value ?? '')]));
        setMsg(m.maintenance_mode === 'on' ? m.maintenance_message || '' : null);
      });
  }, []);

  if (msg === null || path.startsWith('/admin') || path.startsWith('/superadmin')) return null;
  return (
    <div className="fixed inset-0 z-[5000] bg-ink text-white flex flex-col items-center justify-center gap-5 p-8 text-center">
      <KMark size={64} />
      <span className="w-14 h-14 rounded-2xl bg-accent text-ink flex items-center justify-center">
        <Wrench className="w-7 h-7" />
      </span>
      <h1 className="text-2xl font-black">{t('maint.title')}</h1>
      <p className="text-neutralGray max-w-xs">{msg || t('maint.sub')}</p>
    </div>
  );
}
