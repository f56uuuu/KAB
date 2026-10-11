'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { BellOff } from 'lucide-react';
import { Empty, TopBar } from '@/components/ui';
import { useI18n } from '@/lib/i18n';
import { currentUser, sb, useStickyState } from '@/lib/hooks';
import { jobHref, type JobKind } from '@/lib/jobs';
import { timeAgo } from '@/lib/format';

const ICON: Record<string, string> = { ride: '🚖', delivery: '📦', order: '🛍️' };

export default function NotificationsPage() {
  const { t, pick, locale } = useI18n();
  const [items, setItems] = useStickyState<any[] | null>('notif.items', null);
  const [uid, setUid] = useState<string | null>(null);

  async function load() {
    const user = await currentUser();
    if (!user) return;
    setUid(user.id);
    const { data } = await sb().from('notifications').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(100);
    setItems(data ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  async function markAll() {
    if (!uid) return;
    await sb().from('notifications').update({ is_read: true }).eq('user_id', uid).eq('is_read', false);
    setItems((xs) => (xs ?? []).map((x) => ({ ...x, is_read: true })));
  }

  const unread = (items ?? []).some((x) => !x.is_read);

  return (
    <main className="min-h-screen bg-background pb-10">
      <TopBar
        back="/home"
        title={t('notif.title')}
        right={
          unread ? (
            <button onClick={markAll} className="text-sm font-bold text-muted">
              {t('notif.mark_all')}
            </button>
          ) : null
        }
      />
      <div className="max-w-md md:max-w-2xl lg:max-w-3xl mx-auto px-5">
        {items && items.length === 0 && <Empty icon={<BellOff className="w-7 h-7" />} title={t('notif.empty')} />}
        <ul className="divide-y divide-border">
          {(items ?? []).map((n) => {
            const [kind, id] = String(n.reference_id ?? '').split(':');
            const href = id && ['ride', 'delivery', 'order'].includes(kind) ? jobHref(kind as JobKind, id) : '/home';
            return (
              <li key={n.id}>
                <Link
                  href={href}
                  onClick={() => !n.is_read && sb().from('notifications').update({ is_read: true }).eq('id', n.id).then(() => {})}
                  className="flex gap-3 py-4"
                >
                  <span className="relative w-11 h-11 rounded-full bg-surface flex items-center justify-center text-xl shrink-0">
                    {ICON[kind] ?? '🔔'}
                    {!n.is_read && <span className="absolute top-0 end-0 w-3 h-3 rounded-full bg-accent ring-2 ring-background" />}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className={`leading-snug ${n.is_read ? 'font-medium' : 'font-extrabold'}`}>{pick(n.title_ar, n.title)}</p>
                    <p className="text-xs text-muted mt-0.5">{timeAgo(n.created_at, locale)}</p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </main>
  );
}
