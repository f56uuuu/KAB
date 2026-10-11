'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ReceiptText } from 'lucide-react';
import { BottomNav } from '@/components/BottomNav';
import { Chip, Empty, TopBar } from '@/components/ui';
import { useI18n } from '@/lib/i18n';
import { sb } from '@/lib/hooks';
import { isActive, jobHref, type JobKind } from '@/lib/jobs';
import { dateTime, money } from '@/lib/format';

type Item = { kind: JobKind; id: number; status: string; title: string; sub: string; amount: number; currency: string; at: string; emoji: string };

export default function ActivityPage() {
  const { t, pick, locale } = useI18n();
  const [items, setItems] = useState<Item[] | null>(null);
  const [tab, setTab] = useState<'all' | JobKind>('all');

  useEffect(() => {
    (async () => {
      const s = sb();
      const {
        data: { user },
      } = await s.auth.getUser();
      if (!user) return;
      const [r, d, o] = await Promise.all([
        s.from('rides').select('*').eq('customer_id', user.id).order('created_at', { ascending: false }).limit(50),
        s.from('deliveries').select('*').eq('customer_id', user.id).order('created_at', { ascending: false }).limit(50),
        s.from('orders').select('*, stores(name,name_ar,emoji)').eq('customer_id', user.id).order('created_at', { ascending: false }).limit(50),
      ]);
      const list: Item[] = [
        ...(r.data ?? []).map((x: any) => ({
          kind: 'ride' as const, id: x.id, status: x.status, title: x.dropoff_address ?? '', sub: x.pickup_address ?? '',
          amount: +(x.final_fare ?? x.estimated_fare ?? 0), currency: x.currency_code, at: x.created_at, emoji: '🚖',
        })),
        ...(d.data ?? []).map((x: any) => ({
          kind: 'delivery' as const, id: x.id, status: x.status, title: x.dropoff_location ?? '', sub: x.package_description ?? '',
          amount: +(x.final_fare ?? x.estimated_fare ?? 0), currency: x.currency_code, at: x.created_at, emoji: '📦',
        })),
        ...(o.data ?? []).map((x: any) => ({
          kind: 'order' as const, id: x.id, status: x.status, title: x.stores ? pick(x.stores.name_ar, x.stores.name) : '',
          sub: x.delivery_address ?? '', amount: +x.total_amount, currency: x.currency_code, at: x.created_at, emoji: x.stores?.emoji ?? '🛍️',
        })),
      ].sort((a, b) => +new Date(b.at) - +new Date(a.at));
      setItems(list);
    })();
  }, [pick]);

  const shown = useMemo(() => (items ?? []).filter((i) => tab === 'all' || i.kind === tab), [items, tab]);
  const live = shown.filter((i) => isActive(i.kind, i.status));
  const past = shown.filter((i) => !isActive(i.kind, i.status));

  const row = (i: Item) => (
    <li key={`${i.kind}${i.id}`}>
      <Link href={jobHref(i.kind, i.id)} className="flex items-center gap-3 py-3.5">
        <span className="w-12 h-12 rounded-2xl bg-surface flex items-center justify-center text-2xl shrink-0">{i.emoji}</span>
        <div className="flex-1 min-w-0">
          <p className="font-extrabold truncate">{i.title || t(`kind.${i.kind}` as any)}</p>
          <p className={`text-xs truncate ${i.status === 'CANCELLED' ? 'text-danger' : isActive(i.kind, i.status) ? 'text-fg font-bold' : 'text-muted'}`}>
            {t(`status.${i.kind}.${i.status}` as any)}
          </p>
          <p className="text-[11px] text-muted">{dateTime(i.at, locale)}</p>
        </div>
        <span className="font-black text-sm shrink-0">{money(i.amount, i.currency, locale)}</span>
      </Link>
    </li>
  );

  return (
    <main className="min-h-screen bg-background pb-28">
      <TopBar title={t('activity.title')} />
      <div className="max-w-md md:max-w-2xl lg:max-w-3xl mx-auto px-5">
        <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-5 px-5 pb-2">
          {(['all', 'ride', 'order', 'delivery'] as const).map((k) => (
            <Chip key={k} active={tab === k} onClick={() => setTab(k)}>
              {k === 'all' ? t('common.all') : k === 'ride' ? t('activity.rides') : k === 'order' ? t('activity.orders') : t('activity.deliveries')}
            </Chip>
          ))}
        </div>
        {items === null ? (
          <div className="flex flex-col gap-3 mt-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-16 rounded-2xl bg-surface animate-pulse" />
            ))}
          </div>
        ) : shown.length === 0 ? (
          <Empty icon={<ReceiptText className="w-7 h-7" />} title={t('activity.empty')} sub={t('activity.empty_sub')} />
        ) : (
          <>
            {live.length > 0 && (
              <section className="mt-3">
                <h2 className="text-sm font-extrabold text-muted">{t('activity.active')}</h2>
                <ul className="divide-y divide-border">{live.map(row)}</ul>
              </section>
            )}
            {past.length > 0 && (
              <section className="mt-3">
                <h2 className="text-sm font-extrabold text-muted">{t('activity.past')}</h2>
                <ul className="divide-y divide-border">{past.map(row)}</ul>
              </section>
            )}
          </>
        )}
      </div>
      <BottomNav />
    </main>
  );
}
