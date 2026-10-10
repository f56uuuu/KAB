'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { Modal, PageHead, Panel } from '@/components/admin';
import { Button, Field, Switch, inputCls, useToast } from '@/components/ui';
import { useI18n } from '@/lib/i18n';
import { sb } from '@/lib/hooks';

export default function CitiesAdmin() {
  const { t, pick } = useI18n();
  const [countries, setCountries] = useState<any[]>([]);
  const [cities, setCities] = useState<any[]>([]);
  const [edit, setEdit] = useState<any>(null);
  const { toast, toastNode } = useToast();

  const load = useCallback(() => {
    sb().from('countries').select('*').order('id').then(({ data }) => setCountries(data ?? []));
    sb().from('cities').select('*').order('sort').order('name').then(({ data }) => setCities(data ?? []));
  }, []);
  useEffect(load, [load]);

  async function patch(table: 'cities' | 'countries', id: number, values: any) {
    const { error } = await sb().from(table).update(values).eq('id', id);
    toast(error ? t('admin.save_failed', { msg: error.message }) : t('admin.saved'));
    load();
  }

  async function save() {
    const row = { country_id: Number(edit.country_id), name: edit.name.trim(), name_ar: edit.name_ar?.trim() || null, latitude: Number(edit.latitude), longitude: Number(edit.longitude), is_active: true };
    if (!row.name || !row.latitude || !row.longitude) return toast(t('error.missing_fields'));
    const { error } = edit.id ? await sb().from('cities').update(row).eq('id', edit.id) : await sb().from('cities').insert(row);
    if (error) return toast(t('admin.save_failed', { msg: error.message }));
    toast(t('admin.saved'));
    setEdit(null);
    load();
  }

  const set = (k: string) => (e: any) => setEdit({ ...edit, [k]: e.target.value });

  return (
    <>
      <PageHead
        title={t('admin.nav.cities')}
        action={
          <Button size="md" onClick={() => setEdit({ country_id: countries[0]?.id ?? '', name: '', name_ar: '', latitude: '', longitude: '' })}>
            <Plus className="w-4 h-4" />
            {t('admin.cities.add')}
          </Button>
        }
      />
      <div className="flex flex-col gap-4">
        {countries.map((co) => (
          <Panel
            key={co.id}
            title={`${co.flag_emoji ?? ''} ${pick(co.name_ar, co.name)}`}
            action={
              <span className="flex items-center gap-2 text-xs font-bold text-muted">
                {co.currency_code}
                <Switch checked={co.is_active !== false} onChange={(v) => patch('countries', co.id, { is_active: v })} label={co.name} />
              </span>
            }
          >
            <ul className="px-5 pb-3 divide-y divide-border">
              {cities
                .filter((c) => c.country_id === co.id)
                .map((c) => (
                  <li key={c.id} className="py-3 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold">{pick(c.name_ar, c.name)}</p>
                      <p className="text-xs text-muted" dir="ltr">
                        {Number(c.latitude).toFixed(4)}, {Number(c.longitude).toFixed(4)}
                      </p>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => setEdit({ ...c })}>
                      {t('common.edit')}
                    </Button>
                    <Switch checked={!!c.is_active} onChange={(v) => patch('cities', c.id, { is_active: v })} label={t('admin.cities.active')} />
                  </li>
                ))}
            </ul>
          </Panel>
        ))}
      </div>

      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? pick(edit.name_ar, edit.name) : t('admin.cities.add')}>
        {edit && (
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Field label={t('admin.cities.country')}>
                <select value={edit.country_id} onChange={set('country_id')} className={inputCls}>
                  {countries.map((co) => (
                    <option key={co.id} value={co.id}>
                      {pick(co.name_ar, co.name)}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label={t('admin.stores.name_en')}>
              <input value={edit.name} onChange={set('name')} className={inputCls} />
            </Field>
            <Field label={t('admin.stores.name_ar')}>
              <input value={edit.name_ar ?? ''} onChange={set('name_ar')} className={inputCls} dir="rtl" />
            </Field>
            <Field label={t('admin.stores.lat')}>
              <input value={edit.latitude} onChange={set('latitude')} className={inputCls} dir="ltr" />
            </Field>
            <Field label={t('admin.stores.lng')}>
              <input value={edit.longitude} onChange={set('longitude')} className={inputCls} dir="ltr" />
            </Field>
            <p className="col-span-2 text-xs text-muted">{t('admin.cities.pricing_hint')}</p>
            <div className="col-span-2">
              <Button full onClick={save}>
                {t('common.save')}
              </Button>
            </div>
          </div>
        )}
      </Modal>
      {toastNode}
    </>
  );
}
