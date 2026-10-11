'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { KapMap, type MapMarker } from '@/components/KapMap';
import { PageHead, Panel, Pill } from '@/components/admin';
import { useI18n } from '@/lib/i18n';
import { sb } from '@/lib/hooks';
import { money, num } from '@/lib/format';

const SERIES = [
  { key: 'rides', color: '#FFD100', label: 'activity.rides' },
  { key: 'orders', color: '#0D0D0F', darkColor: '#F2F2F2', label: 'activity.orders' },
  { key: 'deliveries', color: '#A1A1A1', label: 'activity.deliveries' },
] as const;
const EMOJI: Record<string, string> = { ride: '🚖', delivery: '📦', order: '🛍️' };

export default function Overview() {
  const { t, locale } = useI18n();
  const [o, setO] = useState<any>(null);
  const [live, setLive] = useState<any>({ drivers: [], jobs: [] });
  const [pending, setPending] = useState<any[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const [{ data, error }, l] = await Promise.all([sb().rpc('admin_overview'), sb().rpc('admin_live')]);
      if (error) setErr(error.message);
      if (data) setO(data);
      if (l.data) setLive(l.data);
    };
    load();
    sb().from('drivers').select('id,display_name,phone,created_at').eq('status', 'PENDING').order('created_at', { ascending: false }).limit(5).then(({ data }) => setPending(data ?? []));
    const iv = setInterval(load, 10000);
    return () => clearInterval(iv);
  }, []);

  const markers = useMemo<MapMarker[]>(
    () => [
      ...(live.drivers ?? []).map((d: any) => ({
        id: `d${d.id}`,
        kind: d.type === 'BIKE' ? 'bike' : 'car',
        lat: +d.lat,
        lng: +d.lng,
        dim: !d.online,
      })),
      ...(live.jobs ?? []).filter((j: any) => j.lat).map((j: any) => ({ id: `${j.kind}${j.id}`, kind: 'job', lat: +j.lat, lng: +j.lng, emoji: EMOJI[j.kind] })),
    ] as MapMarker[],
    [live],
  );

  const days: any[] = o?.last7 ?? [];
  const max = Math.max(1, ...days.map((d) => d.rides + d.orders + d.deliveries));
  const revenue: any[] = o?.revenue_today ?? [];
  const active = (o?.active_rides ?? 0) + (o?.active_orders ?? 0) + (o?.active_deliveries ?? 0);
  const today = (o?.rides_today ?? 0) + (o?.orders_today ?? 0) + (o?.deliveries_today ?? 0);

  return (
    <>
      <PageHead title={t('admin.nav.overview')} sub={new Date().toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' })} />
      {err && <p className="mb-4 text-danger text-sm font-bold">{err}</p>}

      <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,190px),1fr))] gap-3 lg:gap-4">
        <Kpi label={t('admin.kpi.active')} value={num(active, locale)} hint={`${t('activity.rides')} ${num(o?.active_rides ?? 0, locale)} / ${t('activity.orders')} ${num(o?.active_orders ?? 0, locale)}`} accent />
        <Kpi label={t('admin.kpi.today')} value={num(today, locale)} hint={`${t('activity.deliveries')} ${num(o?.deliveries_today ?? 0, locale)}`} />
        <Kpi
          label={t('admin.kpi.revenue')}
          value={revenue.length ? revenue.map((r) => money(r.amount, r.currency, locale)).join(' + ') : money(0, 'IQD', locale)}
        />
        <Kpi label={t('admin.kpi.online')} value={num(o?.drivers_online ?? 0, locale)} hint={`${t('admin.kpi.drivers')} ${num(o?.drivers ?? 0, locale)}`} />
        <Kpi label={t('admin.kpi.users')} value={num(o?.users ?? 0, locale)} hint={t('admin.kpi.new_today', { n: num(o?.new_users_today ?? 0, locale) })} />
        <Kpi label={t('admin.kpi.drivers')} value={num(o?.drivers ?? 0, locale)} hint={t('admin.kpi.pending', { n: num(o?.drivers_pending ?? 0, locale) })} href="/admin/drivers" warn={(o?.drivers_pending ?? 0) > 0} />
        <Kpi label={t('admin.kpi.stores')} value={num(o?.stores ?? 0, locale)} href="/admin/stores" />
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,460px),1fr))] gap-4 mt-4">
        <Panel className="overflow-hidden" title={t('admin.live')}>
          <p className="px-5 -mt-1 pb-3 text-xs text-muted">{t('admin.live_sub')}</p>
          <div className="relative h-[380px]">
            <KapMap className="absolute inset-0" markers={markers} fitKey={markers.length} zoom={11} />
          </div>
        </Panel>

        <div className="flex flex-col gap-4 min-w-0">
          <Panel title={t('admin.chart.title')}>
            <div className="px-5 pb-5">
              <div className="flex gap-4 text-xs font-bold mb-3">
                {SERIES.map((s) => (
                  <span key={s.key} className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm border border-border" style={{ background: s.color }} />
                    {t(s.label as any)}
                  </span>
                ))}
              </div>
              <div className="h-44 flex items-end gap-2" dir="ltr" role="img" aria-label={t('admin.chart.title')}>
                {days.map((d) => {
                  const total = d.rides + d.orders + d.deliveries;
                  return (
                    <div key={d.day} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                      <span className="text-[11px] font-bold text-muted">{total || ''}</span>
                      <div className="w-full max-w-[36px] rounded-md overflow-hidden flex flex-col-reverse bg-surface" style={{ height: `${Math.max(4, (total / max) * 100)}%` }} title={`${d.day}: ${total}`}>
                        {SERIES.map((s) => (
                          <div key={s.key} style={{ height: `${total ? (d[s.key] / total) * 100 : 0}%`, background: s.color }} className={s.key === 'orders' ? 'dark:!bg-[#F2F2F2]' : ''} />
                        ))}
                      </div>
                      <span className="text-[11px] text-muted">{new Date(d.day + 'T12:00').toLocaleDateString(locale, { weekday: 'short' })}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </Panel>

          <Panel title={t('admin.drivers.pending')} action={<Link href="/admin/drivers" className="text-sm font-bold text-muted">{t('admin.view_all')}</Link>}>
            <ul className="px-5 pb-3 divide-y divide-border">
              {pending.length === 0 && <li className="py-4 text-sm text-muted">{t('admin.none_pending')}</li>}
              {pending.map((d) => (
                <li key={d.id} className="py-3 flex items-center gap-3">
                  <span className="w-9 h-9 rounded-full bg-accent text-ink font-black flex items-center justify-center">{(d.display_name || '?').charAt(0)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold truncate">{d.display_name}</p>
                    <p className="text-xs text-muted" dir="ltr">{d.phone}</p>
                  </div>
                  <Pill tone="warn">{t('admin.driver_status.PENDING')}</Pill>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>
    </>
  );
}

function Kpi({ label, value, hint, accent, warn, href }: { label: string; value: string; hint?: string; accent?: boolean; warn?: boolean; href?: string }) {
  const body = (
    <div className={`h-full rounded-2xl p-4 lg:p-5 border ${accent ? 'bg-ink text-white border-ink kap-slash thin overflow-hidden relative' : 'bg-raised border-border'}`}>
      <p className={`text-xs font-bold relative z-10 ${accent ? 'text-white/60' : 'text-muted'}`}>{label}</p>
      <p className="text-2xl lg:text-3xl font-black mt-1 relative z-10 break-words">{value}</p>
      {hint && <p className={`text-xs mt-1 relative z-10 ${warn ? 'text-warning font-bold' : accent ? 'text-white/60' : 'text-muted'}`}>{hint}</p>}
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}
