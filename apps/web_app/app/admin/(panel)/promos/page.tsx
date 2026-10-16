'use client';

import { Glyph } from '@/components/Glyph';
import { GlyphPicker } from '@/components/GlyphPicker';
import { useCallback, useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { Modal, PageHead, Panel, Pill } from '@/components/admin';
import { Button, Field, Switch, inputCls, useToast } from '@/components/ui';
import { useI18n } from '@/lib/i18n';
import { sb } from '@/lib/hooks';

const LINKS = ['/home', '/ride/new', '/send', '/food', '/food?type=market', '/offers'];
const SERVICES = ['ALL', 'RIDE', 'DELIVERY', 'FOOD'];
const TYPES = ['PERCENT', 'FIXED', 'FREE_DELIVERY'];
const NEW_BANNER = { title: '', title_ar: '', description: '', description_ar: '', color: '#FFD100', emoji: 'gift', link: '/home', sort: 10, is_active: true };
const NEW_COUPON = { code: '', discount_type: 'PERCENT', discount_value: 10, service_type: 'ALL', maximum_uses: 1000, is_active: true, expiry_date: '', description: '', description_ar: '' };

export default function PromosAdmin() {
  const { t, pick, locale } = useI18n();
  const [banners, setBanners] = useState<any[]>([]);
  const [coupons, setCoupons] = useState<any[]>([]);
  const [banner, setBanner] = useState<any>(null);
  const [coupon, setCoupon] = useState<any>(null);
  const { toast, toastNode } = useToast();

  const load = useCallback(() => {
    sb().from('banners').select('*').order('sort').then(({ data }) => setBanners(data ?? []));
    sb().from('coupons').select('*').order('created_at', { ascending: false }).then(({ data }) => setCoupons(data ?? []));
  }, []);
  useEffect(load, [load]);

  async function save(table: 'banners' | 'coupons', row: any, close: () => void) {
    const r = { ...row };
    delete r.id;
    delete r.created_at;
    delete r.updated_at;
    if (table === 'coupons') {
      r.code = String(r.code).trim().toUpperCase();
      r.discount_value = Number(r.discount_value) || 0;
      r.maximum_uses = Number(r.maximum_uses) || null;
      r.expiry_date = r.expiry_date || null;
    } else r.sort = Number(r.sort) || 0;
    const { error } = row.id ? await sb().from(table).update(r).eq('id', row.id) : await sb().from(table).insert(r);
    if (error) return toast(t('admin.save_failed', { msg: error.message }));
    toast(t('admin.saved'));
    close();
    load();
  }
  async function toggle(table: 'banners' | 'coupons', id: number, v: boolean) {
    const { error } = await sb().from(table).update({ is_active: v }).eq('id', id);
    if (error) toast(t('admin.save_failed', { msg: error.message }));
    load();
  }

  const bset = (k: string) => (e: any) => setBanner({ ...banner, [k]: e.target.value });
  const cset = (k: string) => (e: any) => setCoupon({ ...coupon, [k]: e.target.value });

  return (
    <>
      <PageHead title={t('admin.nav.promos')} />

      <Panel
        title={t('admin.promos.banners')}
        action={
          <Button size="sm" onClick={() => setBanner({ ...NEW_BANNER })}>
            <Plus className="w-4 h-4" />
            {t('admin.promos.add_banner')}
          </Button>
        }
      >
        <div className="p-5 pt-2 grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {banners.map((b) => (
            <div key={b.id} className={`rounded-2xl overflow-hidden border border-border ${b.is_active ? '' : 'opacity-50'}`}>
              <div className="h-24 p-4 flex items-center gap-3" style={{ background: b.color, color: lum(b.color) < 140 ? '#fff' : '#0D0D0F' }}>
                <div className="flex-1 min-w-0">
                  <p className="font-black leading-tight truncate">{pick(b.title_ar, b.title)}</p>
                  <p className="text-xs opacity-80 truncate">{pick(b.description_ar, b.description)}</p>
                </div>
                <Glyph name={b.emoji} fallback="gift" className="w-14 h-14 shrink-0" />
              </div>
              <div className="p-3 flex items-center gap-2">
                <Switch checked={!!b.is_active} onChange={(v) => toggle('banners', b.id, v)} label={t('admin.stores.visible')} />
                <span className="text-xs text-muted flex-1 truncate" dir="ltr">{b.link}</span>
                <Button size="sm" variant="soft" onClick={() => setBanner({ ...b })}>
                  {t('common.edit')}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <Panel
        className="mt-6 overflow-x-auto"
        title={t('admin.promos.coupons')}
        action={
          <Button size="sm" onClick={() => setCoupon({ ...NEW_COUPON })}>
            <Plus className="w-4 h-4" />
            {t('admin.promos.add_coupon')}
          </Button>
        }
      >
        <table className="w-full text-sm">
          <thead>
            <tr className="text-muted text-xs border-b border-border">
              <th className="text-start font-bold p-4">{t('admin.promos.code')}</th>
              <th className="text-start font-bold p-4">{t('admin.promos.value')}</th>
              <th className="text-start font-bold p-4">{t('admin.promos.service')}</th>
              <th className="text-start font-bold p-4">{t('admin.promos.expiry')}</th>
              <th className="p-4" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {coupons.map((c) => (
              <tr key={c.id} className={c.is_active ? '' : 'opacity-50'}>
                <td className="p-4">
                  <p className="font-black tracking-wider" dir="ltr">{c.code}</p>
                  <p className="text-xs text-muted">{pick(c.description_ar, c.description)}</p>
                </td>
                <td className="p-4 font-bold whitespace-nowrap">
                  {c.discount_type === 'PERCENT' ? `${Number(c.discount_value)}%` : c.discount_type === 'FREE_DELIVERY' ? t('admin.promos.type.FREE_DELIVERY') : Number(c.discount_value).toLocaleString(locale)}
                  <p className="text-xs text-muted font-medium">{t('admin.promos.used', { n: c.uses_count ?? 0 })} / {c.maximum_uses ?? '∞'}</p>
                </td>
                <td className="p-4">
                  <Pill>{t(`offers.service.${c.service_type}` as any)}</Pill>
                </td>
                <td className="p-4 text-xs text-muted whitespace-nowrap">{c.expiry_date ? new Date(c.expiry_date).toLocaleDateString(locale) : '—'}</td>
                <td className="p-4">
                  <div className="flex items-center gap-2 justify-end">
                    <Switch checked={!!c.is_active} onChange={(v) => toggle('coupons', c.id, v)} label={c.code} />
                    <Button size="sm" variant="soft" onClick={() => setCoupon({ ...c, expiry_date: c.expiry_date ? String(c.expiry_date).slice(0, 10) : '' })}>
                      {t('common.edit')}
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>

      <Modal open={!!banner} onClose={() => setBanner(null)} title={banner?.id ? t('common.edit') : t('admin.promos.add_banner')}>
        {banner && (
          <div className="grid grid-cols-2 gap-3">
            <Field label={t('admin.promos.title_en')}>
              <input value={banner.title ?? ''} onChange={bset('title')} className={inputCls} />
            </Field>
            <Field label={t('admin.promos.title_ar')}>
              <input value={banner.title_ar ?? ''} onChange={bset('title_ar')} className={inputCls} dir="rtl" />
            </Field>
            <Field label={t('admin.promos.desc_en')}>
              <input value={banner.description ?? ''} onChange={bset('description')} className={inputCls} />
            </Field>
            <Field label={t('admin.promos.desc_ar')}>
              <input value={banner.description_ar ?? ''} onChange={bset('description_ar')} className={inputCls} dir="rtl" />
            </Field>
            <Field label={t('admin.promos.color')}>
              <input type="color" value={banner.color ?? '#FFD100'} onChange={bset('color')} className={`${inputCls} p-1`} />
            </Field>
            <Field label={t('admin.stores.emoji')}>
              <GlyphPicker value={banner.emoji} onChange={(v) => setBanner((x: any) => ({ ...x, emoji: v }))} label={t('admin.stores.emoji')} />
            </Field>
            <Field label={t('admin.promos.link')}>
              <select value={banner.link ?? '/home'} onChange={bset('link')} className={inputCls} dir="ltr">
                {LINKS.map((l) => (
                  <option key={l}>{l}</option>
                ))}
              </select>
            </Field>
            <Field label={t('admin.sort')}>
              <input type="number" value={banner.sort ?? 0} onChange={bset('sort')} className={inputCls} dir="ltr" />
            </Field>
            <div className="col-span-2">
              <Button full onClick={() => save('banners', banner, () => setBanner(null))}>
                {t('common.save')}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={!!coupon} onClose={() => setCoupon(null)} title={coupon?.id ? coupon.code : t('admin.promos.add_coupon')}>
        {coupon && (
          <div className="grid grid-cols-2 gap-3">
            <Field label={t('admin.promos.code')}>
              <input value={coupon.code} onChange={cset('code')} className={`${inputCls} uppercase font-black tracking-wider`} dir="ltr" />
            </Field>
            <Field label={t('admin.promos.type')}>
              <select value={coupon.discount_type} onChange={cset('discount_type')} className={inputCls}>
                {TYPES.map((x) => (
                  <option key={x} value={x}>
                    {t(`admin.promos.type.${x}` as any)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t('admin.promos.value')}>
              <input type="number" value={coupon.discount_value} onChange={cset('discount_value')} className={inputCls} dir="ltr" disabled={coupon.discount_type === 'FREE_DELIVERY'} />
            </Field>
            <Field label={t('admin.promos.service')}>
              <select value={coupon.service_type} onChange={cset('service_type')} className={inputCls}>
                {SERVICES.map((x) => (
                  <option key={x} value={x}>
                    {t(`offers.service.${x}` as any)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t('admin.promos.max_uses')}>
              <input type="number" value={coupon.maximum_uses ?? ''} onChange={cset('maximum_uses')} className={inputCls} dir="ltr" />
            </Field>
            <Field label={t('admin.promos.expiry')}>
              <input type="date" value={coupon.expiry_date ?? ''} onChange={cset('expiry_date')} className={inputCls} dir="ltr" />
            </Field>
            <Field label={t('admin.promos.desc_en')}>
              <input value={coupon.description ?? ''} onChange={cset('description')} className={inputCls} />
            </Field>
            <Field label={t('admin.promos.desc_ar')}>
              <input value={coupon.description_ar ?? ''} onChange={cset('description_ar')} className={inputCls} dir="rtl" />
            </Field>
            <div className="col-span-2">
              <Button full onClick={() => save('coupons', coupon, () => setCoupon(null))} disabled={!String(coupon.code).trim()}>
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

function lum(hex: string) {
  const n = parseInt((hex || '#FFD100').replace('#', ''), 16);
  return 0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255);
}
