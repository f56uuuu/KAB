'use client';

import { GlyphTile } from '@/components/Glyph';
import { GlyphPicker } from '@/components/GlyphPicker';
import { useCallback, useEffect, useState } from 'react';
import { Plus, Printer, Trash2 } from 'lucide-react';
import { CityOptions } from '@/components/CityPicker';
import { Modal, PageHead, Panel, cellInput } from '@/components/admin';
import { StoreMeta } from '@/components/StoreMeta';
import { Button, Field, Switch, inputCls, useToast } from '@/components/ui';
import { useI18n } from '@/lib/i18n';
import { sb } from '@/lib/hooks';
import { FOOD_CATS, MARKET_CATS } from '@/lib/jobs';

const CATS: string[] = [...FOOD_CATS, ...MARKET_CATS];
const EMPTY_STORE = { name: '', name_ar: '', category: CATS[0] ?? 'burger', emoji: 'burger', color: '#FFD100', city_id: '', delivery_fee: 1500, min_order: 0, delivery_minutes: 30, latitude: '', longitude: '', address: '', is_open: true, is_active: true, sort: 100 };

export default function StoresAdmin() {
  const { t, pick, lang } = useI18n();
  const [stores, setStores] = useState<any[] | null>(null);
  const [cities, setCities] = useState<any[]>([]);
  const [city, setCity] = useState<number | 'all'>('all');
  const [edit, setEdit] = useState<any>(null);
  const [menu, setMenu] = useState<any>(null);
  const [device, setDevice] = useState<any>(null);
  const { toast, toastNode } = useToast();

  const load = useCallback(async () => {
    const { data } = await sb().from('stores').select('*').order('city_id').order('sort');
    setStores(data ?? []);
  }, []);
  useEffect(() => {
    load();
    sb().from('cities').select('id,name,name_ar,country_id,sort,latitude,longitude,countries(id,code,name,name_ar,currency_code)').order('country_id').order('sort').order('name').then(({ data }) => setCities(data ?? []));
  }, [load]);

  async function patch(id: number, values: any) {
    setStores((s) => (s ?? []).map((x) => (x.id === id ? { ...x, ...values } : x)));
    const { error } = await sb().from('stores').update(values).eq('id', id);
    if (error) {
      toast(t('admin.save_failed', { msg: error.message }));
      load();
    }
  }

  async function save() {
    const row: any = { ...edit };
    delete row.id;
    delete row.created_at;
    delete row.updated_at;
    ['delivery_fee', 'min_order', 'delivery_minutes', 'sort', 'latitude', 'longitude', 'city_id'].forEach((k) => (row[k] = row[k] === '' ? null : Number(row[k])));
    if (row.latitude == null) {
      const c = cities.find((x) => x.id === row.city_id);
      if (c) Object.assign(row, { latitude: c.latitude, longitude: c.longitude });
    }
    const { error } = edit.id ? await sb().from('stores').update(row).eq('id', edit.id) : await sb().from('stores').insert(row);
    if (error) return toast(t('admin.save_failed', { msg: error.message }));
    toast(t('admin.saved'));
    setEdit(null);
    load();
  }

  const shown = (stores ?? []).filter((s) => city === 'all' || s.city_id === city);
  const set = (k: string) => (e: any) => setEdit({ ...edit, [k]: e.target.value });

  return (
    <>
      <PageHead
        title={t('admin.nav.stores')}
        action={
          <Button size="md" onClick={() => setEdit({ ...EMPTY_STORE, city_id: city === 'all' ? cities[0]?.id ?? '' : city })}>
            <Plus className="w-4 h-4" />
            {t('admin.stores.add')}
          </Button>
        }
      />
      <div className="flex flex-wrap gap-2 mb-4">
        <select value={city} onChange={(e) => setCity(e.target.value === 'all' ? 'all' : Number(e.target.value))} className={`${inputCls} h-11 max-w-xs font-bold`} aria-label={t('admin.stores.city')}>
          <option value="all">{t('common.all')}</option>
          <CityOptions cities={cities} />
        </select>
      </div>

      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {shown.map((s) => (
          <Panel key={s.id} className={`p-4 flex flex-col gap-3 ${s.is_active ? '' : 'opacity-60'}`}>
            <div className="flex items-start gap-3">
              <GlyphTile name={s.emoji} fallback={s.category} className="w-14 h-14 rounded-2xl" glyph="w-10 h-10" />
              <div className="flex-1 min-w-0">
                <p className="font-extrabold truncate">{pick(s.name_ar, s.name)}</p>
                <p className="text-xs text-muted truncate">{pick(cities.find((c) => c.id === s.city_id)?.name_ar, cities.find((c) => c.id === s.city_id)?.name)}</p>
                <StoreMeta store={s} currency={cities.find((c) => c.id === s.city_id)?.countries?.currency_code ?? 'IQD'} />
              </div>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <label className="flex items-center gap-2 font-bold">
                <Switch checked={!!s.is_open} onChange={(v) => patch(s.id, { is_open: v })} label={t('admin.stores.open')} />
                {s.is_open ? t('admin.stores.open') : t('admin.stores.closed')}
              </label>
              <label className="flex items-center gap-2 font-bold">
                <Switch checked={!!s.is_active} onChange={(v) => patch(s.id, { is_active: v })} label={t('admin.stores.visible')} />
                {s.is_active ? t('admin.stores.visible') : t('admin.stores.hidden')}
              </label>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="soft" className="flex-1" onClick={() => setEdit({ ...s })}>
                {t('common.edit')}
              </Button>
              <Button size="sm" variant="dark" className="flex-1" onClick={() => setMenu(s)}>
                {t('admin.stores.menu')}
              </Button>
            </div>
            <Button size="sm" variant="outline" full onClick={() => setDevice(s)}>
              <Printer className="w-4 h-4" />
              {devTxt(lang).button}
            </Button>
          </Panel>
        ))}
      </div>

      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? pick(edit.name_ar, edit.name) : t('admin.stores.add')}>
        {edit && (
          <div className="grid grid-cols-2 gap-3">
            <Field label={t('admin.stores.name_en')}>
              <input value={edit.name} onChange={set('name')} className={inputCls} />
            </Field>
            <Field label={t('admin.stores.name_ar')}>
              <input value={edit.name_ar ?? ''} onChange={set('name_ar')} className={inputCls} dir="rtl" />
            </Field>
            <Field label={t('admin.stores.city')}>
              <select value={edit.city_id ?? ''} onChange={set('city_id')} className={inputCls}>
                <CityOptions cities={cities} />
              </select>
            </Field>
            <Field label={t('admin.stores.category')}>
              <select value={edit.category} onChange={set('category')} className={inputCls}>
                {CATS.map((c) => (
                  <option key={c} value={c}>
                    {t(`food.cat.${c}` as any)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t('admin.stores.emoji')}>
              <GlyphPicker value={edit.emoji} onChange={(v) => setEdit((x: any) => ({ ...x, emoji: v }))} label={t('admin.stores.emoji')} />
            </Field>
            <Field label={t('admin.promos.color')}>
              <input type="color" value={edit.color ?? '#FFD100'} onChange={set('color')} className={`${inputCls} p-1`} />
            </Field>
            <Field label={t('admin.stores.fee')}>
              <input type="number" value={edit.delivery_fee ?? ''} onChange={set('delivery_fee')} className={inputCls} dir="ltr" />
            </Field>
            <Field label={t('admin.stores.min_order')}>
              <input type="number" value={edit.min_order ?? ''} onChange={set('min_order')} className={inputCls} dir="ltr" />
            </Field>
            <Field label={t('admin.stores.minutes')}>
              <input type="number" value={edit.delivery_minutes ?? ''} onChange={set('delivery_minutes')} className={inputCls} dir="ltr" />
            </Field>
            <Field label={t('admin.sort')}>
              <input type="number" value={edit.sort ?? ''} onChange={set('sort')} className={inputCls} dir="ltr" />
            </Field>
            <Field label={t('admin.stores.lat')}>
              <input value={edit.latitude ?? ''} onChange={set('latitude')} className={inputCls} dir="ltr" />
            </Field>
            <Field label={t('admin.stores.lng')}>
              <input value={edit.longitude ?? ''} onChange={set('longitude')} className={inputCls} dir="ltr" />
            </Field>
            <div className="col-span-2">
              <Button full onClick={save}>
                {t('common.save')}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={!!device} onClose={() => setDevice(null)} title={device ? `${devTxt(lang).button}: ${pick(device.name_ar, device.name)} · ${pick(cities.find((c) => c.id === device.city_id)?.name_ar, cities.find((c) => c.id === device.city_id)?.name) ?? ''}` : ''}>
        {device && <DeviceLink store={device} toast={toast} />}
      </Modal>

      <Modal open={!!menu} onClose={() => setMenu(null)} title={menu ? `${t('admin.stores.menu')}: ${pick(menu.name_ar, menu.name)}` : ''}>
        {menu && <MenuEditor store={menu} toast={toast} />}
      </Modal>
      {toastNode}
    </>
  );
}

function MenuEditor({ store, toast }: { store: any; toast: (m: string) => void }) {
  const { t } = useI18n();
  const [items, setItems] = useState<any[] | null>(null);

  const load = useCallback(async () => {
    const { data } = await sb().from('products').select('*').eq('store_id', store.id).order('sort');
    setItems(data ?? []);
  }, [store.id]);
  useEffect(() => {
    load();
  }, [load]);

  async function save(p: any) {
    const row = { name: p.name, name_ar: p.name_ar || null, section: p.section || null, section_ar: p.section_ar || null, price: Number(p.price) || 0, emoji: p.emoji || null, is_available: !!p.is_available, sort: Number(p.sort) || 0, store_id: store.id };
    const { error } = p.id ? await sb().from('products').update(row).eq('id', p.id) : await sb().from('products').insert(row);
    if (error) return toast(t('admin.save_failed', { msg: error.message }));
    toast(t('admin.saved'));
    load();
  }
  async function remove(p: any) {
    if (!p.id) return setItems((xs) => (xs ?? []).filter((x) => x !== p));
    const { error } = await sb().from('products').update({ is_available: false }).eq('id', p.id);
    if (error) return toast(t('admin.save_failed', { msg: error.message }));
    load();
  }
  const upd = (i: number, k: string, v: any) => setItems((xs) => (xs ?? []).map((x, n) => (n === i ? { ...x, [k]: v, _dirty: true } : x)));

  return (
    <div className="flex flex-col gap-3">
      {(items ?? []).map((p, i) => (
        <div key={p.id ?? `new${i}`} className={`rounded-xl border border-border p-3 grid grid-cols-6 gap-2 ${p.is_available ? '' : 'opacity-60'}`}>
          <div className="col-span-1">
            <GlyphPicker compact value={p.emoji} onChange={(v) => upd(i, 'emoji', v)} label={t('admin.stores.emoji')} />
          </div>
          <input value={p.name ?? ''} onChange={(e) => upd(i, 'name', e.target.value)} className={`${cellInput} col-span-5`} placeholder={t('admin.stores.name_en')} />
          <input value={p.name_ar ?? ''} onChange={(e) => upd(i, 'name_ar', e.target.value)} className={`${cellInput} col-span-6`} placeholder={t('admin.stores.name_ar')} dir="rtl" />
          <input value={p.section ?? ''} onChange={(e) => upd(i, 'section', e.target.value)} className={`${cellInput} col-span-3`} placeholder={t('admin.stores.section')} />
          <input value={p.section_ar ?? ''} onChange={(e) => upd(i, 'section_ar', e.target.value)} className={`${cellInput} col-span-3`} placeholder={`${t('admin.stores.section')} (AR)`} dir="rtl" />
          <input type="number" value={p.price ?? ''} onChange={(e) => upd(i, 'price', e.target.value)} className={`${cellInput} col-span-2`} placeholder={t('admin.stores.price')} dir="ltr" />
          <label className="col-span-2 flex items-center gap-2 text-xs font-bold">
            <Switch checked={!!p.is_available} onChange={(v) => upd(i, 'is_available', v)} label={t('admin.stores.available')} />
            {t('admin.stores.available')}
          </label>
          <div className="col-span-2 flex gap-1 justify-end">
            {p._dirty && (
              <Button size="sm" onClick={() => save(p)}>
                {t('common.save')}
              </Button>
            )}
            <button onClick={() => remove(p)} className="w-9 h-9 rounded-lg bg-danger/10 text-danger flex items-center justify-center" aria-label={t('common.delete')}>
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}
      <Button variant="soft" size="md" onClick={() => setItems((xs) => [...(xs ?? []), { name: '', price: '', is_available: true, sort: (xs?.length ?? 0) + 1, _dirty: true }])}>
        <Plus className="w-4 h-4" />
        {t('admin.stores.add_product')}
      </Button>
    </div>
  );
}

const DEV = {
  ar: {
    button: 'جهاز المطعم',
    how: 'لربط جهاز المطعم (مثل جهاز الطباعة المحمول): افتح على الجهاز الرابط التالي، سجّل الدخول، ثم أدخل الرمز.',
    make: 'إنشاء رمز ربط',
    valid: 'صالح لمدة 30 دقيقة ولمرة واحدة.',
    linked: 'الأجهزة المرتبطة',
    none: 'لا يوجد جهاز مرتبط بعد. الطلبات تُقبل تلقائيًا في وضع التجربة حتى يُربط جهاز.',
    remove: 'إلغاء الربط',
    failed: 'تعذّر تنفيذ العملية.',
  },
  en: {
    button: 'Store device',
    how: 'To link the store device (such as a handheld printer terminal): open this link on it, sign in, then enter the code.',
    make: 'Create link code',
    valid: 'Works once, for 30 minutes.',
    linked: 'Linked devices',
    none: 'No device linked yet. In demo mode orders are accepted automatically until a device is linked.',
    remove: 'Unlink',
    failed: 'That did not work.',
  },
};
function devTxt(lang: string) {
  return lang === 'ar' || lang === 'ku' ? DEV.ar : DEV.en;
}

function DeviceLink({ store, toast }: { store: any; toast: (m: string) => void }) {
  const { lang, locale } = useI18n();
  const tx = devTxt(lang);
  const [code, setCode] = useState<string | null>(null);
  const [staff, setStaff] = useState<any[] | null>(null);
  const load = useCallback(async () => {
    const { data } = await sb().rpc('admin_store_staff', { p_store: store.id });
    setStaff((data as any[]) ?? []);
  }, [store.id]);
  useEffect(() => {
    load();
  }, [load]);
  async function make() {
    const { data, error } = await sb().rpc('admin_store_pair_code', { p_store: store.id });
    if (error) return toast(tx.failed);
    setCode(String(data));
  }
  async function unlink(uid: string) {
    const { error } = await sb().rpc('admin_store_staff_remove', { p_store: store.id, p_user: uid });
    if (error) return toast(tx.failed);
    load();
  }
  const link = typeof window !== 'undefined' ? `${window.location.origin}/merchant` : '/merchant';
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted leading-relaxed">{tx.how}</p>
      <bdi dir="ltr" className="block rounded-xl bg-surface px-4 py-3 font-semibold text-center select-all break-all">
        {link}
      </bdi>
      {code ? (
        <div className="rounded-2xl bg-ink text-white p-5 text-center">
          <bdi dir="ltr" className="block text-5xl font-bold tracking-[0.3em] text-accent">
            {code}
          </bdi>
          <p className="text-sm text-white/70 mt-2">{tx.valid}</p>
        </div>
      ) : null}
      <Button variant={code ? 'soft' : 'primary'} full onClick={make}>
        {tx.make}
      </Button>
      <div>
        <p className="text-sm font-bold mb-2">{tx.linked}</p>
        {staff === null ? null : staff.length === 0 ? (
          <p className="text-sm text-muted">{tx.none}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {staff.map((m) => (
              <li key={m.user_id} className="rounded-xl border border-border px-3 py-2.5 flex items-center gap-3">
                <span className="flex-1 min-w-0">
                  <span className="block font-semibold truncate">{m.label || m.phone || m.user_id.slice(0, 8)}</span>
                  <span className="block text-xs text-muted">{new Date(m.created_at).toLocaleString(locale)}</span>
                  {m.device && (
                    <span className="block text-xs text-muted truncate" dir="ltr">
                      {m.device}
                      {m.last_print ? ` · ${m.last_print}` : ''}
                    </span>
                  )}
                </span>
                <Button size="sm" variant="danger" onClick={() => unlink(m.user_id)}>
                  {tx.remove}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
