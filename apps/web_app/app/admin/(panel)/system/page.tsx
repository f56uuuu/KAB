'use client';

import { Glyph } from '@/components/Glyph';
import { useEffect, useState } from 'react';
import { AlertTriangle, Wrench } from 'lucide-react';
import { PageHead, Panel, cellInput } from '@/components/admin';
import { Button, Switch, useToast } from '@/components/ui';
import { useI18n } from '@/lib/i18n';
import { sb } from '@/lib/hooks';
import { SmsSettings } from '@/components/SmsSettings';

const FIELDS = [
  ['app_name', 'admin.system.app_name'],
  ['support_phone', 'admin.settings.support_phone'],
  ['support_whatsapp', 'admin.system.whatsapp'],
  ['platform_commission_pct', 'admin.settings.commission'],
  ['driver_search_radius_km', 'admin.settings.radius'],
  ['min_app_version', 'admin.system.min_version'],
  ['maintenance_message', 'admin.system.maintenance_msg'],
] as const;

export default function SystemAdmin() {
  const { t } = useI18n();
  const [s, setS] = useState<Record<string, string>>({});
  const [demo, setDemo] = useState(false);
  const { toast, toastNode } = useToast();

  useEffect(() => {
    sb()
      .from('settings')
      .select('key,value')
      .then(({ data }) => setS(Object.fromEntries((data ?? []).map((r: any) => [r.key, String(r.value ?? '')]))));
    sb()
      .from('feature_flags')
      .select('is_enabled')
      .eq('name', 'DEMO_MODE')
      .maybeSingle()
      .then(({ data }) => setDemo(!!(data as any)?.is_enabled));
  }, []);

  async function save(key: string, value: string) {
    const { error } = await sb().from('settings').upsert({ key, value }, { onConflict: 'key' });
    toast(error ? t('admin.save_failed', { msg: error.message }) : t('admin.saved'));
  }
  async function setFlag(v: boolean) {
    setDemo(v);
    const { error } = await sb().from('feature_flags').update({ is_enabled: v }).eq('name', 'DEMO_MODE');
    if (error) {
      setDemo(!v);
      toast(t('admin.save_failed', { msg: error.message }));
    } else toast(t('admin.saved'));
  }

  const maint = s.maintenance_mode === 'on';

  return (
    <>
      <PageHead title={t('admin.nav.system')} sub={t('admin.system.sub')} />
      <div className="grid xl:grid-cols-3 gap-4">
        <Panel className={`p-5 flex items-center gap-4 ${maint ? 'border-danger' : ''}`}>
          <span className={`w-12 h-12 rounded-2xl flex items-center justify-center ${maint ? 'bg-danger text-white' : 'bg-surface'}`}>
            <Wrench className="w-6 h-6" />
          </span>
          <div className="flex-1">
            <p className="font-extrabold">{t('admin.system.maintenance')}</p>
            <p className="text-xs text-muted">{t('admin.system.maintenance_hint')}</p>
          </div>
          <Switch
            checked={maint}
            onChange={(v) => {
              setS({ ...s, maintenance_mode: v ? 'on' : 'off' });
              save('maintenance_mode', v ? 'on' : 'off');
            }}
            label={t('admin.system.maintenance')}
          />
        </Panel>
        <Panel className={`p-5 flex items-center gap-4 ${demo ? 'border-warning' : ''}`}>
          <span className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl ${demo ? 'bg-warning/20' : 'bg-surface'}`}><Glyph name="flask" className="w-8 h-8" /></span>
          <div className="flex-1">
            <p className="font-extrabold">{t('admin.flag.DEMO_MODE')}</p>
            <p className="text-xs text-muted">{t('admin.system.demo_hint')}</p>
          </div>
          <Switch checked={demo} onChange={setFlag} label={t('admin.flag.DEMO_MODE')} />
        </Panel>
        {demo && (
          <div className="rounded-2xl bg-warning/15 border border-warning/40 p-4 flex gap-3 text-sm">
            <AlertTriangle className="w-5 h-5 text-warning shrink-0" />
            <p className="font-medium">{t('admin.services.demo_warn')}</p>
          </div>
        )}
      </div>

      <Panel title={t('admin.settings.title')} className="mt-4">
        <div className="px-5 pb-5 grid md:grid-cols-2 gap-4">
          {FIELDS.map(([k, label]) => (
            <label key={k} className="flex flex-col gap-1.5">
              <span className="text-sm font-bold">{t(label)}</span>
              <div className="flex gap-2">
                <input value={s[k] ?? ''} onChange={(e) => setS({ ...s, [k]: e.target.value })} className={cellInput} dir="auto" />
                <Button size="sm" variant="dark" onClick={() => save(k, s[k] ?? '')}>
                  {t('common.save')}
                </Button>
              </div>
            </label>
          ))}
        </div>
      </Panel>
      <SmsSettings />
      {toastNode}
    </>
  );
}
