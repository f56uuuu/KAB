'use client';

import { useEffect, useMemo, useState } from 'react';
import { PageHead, Panel, Pill } from '@/components/admin';
import { inputCls } from '@/components/ui';
import { useI18n } from '@/lib/i18n';
import { sb } from '@/lib/hooks';
import { dateTime } from '@/lib/format';

function diff(o: any, n: any) {
  if (!o || !n) return n ? JSON.stringify(n).slice(0, 160) : '';
  const keys = Object.keys(n).filter((k) => !['updated_at', 'created_at'].includes(k) && JSON.stringify(o[k]) !== JSON.stringify(n[k]));
  return keys.map((k) => `${k}: ${JSON.stringify(o[k])} → ${JSON.stringify(n[k])}`).join(' · ').slice(0, 220);
}

export default function AuditAdmin() {
  const { t, locale } = useI18n();
  const [rows, setRows] = useState<any[] | null>(null);
  const [q, setQ] = useState('');
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    sb()
      .rpc('admin_audit', { p_limit: 300 })
      .then(({ data, error }) => {
        if (error) setErr(error.message);
        setRows(Array.isArray(data) ? data : []);
      });
  }, []);

  const shown = useMemo(
    () => (rows ?? []).filter((r) => !q || `${r.action} ${r.entity_type} ${r.entity_id} ${r.actor}`.toLowerCase().includes(q.toLowerCase())),
    [rows, q],
  );

  return (
    <>
      <PageHead
        title={t('admin.nav.audit')}
        sub={t('admin.audit.sub')}
        action={<input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('common.search')} className={`${inputCls} h-10 w-64`} />}
      />
      {err && <p className="text-danger text-sm font-bold mb-3">{err}</p>}
      <Panel className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-muted text-xs border-b border-border">
              <th className="text-start font-bold p-4">{t('admin.time')}</th>
              <th className="text-start font-bold p-4">{t('admin.audit.who')}</th>
              <th className="text-start font-bold p-4">{t('admin.audit.what')}</th>
              <th className="text-start font-bold p-4">{t('admin.audit.change')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows === null && (
              <tr>
                <td colSpan={4} className="p-8 text-center text-muted">{t('common.loading')}</td>
              </tr>
            )}
            {rows && shown.length === 0 && (
              <tr>
                <td colSpan={4} className="p-8 text-center text-muted">{t('admin.audit.empty')}</td>
              </tr>
            )}
            {shown.map((r) => (
              <tr key={r.id} className="align-top">
                <td className="p-4 text-xs text-muted whitespace-nowrap">{dateTime(r.created_at, locale)}</td>
                <td className="p-4 font-bold">{r.actor ?? '—'}</td>
                <td className="p-4">
                  <Pill tone="idle">{r.action}</Pill>
                  <p className="text-xs text-muted mt-1" dir="ltr">
                    {r.entity_type} #{r.entity_id}
                  </p>
                </td>
                <td className="p-4 text-xs font-mono text-muted max-w-[480px] break-words" dir="ltr">
                  {diff(r.old_value, r.new_value)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </>
  );
}
