'use client';

import { useState } from 'react';
import { Megaphone } from 'lucide-react';
import { PageHead, Panel } from '@/components/admin';
import { Button, Chip, Field, inputCls, useToast } from '@/components/ui';
import { useI18n } from '@/lib/i18n';
import { sb } from '@/lib/hooks';

const AUDIENCES = ['all', 'customers', 'drivers'] as const;

export default function BroadcastAdmin() {
  const { t } = useI18n();
  const [ar, setAr] = useState('');
  const [en, setEn] = useState('');
  const [aud, setAud] = useState<(typeof AUDIENCES)[number]>('all');
  const [busy, setBusy] = useState(false);
  const { toast, toastNode } = useToast();

  async function send() {
    setBusy(true);
    const { data, error } = await sb().rpc('admin_broadcast', { p_title: en.trim(), p_title_ar: ar.trim(), p_audience: aud });
    setBusy(false);
    if (error) return toast(t('admin.save_failed', { msg: error.message }));
    toast(t('admin.broadcast.sent', { n: Number(data ?? 0) }));
    setAr('');
    setEn('');
  }

  return (
    <>
      <PageHead title={t('admin.nav.broadcast')} sub={t('admin.broadcast.sub')} />
      <div className="grid lg:grid-cols-2 gap-4 max-w-5xl">
        <Panel className="p-5 flex flex-col gap-4">
          <div>
            <p className="text-sm font-bold mb-2">{t('admin.broadcast.audience')}</p>
            <div className="flex gap-2 flex-wrap">
              {AUDIENCES.map((a) => (
                <Chip key={a} active={aud === a} onClick={() => setAud(a)}>
                  {t(`admin.broadcast.aud.${a}` as any)}
                </Chip>
              ))}
            </div>
          </div>
          <Field label={t('admin.promos.title_ar')}>
            <textarea value={ar} onChange={(e) => setAr(e.target.value)} rows={2} maxLength={200} className={`${inputCls} h-auto py-3`} dir="rtl" />
          </Field>
          <Field label={t('admin.promos.title_en')}>
            <textarea value={en} onChange={(e) => setEn(e.target.value)} rows={2} maxLength={200} className={`${inputCls} h-auto py-3`} dir="ltr" />
          </Field>
          <Button full loading={busy} disabled={!ar.trim() && !en.trim()} onClick={send}>
            <Megaphone className="w-5 h-5" />
            {t('admin.broadcast.send')}
          </Button>
        </Panel>
        <Panel title={t('admin.broadcast.preview')} className="pb-5">
          <div className="mx-5 rounded-3xl bg-ink p-4 text-white">
            <div className="rounded-2xl bg-white/10 p-3 flex gap-3 items-start">
              <span className="w-9 h-9 rounded-xl bg-accent text-ink font-black flex items-center justify-center shrink-0">K</span>
              <div className="min-w-0">
                <p className="text-xs text-white/60 font-bold">KAP</p>
                <p className="font-bold leading-snug break-words" dir="auto">
                  {ar || en || t('admin.broadcast.placeholder')}
                </p>
              </div>
            </div>
          </div>
        </Panel>
      </div>
      {toastNode}
    </>
  );
}
