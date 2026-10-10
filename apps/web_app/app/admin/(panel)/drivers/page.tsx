'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Phone, Star } from 'lucide-react';
import { Modal, PageHead, Panel, Pill, statusTone } from '@/components/admin';
import { Button, Chip, inputCls, useToast } from '@/components/ui';
import { useI18n } from '@/lib/i18n';
import { sb } from '@/lib/hooks';
import { dateTime } from '@/lib/format';

const FILTERS = ['PENDING', 'APPROVED', 'SUSPENDED', 'REJECTED', 'BLOCKED', 'ALL'] as const;

export default function DriversAdmin() {
  const { t, locale, pick } = useI18n();
  const [rows, setRows] = useState<any[] | null>(null);
  const [cities, setCities] = useState<Record<number, any>>({});
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('PENDING');
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<any>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const { toast, toastNode } = useToast();

  const load = useCallback(async () => {
    const { data } = await sb().from('drivers').select('*, vehicles(*)').order('created_at', { ascending: false }).limit(500);
    setRows((data ?? []).filter((d: any) => d.license_number !== 'DEMO-0001'));
  }, []);

  useEffect(() => {
    load();
    sb().from('cities').select('id,name,name_ar').then(({ data }) => setCities(Object.fromEntries((data ?? []).map((c: any) => [c.id, c]))));
  }, [load]);

  const shown = useMemo(
    () =>
      (rows ?? []).filter(
        (d) =>
          (filter === 'ALL' || d.status === filter) &&
          (!q || `${d.display_name} ${d.phone} ${d.vehicles?.plate_number ?? ''}`.toLowerCase().includes(q.toLowerCase())),
      ),
    [rows, filter, q],
  );
  const count = (s: string) => (rows ?? []).filter((d) => s === 'ALL' || d.status === s).length;

  async function setStatus(status: string) {
    if (!open) return;
    setBusy(status);
    const { error } = await sb().rpc('admin_set_driver_status', { p_driver: open.id, p_status: status, p_note: note.trim() || null });
    setBusy(null);
    if (error) return toast(t('admin.save_failed', { msg: error.message }));
    toast(t('admin.saved'));
    setOpen(null);
    load();
  }

  return (
    <>
      <PageHead title={t('admin.nav.drivers')} />
      <div className="flex flex-wrap gap-2 mb-4">
        {FILTERS.map((f) => (
          <Chip key={f} active={filter === f} onClick={() => setFilter(f)}>
            {f === 'ALL' ? t('common.all') : t(`admin.driver_status.${f}` as any)} ({count(f)})
          </Chip>
        ))}
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('admin.users.search')} className={`${inputCls} h-9 max-w-xs ms-auto`} />
      </div>

      <Panel className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-start text-muted text-xs border-b border-border">
              <th className="text-start font-bold p-4">{t('driver.full_name')}</th>
              <th className="text-start font-bold p-4">{t('driver.vehicle_type')}</th>
              <th className="text-start font-bold p-4">{t('driver.city')}</th>
              <th className="text-start font-bold p-4">{t('admin.rating')}</th>
              <th className="text-start font-bold p-4">{t('admin.status')}</th>
              <th className="p-4" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows && shown.length === 0 && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-muted">
                  {t('admin.drivers.empty')}
                </td>
              </tr>
            )}
            {shown.map((d) => (
              <tr key={d.id} className="hover:bg-surface/60">
                <td className="p-4">
                  <p className="font-bold">{d.display_name}</p>
                  <p className="text-xs text-muted" dir="ltr">{d.phone}</p>
                </td>
                <td className="p-4">
                  <p className="font-medium">{d.vehicles ? t(`vehicle.${d.vehicles.vehicle_type}` as any) : '—'}</p>
                  <p className="text-xs text-muted" dir="auto">
                    {[d.vehicles?.color, d.vehicles?.manufacturer, d.vehicles?.model].filter(Boolean).join(' ')} {d.vehicles?.plate_number}
                  </p>
                </td>
                <td className="p-4">{cities[d.city_id] ? pick(cities[d.city_id].name_ar, cities[d.city_id].name) : '—'}</td>
                <td className="p-4">
                  <span className="inline-flex items-center gap-1 font-bold">
                    <Star className="w-4 h-4 fill-accent text-accent" />
                    {Number(d.rating ?? 5).toFixed(1)}
                  </span>
                  <p className="text-xs text-muted">{t('admin.trips_n', { n: d.total_trips ?? 0 })}</p>
                </td>
                <td className="p-4">
                  <div className="flex flex-col items-start gap-1">
                    <Pill tone={statusTone(d.status)}>{t(`admin.driver_status.${d.status}` as any)}</Pill>
                    {d.is_online && <Pill tone="live">{t('driver.online')}</Pill>}
                  </div>
                </td>
                <td className="p-4 text-end">
                  <Button size="sm" variant={d.status === 'PENDING' ? 'primary' : 'soft'} onClick={() => (setOpen(d), setNote(d.admin_notes ?? ''))}>
                    {d.status === 'PENDING' ? t('admin.review') : t('common.edit')}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>

      <Modal open={!!open} onClose={() => setOpen(null)} title={open?.display_name ?? ''}>
        {open && (
          <div className="flex flex-col gap-4">
            <div className="rounded-2xl bg-surface p-4 grid grid-cols-2 gap-3 text-sm">
              <Info label={t('driver.phone')} value={<a href={`tel:${open.phone}`} className="inline-flex items-center gap-1 font-bold" dir="ltr"><Phone className="w-3.5 h-3.5" />{open.phone}</a>} />
              <Info label={t('driver.city')} value={cities[open.city_id] ? pick(cities[open.city_id].name_ar, cities[open.city_id].name) : '—'} />
              <Info label={t('driver.vehicle_type')} value={open.vehicles ? t(`vehicle.${open.vehicles.vehicle_type}` as any) : '—'} />
              <Info label={t('driver.plate')} value={open.vehicles?.plate_number ?? '—'} />
              <Info label={t('driver.make')} value={[open.vehicles?.manufacturer, open.vehicles?.model].filter(Boolean).join(' ') || '—'} />
              <Info label={t('driver.color')} value={open.vehicles?.color ?? '—'} />
              <Info label={t('admin.applied')} value={dateTime(open.created_at, locale)} />
              <Info label={t('admin.status')} value={<Pill tone={statusTone(open.status)}>{t(`admin.driver_status.${open.status}` as any)}</Pill>} />
            </div>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-bold">{t('admin.drivers.note_ph')}</span>
              <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} className={`${inputCls} h-auto py-3`} />
            </label>
            <div className="grid grid-cols-2 gap-2">
              {open.status !== 'APPROVED' && (
                <Button size="md" className="col-span-2" loading={busy === 'APPROVED'} onClick={() => setStatus('APPROVED')}>
                  {open.status === 'PENDING' ? t('admin.drivers.approve') : t('admin.drivers.reactivate')}
                </Button>
              )}
              {open.status === 'PENDING' && (
                <Button size="md" variant="danger" loading={busy === 'REJECTED'} onClick={() => setStatus('REJECTED')}>
                  {t('admin.drivers.reject')}
                </Button>
              )}
              {open.status === 'APPROVED' && (
                <Button size="md" variant="soft" loading={busy === 'SUSPENDED'} onClick={() => setStatus('SUSPENDED')}>
                  {t('admin.drivers.suspend')}
                </Button>
              )}
              {open.status !== 'BLOCKED' && (
                <Button size="md" variant="danger" loading={busy === 'BLOCKED'} onClick={() => setStatus('BLOCKED')}>
                  {t('admin.drivers.block')}
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>
      {toastNode}
    </>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-muted">{label}</p>
      <div className="font-bold truncate" dir="auto">{value}</div>
    </div>
  );
}
