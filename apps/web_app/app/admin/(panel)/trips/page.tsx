'use client';

import { useCallback, useEffect, useState } from 'react';
import { Modal, PageHead, Panel, Pill, statusTone } from '@/components/admin';
import { Button, Chip, inputCls, useToast } from '@/components/ui';
import { useI18n } from '@/lib/i18n';
import { sb } from '@/lib/hooks';
import { ACTIVE, type JobKind } from '@/lib/jobs';
import { dateTime, money } from '@/lib/format';

const KINDS: JobKind[] = ['ride', 'order', 'delivery'];
const TABLES: Record<JobKind, string> = { ride: 'rides', order: 'orders', delivery: 'deliveries' };

function normalize(kind: JobKind, x: any) {
  if (kind === 'ride')
    return { id: x.id, status: x.status, from: x.pickup_address, to: x.dropoff_address, amount: x.final_fare ?? x.estimated_fare, cur: x.currency_code, at: x.created_at, extra: x.vehicle_type, coupon: x.coupon_code };
  if (kind === 'delivery')
    return { id: x.id, status: x.status, from: x.pickup_location, to: x.dropoff_location, amount: x.final_fare ?? x.estimated_fare, cur: x.currency_code, at: x.created_at, extra: x.package_description, coupon: x.coupon_code };
  return { id: x.id, status: x.status, from: x.stores?.name_ar || x.stores?.name, to: x.delivery_address, amount: x.total_amount, cur: x.currency_code, at: x.created_at, extra: x.stores?.name, coupon: x.coupon_code };
}

export default function TripsAdmin() {
  const { t, locale } = useI18n();
  const [kind, setKind] = useState<JobKind>('ride');
  const [scope, setScope] = useState<'active' | 'done'>('active');
  const [rows, setRows] = useState<any[] | null>(null);
  const [cancel, setCancel] = useState<any>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const { toast, toastNode } = useToast();

  const load = useCallback(async () => {
    const active = ACTIVE[kind] as readonly string[];
    let q = sb()
      .from(TABLES[kind])
      .select(kind === 'order' ? '*, stores(name,name_ar)' : '*')
      .order('created_at', { ascending: false })
      .limit(200);
    q = scope === 'active' ? q.in('status', active as string[]) : q.not('status', 'in', `(${active.join(',')})`);
    const { data } = await q;
    setRows((data ?? []).map((x: any) => normalize(kind, x)));
  }, [kind, scope]);

  useEffect(() => {
    setRows(null);
    load();
    const iv = setInterval(load, 15000);
    return () => clearInterval(iv);
  }, [load]);

  async function doCancel() {
    setBusy(true);
    const { error } = await sb().rpc('admin_cancel_job', { p_kind: kind, p_id: cancel.id, p_reason: reason.trim() || null });
    setBusy(false);
    if (error) return toast(t('admin.save_failed', { msg: error.message }));
    setCancel(null);
    setReason('');
    toast(t('admin.saved'));
    load();
  }

  return (
    <>
      <PageHead title={t('admin.nav.trips')} />
      <div className="flex flex-wrap gap-2 mb-4">
        {KINDS.map((k) => (
          <Chip key={k} active={kind === k} onClick={() => setKind(k)}>
            {k === 'ride' ? t('activity.rides') : k === 'order' ? t('activity.orders') : t('activity.deliveries')}
          </Chip>
        ))}
        <span className="w-px bg-border mx-1" />
        <Chip active={scope === 'active'} onClick={() => setScope('active')}>
          {t('admin.trips.active')}
        </Chip>
        <Chip active={scope === 'done'} onClick={() => setScope('done')}>
          {t('admin.trips.done')}
        </Chip>
      </div>

      <Panel className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-muted text-xs border-b border-border">
              <th className="text-start font-bold p-4">#</th>
              <th className="text-start font-bold p-4">{t('admin.route')}</th>
              <th className="text-start font-bold p-4">{t('admin.status')}</th>
              <th className="text-start font-bold p-4">{t('common.total')}</th>
              <th className="text-start font-bold p-4">{t('admin.time')}</th>
              <th className="p-4" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows === null && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-muted">{t('common.loading')}</td>
              </tr>
            )}
            {rows && rows.length === 0 && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-muted">{t('admin.trips.empty')}</td>
              </tr>
            )}
            {(rows ?? []).map((r) => (
              <tr key={r.id} className="hover:bg-surface/60">
                <td className="p-4 font-black">{r.id}</td>
                <td className="p-4 max-w-[340px]">
                  <p className="truncate font-medium">{r.from || '—'}</p>
                  <p className="truncate text-xs text-muted">{r.to || '—'}</p>
                </td>
                <td className="p-4">
                  <Pill tone={statusTone(r.status)}>{t(`status.${kind}.${r.status}` as any)}</Pill>
                  {r.coupon && <p className="text-[11px] text-muted mt-1" dir="ltr">{r.coupon}</p>}
                </td>
                <td className="p-4 font-bold whitespace-nowrap">{money(r.amount, r.cur, locale)}</td>
                <td className="p-4 text-xs text-muted whitespace-nowrap">{dateTime(r.at, locale)}</td>
                <td className="p-4 text-end">
                  {scope === 'active' && (
                    <Button size="sm" variant="danger" onClick={() => setCancel(r)}>
                      {t('admin.trips.cancel')}
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>

      <Modal open={!!cancel} onClose={() => setCancel(null)} title={`${t('admin.trips.cancel')} #${cancel?.id ?? ''}`}>
        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-bold">{t('admin.trips.cancel_reason')}</span>
            <input value={reason} onChange={(e) => setReason(e.target.value)} className={inputCls} />
          </label>
          <Button variant="danger" full loading={busy} onClick={doCancel}>
            {t('admin.trips.cancel')}
          </Button>
        </div>
      </Modal>
      {toastNode}
    </>
  );
}
