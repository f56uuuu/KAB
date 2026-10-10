'use client';

import { useState } from 'react';
import { TicketPercent, X } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { sb } from '@/lib/hooks';
import { money } from '@/lib/format';

export type Promo = { code: string; discount: number } | null;

/** Validates a code on the server (check_coupon) and shows the preview discount. */
export function PromoField({
  service,
  amount,
  fee = 0,
  currency,
  value,
  onChange,
}: {
  service: 'RIDE' | 'DELIVERY' | 'FOOD';
  amount: number;
  fee?: number;
  currency: string;
  value: Promo;
  onChange: (p: Promo) => void;
}) {
  const { t, locale } = useI18n();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function apply() {
    if (!code.trim()) return setErr(t('promo.empty'));
    setBusy(true);
    setErr(null);
    const { data, error } = await sb().rpc('check_coupon', { p_code: code.trim(), p_service: service, p_amount: amount, p_fee: fee });
    setBusy(false);
    const r = data as any;
    if (error || !r?.ok) return setErr(t(`promo.${r?.reason ?? 'invalid'}` as any));
    onChange({ code: r.code, discount: Number(r.discount) });
    setOpen(false);
  }

  if (value) {
    return (
      <div className="flex items-center gap-2 rounded-xl bg-success/10 text-success px-3 h-11 text-sm font-bold">
        <TicketPercent className="w-4 h-4" />
        <span className="flex-1">{t('promo.applied', { code: value.code, amount: money(value.discount, currency, locale) })}</span>
        <button onClick={() => onChange(null)} aria-label={t('promo.remove')} className="w-8 h-8 flex items-center justify-center">
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="flex items-center gap-2 text-sm font-bold h-10 text-fg">
        <TicketPercent className="w-4 h-4" />
        {t('promo.code')}
      </button>
    );
  }

  return (
    <div>
      <div className="flex gap-2">
        <input
          autoFocus
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === 'Enter' && apply()}
          placeholder="KAP10"
          dir="ltr"
          className="flex-1 min-w-0 h-11 rounded-xl border border-border bg-background px-3 font-bold tracking-widest uppercase outline-none focus:border-fg"
        />
        <button onClick={apply} disabled={busy} className="h-11 px-4 rounded-xl bg-fg text-background font-bold text-sm disabled:opacity-50">
          {t('promo.apply')}
        </button>
      </div>
      {err && <p className="text-danger text-xs mt-1.5 font-medium">{err}</p>}
    </div>
  );
}
