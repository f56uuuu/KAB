'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Copy, TicketPercent } from 'lucide-react';
import { BottomNav } from '@/components/BottomNav';
import { Empty, TopBar, useToast } from '@/components/ui';
import { useI18n } from '@/lib/i18n';
import { sb, useStickyState } from '@/lib/hooks';

export default function OffersPage() {
  const { t, pick, locale } = useI18n();
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
            {banners.map((b) => (
              <Link
                key={b.id}
                href={b.link || '/home'}
                className="h-32 rounded-3xl p-5 flex items-center gap-4"
                style={{ background: b.color, color: luminance(b.color) < 140 ? '#fff' : '#0D0D0F' }}
              >
                <div className="flex-1">
                  <p className="text-xl font-black leading-tight">{pick(b.title_ar, b.title)}</p>
                  <p className="text-sm mt-1 opacity-80">{pick(b.description_ar, b.description)}</p>
                </div>
                <span className="text-6xl" aria-hidden>
                  {b.emoji}
                </span>
              </Link>
            ))}
          </section>
        )}

        <section>
          <h2 className="font-extrabold text-lg mb-3">{t('offers.codes')}</h2>
          {coupons && coupons.length === 0 && <Empty icon={<TicketPercent className="w-7 h-7" />} title={t('offers.empty')} />}
          <ul className="grid gap-3 md:grid-cols-2">
            {(coupons ?? []).map((c) => (
              <li key={c.id} className="rounded-2xl border border-border flex overflow-hidden">
                <div className="w-24 bg-accent text-ink flex flex-col items-center justify-center shrink-0 px-2 text-center">
                  <span className="text-2xl font-black leading-none">
                    {c.discount_type === 'PERCENT' ? `${Number(c.discount_value)}%` : c.discount_type === 'FREE_DELIVERY' ? '🛵' : Number(c.discount_value).toLocaleString(locale)}
                  </span>
                </div>
                <div className="flex-1 p-4 min-w-0">
                  <p className="font-extrabold leading-snug">{pick(c.description_ar, c.description) || c.code}</p>
                  <p className="text-xs text-muted mt-0.5">{t(`offers.service.${c.service_type}` as any)}</p>
                  {c.expiry_date && (
                    <p className="text-xs text-muted">
                      {t('offers.valid_until', { date: new Date(c.expiry_date).toLocaleDateString(locale) })}
                    </p>
                  )}
                  <button
                    onClick={() => copy(c.code)}
                    className="mt-2 inline-flex items-center gap-2 h-9 px-3 rounded-lg border-2 border-dashed border-fg font-black tracking-widest text-sm"
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

function luminance(hex: string) {
  const h = (hex || '#FFD100').replace('#', '');
  const n = parseInt(h, 16);
  return 0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255);
}
