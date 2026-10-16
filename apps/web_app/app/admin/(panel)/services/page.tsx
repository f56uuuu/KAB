'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Lock, Search, ShieldCheck } from 'lucide-react';
import { PageHead, Panel, useAdmin } from '@/components/admin';
import { Switch, useToast } from '@/components/ui';
import { FEATURES, GROUPS, isOn, type Feature } from '@/lib/features';
import { sb } from '@/lib/hooks';
import { useI18n } from '@/lib/i18n';

const TX = {
  ar: {
    title: 'الخدمات والميزات',
    sub: 'شغّل أو أوقف أي جزء من التطبيق. يُطبَّق التغيير على جميع المستخدمين خلال ثوانٍ، ويُسجَّل في سجل العمليات.',
    search: 'ابحث عن ميزة',
    count: '{on} من {all} مفعّلة',
    on: 'مفعّلة',
    off: 'متوقفة',
    soon: 'قريبًا',
    server: 'مُطبَّقة في النظام أيضًا',
    needs: 'تعمل فقط عند تشغيل «{x}»',
    maint: 'وضع الصيانة',
    maintSub: 'يغلق التطبيق أمام الزبائن والكباتن ويعرض رسالة صيانة. لوحة الإدارة تبقى تعمل.',
    savedOn: 'تم التشغيل: {x}',
    savedOff: 'تم الإيقاف: {x}',
    failed: 'لم يُحفظ التغيير. حاول مرة أخرى.',
    readOnly: 'التعديل هنا للمدير العام فقط.',
    demoWarn: 'وضع التجربة مفعّل: كباتن ومطاعم وهميون يقبلون الطلبات تلقائيًا. أوقفه قبل الإطلاق.',
    none: 'لا توجد ميزة بهذا الاسم.',
  },
  en: {
    title: 'Services & features',
    sub: 'Turn any part of the app on or off. Changes reach every user within seconds and are recorded in the audit log.',
    search: 'Search features',
    count: '{on} of {all} on',
    on: 'On',
    off: 'Off',
    soon: 'Soon',
    server: 'Also enforced by the system',
    needs: 'Works only while “{x}” is on',
    maint: 'Maintenance mode',
    maintSub: 'Closes the app for customers and captains with a maintenance message. The admin panel keeps working.',
    savedOn: 'Turned on: {x}',
    savedOff: 'Turned off: {x}',
    failed: "Couldn't save. Try again.",
    readOnly: 'Only the super admin can change these.',
    demoWarn: 'Demo mode is on: fake captains and stores accept orders automatically. Turn it off before launch.',
    none: 'No feature with that name.',
  },
};

const PARENT: Record<string, string> = { PHARMACY: 'MARKET', GIFTS: 'MARKET' };

export default function FeaturesAdmin() {
  const { lang } = useI18n();
  const ar = lang === 'ar' || lang === 'ku';
  const tx = ar ? TX.ar : TX.en;
  const me = useAdmin();
  const canEdit = me?.role === 'super_admin';
  const { toast, toastNode } = useToast();
  const [flags, setFlags] = useState<Record<string, boolean> | null>(null);
  const [maint, setMaint] = useState<boolean | null>(null);
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    sb()
      .from('feature_flags')
      .select('name,is_enabled')
      .then(({ data }) => setFlags(Object.fromEntries((data ?? []).map((r: any) => [r.name, !!r.is_enabled]))));
    sb()
      .from('settings')
      .select('key,value')
      .eq('key', 'maintenance_mode')
      .maybeSingle()
      .then(({ data }) => setMaint(String((data as any)?.value ?? '') === 'on'));
  }, []);

  const name = (f: Feature) => (ar ? f.ar : f.en);
  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    return FEATURES.filter((f) => !s || f.ar.includes(s) || f.en.toLowerCase().includes(s) || f.key.toLowerCase().includes(s));
  }, [q]);
  const total = FEATURES.length;
  const onCount = FEATURES.filter((f) => isOn(flags, f.key)).length;

  async function toggle(f: Feature, v: boolean) {
    if (!canEdit) return toast(tx.readOnly);
    setBusy(f.key);
    setFlags((x) => ({ ...(x ?? {}), [f.key]: v }));
    const { error } = await sb().from('feature_flags').upsert({ name: f.key, is_enabled: v, description: f.en }, { onConflict: 'name' });
    setBusy(null);
    if (error) {
      setFlags((x) => ({ ...(x ?? {}), [f.key]: !v }));
      return toast(tx.failed);
    }
    toast((v ? tx.savedOn : tx.savedOff).replace('{x}', name(f)));
  }

  async function toggleMaint(v: boolean) {
    if (!canEdit) return toast(tx.readOnly);
    setMaint(v);
    const { error } = await sb().from('settings').upsert({ key: 'maintenance_mode', value: v ? 'on' : 'off' }, { onConflict: 'key' });
    if (error) {
      setMaint(!v);
      return toast(tx.failed);
    }
    toast((v ? tx.savedOn : tx.savedOff).replace('{x}', tx.maint));
  }

  return (
    <>
      <PageHead title={tx.title} sub={tx.sub} />

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <label className="relative flex-1 min-w-[220px] max-w-sm">
          <Search className="w-4 h-4 text-muted absolute top-1/2 -translate-y-1/2 start-3" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={tx.search} className="w-full h-11 rounded-xl border border-border bg-background ps-9 pe-3 outline-none focus:border-fg" />
        </label>
        {flags && <span className="text-sm text-muted">{tx.count.replace('{on}', String(onCount)).replace('{all}', String(total))}</span>}
        {!canEdit && me && (
          <span className="text-sm text-muted flex items-center gap-1.5">
            <Lock className="w-4 h-4" />
            {tx.readOnly}
          </span>
        )}
      </div>

      {isOn(flags, 'DEMO_MODE') && flags && (
        <div className="mb-4 rounded-2xl bg-warning/15 border border-warning/40 p-4 flex gap-3 text-sm">
          <AlertTriangle className="w-5 h-5 text-warning shrink-0" />
          <p className="font-medium">{tx.demoWarn}</p>
        </div>
      )}

      {shown.length === 0 && <p className="text-muted py-10 text-center">{tx.none}</p>}

      <div className="flex flex-col gap-4">
        {GROUPS.map((g) => {
          const list = shown.filter((f) => f.group === g.key);
          const showMaint = g.key === 'system' && (!q || tx.maint.includes(q) || 'maintenance'.includes(q.toLowerCase()));
          if (!list.length && !showMaint) return null;
          return (
            <Panel key={g.key} title={ar ? g.ar : g.en} className="p-0 overflow-hidden">
              <ul className="divide-y divide-border">
                {list.map((f) => {
                  const v = isOn(flags, f.key);
                  const parent = PARENT[f.key];
                  const blocked = parent && !isOn(flags, parent);
                  const parentName = parent ? name(FEATURES.find((x) => x.key === parent)!) : '';
                  return (
                    <li key={f.key} className={`px-5 py-4 flex items-center gap-4 ${f.danger && v ? 'bg-warning/10' : ''}`}>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold flex items-center gap-2 flex-wrap">
                          {name(f)}
                          {f.soon && <span className="text-[11px] font-semibold rounded-full px-2 py-0.5 bg-accent text-ink">{tx.soon}</span>}
                          <span className={`text-[11px] font-semibold rounded-full px-2 py-0.5 ${v && !blocked ? 'bg-success/15 text-success' : 'bg-surface text-muted'}`}>{v && !blocked ? tx.on : tx.off}</span>
                        </p>
                        <p className="text-sm text-muted mt-0.5 leading-relaxed">{ar ? f.arSub : f.enSub}</p>
                        {f.server && (
                          <p className="text-xs text-muted mt-1 flex items-center gap-1">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            {tx.server}
                          </p>
                        )}
                        {blocked && <p className="text-xs text-warning mt-1">{tx.needs.replace('{x}', parentName)}</p>}
                      </div>
                      <Switch checked={v} onChange={(nv) => busy !== f.key && toggle(f, nv)} label={name(f)} />
                    </li>
                  );
                })}
                {showMaint && (
                  <li className={`px-5 py-4 flex items-center gap-4 ${maint ? 'bg-danger/10' : ''}`}>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold">{tx.maint}</p>
                      <p className="text-sm text-muted mt-0.5 leading-relaxed">{tx.maintSub}</p>
                    </div>
                    <Switch checked={!!maint} onChange={toggleMaint} label={tx.maint} />
                  </li>
                )}
              </ul>
            </Panel>
          );
        })}
      </div>
      {toastNode}
    </>
  );
}
