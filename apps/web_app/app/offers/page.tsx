'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Copy } from 'lucide-react';
import { BottomNav } from '@/components/BottomNav';
import { Glyph } from '@/components/Glyph';
import { goldBg, luminance } from '@/lib/brand';
import { Empty, TopBar, useToast } from '@/components/ui';
import { useI18n } from '@/lib/i18n';
import { sb, useStickyState } from '@/lib/hooks';

export default function OffersPage() {
  const { t, pick, locale, dir } = useI18n();
  const [banners, setBanners] = useStickyState<any[]>('offers.banners', []);
  const [coupons, setCoupons] = useStickyState<any[] | null>('offers.coupons', null);
  const { toast, toastNode } = useToast();

  useEffect(() => {
    sb().from('banners').select('*').eq('is_active', true).order('sort').then(({ data }) => setBanners(data ?? []));
    sb().from('coupons').select('*').eq('is_active', true).order('discount_value', { ascending: false }).then(({ data }) => setCoupons(data ?? []));
  }, []);

  async function copy(code: string) {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      /* clipboard blocked: the code is visible on screen */
    }
    toast(`${t('common.copied')}: ${code}`);
  }

  return (
    <main className="min-h-screen bg-background pb-28">
      <TopBar title={t('offers.title')} />
      <div className="max-w-md md:max-w-2xl lg:max-w-3xl mx-auto px-5 flex flex-col gap-6">
        {banners.length > 0 && (
          <section className="flex flex-col gap-3">
            {banners.map((b) => {
              const light = luminance(b.color) >= 150;
              return (
                <Link
                  key={b.id}
                  href={b.link || '/home'}
                  className={`relative min-h-[128px] rounded-[26px] overflow-hidden ps-5 pe-3 py-4 flex items-center gap-3 active:scale-[.99] transition-transform ${light ? 'bg-accent text-ink' : 'text-white'}`}
                  style={light ? undefined : { background: goldBg(dir) }}
                >
                  <div className="flex-1 min-w-0">
                    <p className={`text-[19px] font-bold leading-snug ${light ? '' : 'text-accent'}`}>{pick(b.title_ar, b.title)}</p>
                    <p className="text-[13px] mt-1 opacity-80 leading-relaxed">{pick(b.description_ar, b.description)}</p>
                  </div>
                  <Glyph name={b.emoji} fallback="gift" className="w-[96px] h-[96px] shrink-0 drop-shadow-[0_10px_12px_rgba(0,0,0,.3)]" />
                </Link>
              );
            })}
          </section>
        )}

        <section>
          <h2 className="font-semibold text-lg mb-3">{t('offers.codes')}</h2>
          {coupons && coupons.length === 0 && <Empty glyph="ticket" title={t('offers.empty')} />}
          <ul className="grid gap-3 md:grid-cols-2">
            {(coupons ?? []).map((c) => (
              <li key={c.id} className="relative rounded-[22px] bg-surface border border-border flex overflow-hidden">
                <div className="w-[92px] bg-accent text-ink flex flex-col items-center justify-center shrink-0 px-2 text-center border-e-2 border-dashed border-ink/25">
                  {c.discount_type === 'FREE_DELIVERY' ? (
                    <Glyph name="scooter" className="w-14 h-14" />
                  ) : (
                    <span className="text-[26px] font-bold leading-none" dir="ltr">
                      {c.discount_type === 'PERCENT' ? `${Number(c.discount_value)}%` : Number(c.discount_value).toLocaleString(locale)}
                    </span>
                  )}
                </div>
                <div className="flex-1 p-4 min-w-0">
                  <p className="font-semibold leading-snug">{pick(c.description_ar, c.description) || c.code}</p>
                  <p className="text-xs text-muted mt-0.5">{t(`offers.service.${c.service_type}` as any)}</p>
                  {c.expiry_date && (
                    <p className="text-xs text-muted">
                      {t('offers.valid_until', { date: new Date(c.expiry_date).toLocaleDateString(locale) })}
                    </p>
                  )}
                  <button
                    onClick={() => copy(c.code)}
                    className="mt-2.5 inline-flex items-center gap-2 h-10 px-3.5 rounded-xl bg-background border border-border font-bold tracking-widest text-sm active:scale-95 transition-transform"
                    dir="ltr"
                  >
                    {c.code}
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
      {toastNode}
      <BottomNav />
    </main>
  );
}

