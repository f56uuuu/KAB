'use client';

import { useCallback, useEffect, useState } from 'react';
import { PageHead, Panel, cellInput } from '@/components/admin';
import { Button, useToast } from '@/components/ui';
import { CityOptions } from '@/components/CityPicker';
import { useI18n } from '@/lib/i18n';
import { sb } from '@/lib/hooks';

const FIELDS = [
  ['base_fare', 'admin.pricing.base'],
  ['per_km', 'admin.pricing.per_km'],
  ['per_min', 'admin.pricing.per_min'],
  ['min_fare', 'admin.pricing.min'],
  ['surge_multiplier', 'admin.pricing.surge'],
  ['cancellation_fee', 'admin.pricing.cancel_fee'],
] as const;
const SETTINGS = [
  ['platform_commission_pct', 'admin.settings.commission'],
  ['driver_search_radius_km', 'admin.settings.radius'],
  ['support_phone', 'admin.settings.support_phone'],
] as const;

export default function PricingAdmin() {
  const { t } = useI18n();
  const [cities, setCities] = useState<any[]>([]);
  const [city, setCity] = useState<number | null>(null);
  const [rules, setRules] = useState<any[]>([]);
  const [dirty, setDirty] = useState<Record<number, boolean>>({});
  const [settings, setSettings] = useState<Record<string, string>>({});
  const { toast, toastNode } = useToast();

  useEffect(() => {
    sb()
      .from('cities')
      .select('id,name,name_ar,country_id,sort,latitude,longitude,countries(id,code,name,name_ar,currency_code)')
      .order('country_id')
      .order('sort')
      .order('name')
      .then(({ data }) => {
        setCities(data ?? []);
        if (data?.length) setCity(data[0].id);
      });
    sb()
      .from('settings')
      .select('key,value')
      .in('key', SETTINGS.map((s) => s[0]) as string[])
      .then(({ data }) => setSettings(Object.fromEntries((data ?? []).map((r: any) => [r.key, String(r.value ?? '')]))));
  }, []);

  const load = useCallback(async () => {
    if (!city) return;
    const { data } = await sb().from('pricing_rules').select('*').eq('city_id', city).order('service_key').order('vehicle_type');
    setRules(data ?? []);
    setDirty({});
  }, [city]);
  useEffect(() => {
    load();
  }, [load]);

  const upd = (id: number, k: string, v: any) => {
    setRules((rs) => rs.map((r) => (r.id === id ? { ...r, [k]: v } : r)));
    setDirty((d) => ({ ...d, [id]: true }));
  };

  async function saveRule(r: any) {
    const row: any = { is_active: !!r.is_active, updated_at: new Date().toISOString() };
    FIELDS.forEach(([k]) => (row[k] = Number(r[k]) || 0));
    if (row.surge_multiplier < 1) row.surge_multiplier = 1;
    const { error } = await sb().from('pricing_rules').update(row).eq('id', r.id);
    if (error) return toast(t('admin.save_failed', { msg: error.message }));
    setDirty((d) => ({ ...d, [r.id]: false }));
    toast(t('admin.saved'));
  }

  async function saveSetting(key: string) {
    const { error } = await sb().from('settings').update({ value: settings[key] }).eq('key', key);
    toast(error ? t('admin.save_failed', { msg: error.message }) : t('admin.saved'));
  }

  const cur = cities.find((c) => c.id === city)?.countries?.currency_code ?? '';

  return (
    <>
      <PageHead title={t('admin.nav.pricing')} sub={t('admin.pricing.hint')} />
      <div className="mb-4 max-w-xs">
        <select value={city ?? ''} onChange={(e) => setCity(Number(e.target.value))} className={`${cellInput} h-11 font-bold`} aria-label={t('admin.stores.city')}>
          <CityOptions cities={cities} />
        </select>
      </div>

      <Panel className="overflow-x-auto">
        <table className="w-full text-sm min-w-[860px]">
          <thead>
            <tr className="text-muted text-xs border-b border-border">
              <th className="text-start font-bold p-3">{t('admin.pricing.service')}</th>
              {FIELDS.map(([k, label]) => (
                <th key={k} className="text-start font-bold p-3">
                  {t(label)} {k !== 'surge_multiplier' && <span className="font-normal">({cur})</span>}
                </th>
              ))}
              <th className="p-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rules.map((r) => (
              <tr key={r.id}>
                <td className="p-3 font-bold whitespace-nowrap">
                  {r.service_key === 'RIDE' ? t('kind.ride') : t('kind.delivery')}
                  <span className="block text-xs text-muted font-medium">{t(`vehicle.${r.vehicle_type}` as any)}</span>
                </td>
                {FIELDS.map(([k]) => (
                  <td key={k} className="p-2">
                    <input
                      type="number"
                      step={k === 'surge_multiplier' ? 0.1 : 'any'}
                      min={k === 'surge_multiplier' ? 1 : 0}
                      value={r[k] ?? ''}
                      onChange={(e) => upd(r.id, k, e.target.value)}
                      className={`${cellInput} w-28 ${k === 'surge_multiplier' && Number(r[k]) > 1 ? 'border-warning' : ''}`}
                      dir="ltr"
                    />
                  </td>
                ))}
                <td className="p-2 text-end">
                  <Button size="sm" disabled={!dirty[r.id]} onClick={() => saveRule(r)}>
                    {t('common.save')}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>

      <Panel title={t('admin.settings.title')} className="mt-6">
        <div className="px-5 pb-5 grid sm:grid-cols-3 gap-4">
          {SETTINGS.map(([k, label]) => (
            <label key={k} className="flex flex-col gap-1.5">
              <span className="text-sm font-bold">{t(label)}</span>
              <div className="flex gap-2">
                <input value={settings[k] ?? ''} onChange={(e) => setSettings({ ...settings, [k]: e.target.value })} className={cellInput} dir="ltr" />
                <Button size="sm" variant="dark" onClick={() => saveSetting(k)}>
                  {t('common.save')}
                </Button>
              </div>
            </label>
          ))}
        </div>
      </Panel>
      {toastNode}
    </>
  );
}
