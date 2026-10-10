'use client';

import { useCallback, useEffect, useState } from 'react';
import { PageHead, Panel, Pill, useAdmin } from '@/components/admin';
import { Button, inputCls, useToast } from '@/components/ui';
import { useI18n } from '@/lib/i18n';
import { sb } from '@/lib/hooks';
import { dateTime } from '@/lib/format';

export default function UsersAdmin() {
  const { t, locale } = useI18n();
  const me = useAdmin();
  const [rows, setRows] = useState<any[] | null>(null);
  const [q, setQ] = useState('');
  const { toast, toastNode } = useToast();

  const load = useCallback(async () => {
    let query = sb().from('profiles').select('id,first_name,last_name,phone_number,role,is_active,created_at').order('created_at', { ascending: false }).limit(200);
    const term = q.trim().replace(/[%,()]/g, '');
    if (term) query = query.or(`first_name.ilike.%${term}%,phone_number.ilike.%${term}%`);
    const { data } = await query;
    setRows(data ?? []);
  }, [q]);

  useEffect(() => {
    const id = setTimeout(load, 300);
    return () => clearTimeout(id);
  }, [load]);

  async function patch(id: string, values: any) {
    const { error } = await sb().from('profiles').update(values).eq('id', id);
    if (error) return toast(t('admin.save_failed', { msg: error.message }));
    toast(t('admin.saved'));
    load();
  }

  return (
    <>
      <PageHead title={t('admin.nav.users')} action={<input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('admin.users.search')} className={`${inputCls} h-10 w-64`} />} />
      <Panel className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-muted text-xs border-b border-border">
              <th className="text-start font-bold p-4">{t('driver.full_name')}</th>
              <th className="text-start font-bold p-4">{t('admin.users.role')}</th>
              <th className="text-start font-bold p-4">{t('admin.users.joined')}</th>
              <th className="p-4" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {(rows ?? []).map((u) => {
              const isAdmin = u.role === 'admin' || u.role === 'super_admin';
              const self = u.id === me?.id;
              return (
                <tr key={u.id} className={u.is_active === false ? 'opacity-50' : ''}>
                  <td className="p-4">
                    <p className="font-bold">{[u.first_name, u.last_name].filter(Boolean).join(' ') || '—'}</p>
                    <p className="text-xs text-muted" dir="ltr">{u.phone_number || t('admin.users.guest')}</p>
                  </td>
                  <td className="p-4">
                    <Pill tone={isAdmin ? 'live' : 'idle'}>{u.role ?? 'customer'}</Pill>
                  </td>
                  <td className="p-4 text-xs text-muted whitespace-nowrap">{dateTime(u.created_at, locale)}</td>
                  <td className="p-4">
                    {!self && (
                      <div className="flex gap-2 justify-end">
                        {u.role !== 'super_admin' && (
                          <Button size="sm" variant="soft" onClick={() => patch(u.id, { role: isAdmin ? 'customer' : 'admin' })}>
                            {isAdmin ? t('admin.users.remove_admin') : t('admin.users.make_admin')}
                          </Button>
                        )}
                        <Button size="sm" variant={u.is_active === false ? 'soft' : 'danger'} onClick={() => patch(u.id, { is_active: u.is_active === false })}>
                          {u.is_active === false ? t('admin.users.enable') : t('admin.users.disable')}
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Panel>
      {toastNode}
    </>
  );
}
