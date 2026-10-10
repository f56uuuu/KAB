'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { PageHead, Panel } from '@/components/admin';
import { Switch, useToast } from '@/components/ui';
import { useI18n } from '@/lib/i18n';
import { sb } from '@/lib/hooks';

const ICON: Record<string, string> = { RIDE: '🚖', DELIVERY: '📦', FOOD: '🍔', MARKET: '🛒', OFFERS: '🎁', DEMO_MODE: '🧪' };

export default function ServicesAdmin() {
  const { t } = useI18n();
  const [flags, setFlags] = useState<any[] | null>(null);
  const { toast, toastNode } = useToast();

  useEffect(() => {
    sb().from('feature_flags').select('*').order('name').then(({ data }) => setFlags(data ?? []));
  }, []);

  async function toggle(f: any, v: boolean) {
    setFlags((xs) => (xs ?? []).map((x) => (x.name === f.name ? { ...x, is_enabled: v } : x)));
    const { error } = await sb().from('feature_flags').update({ is_enabled: v }).eq('name', f.name);
    if (error) {
      toast(t('admin.save_failed', { msg: error.message }));
      setFlags((xs) => (xs ?? []).map((x) => (x.name === f.name ? { ...x, is_enabled: !v } : x)));
    } else toast(t('admin.saved'));
  }

  const demo = (flags ?? []).find((f) => f.name === 'DEMO_MODE');

  return (
    <>
      <PageHead title={t('admin.nav.services')} sub={t('admin.services.hint')} />
      {demo?.is_enabled && (
        <div className="mb-4 rounded-2xl bg-warning/15 border border-warning/40 p-4 flex gap-3 text-sm">
          <AlertTriangle className="w-5 h-5 text-warning shrink-0" />
          <p className="font-medium">{t('admin.services.demo_warn')}</p>
        </div>
      )}
      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {(flags ?? []).map((f) => (
          <Panel key={f.name} className="p-5 flex items-center gap-4">
            <span className="w-12 h-12 rounded-2xl bg-surface flex items-center justify-center text-2xl">{ICON[f.name] ?? '⚙️'}</span>
            <div className="flex-1 min-w-0">
              <p className="font-extrabold">{t(`admin.flag.${f.name}` as any) || f.name}</p>
              <p className="text-xs text-muted">{f.is_enabled ? t('common.on') : t('common.off')}</p>
            </div>
            <Switch checked={!!f.is_enabled} onChange={(v) => toggle(f, v)} label={f.name} />
          </Panel>
        ))}
      </div>
      {toastNode}
    </>
  );
}
