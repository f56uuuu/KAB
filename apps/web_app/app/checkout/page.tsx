'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Banknote, MapPin, Minus, Plus, ShoppingBag } from 'lucide-react';
import { KapMap } from '@/components/KapMap';
import { Button, Empty, Field, TopBar, inputCls } from '@/components/ui';
import { PromoField, type Promo } from '@/components/PromoField';
import { useI18n } from '@/lib/i18n';
import { sb } from '@/lib/hooks';
import { cartStore, cartSubtotal, useCart } from '@/lib/cart';
import { useMyLocation } from '@/lib/location';
import { mapProvider, type LatLng } from '@/lib/maps';
import { errorCode, money } from '@/lib/format';

export default function CheckoutPage() {
  const { t, pick, locale } = useI18n();
  const router = useRouter();
  const cart = useCart();
  const loc = useMyLocation();
  const [point, setPoint] = useState<LatLng | null>(null);
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [promo, setPromo] = useState<Promo>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (loc.ready && !point) {
      setPoint(loc.point);
      if (!address) setAddress(loc.address ?? '');
    }
  }, [loc.ready]); // eslint-disable-line react-hooks/exhaustive-deps

  const subtotal = cartSubtotal(cart);
  const fee = cart?.delivery_fee ?? 0;
  useEffect(() => setPromo(null), [subtotal]);
  const total = Math.max(subtotal + fee - (promo?.discount ?? 0), 0);
  const belowMin = cart ? subtotal < cart.min_order : false;
  const markers = useMemo(() => (point ? [{ id: 'me', kind: 'dropoff' as const, ...point, draggable: true }] : []), [point]);

  if (!cart || cart.items.length === 0) {
    return (
      <main className="min-h-screen bg-background">
        <TopBar back="/food" title={t('cart.title')} />
        <Empty
          icon={<ShoppingBag className="w-7 h-7" />}
          title={t('cart.empty')}
          sub={t('cart.empty_sub')}
          action={
            <Link href="/food" className="mt-2 h-11 px-5 rounded-xl bg-accent text-ink font-bold flex items-center">
              {t('food.title')}
            </Link>
          }
        />
      </main>
    );
  }

  async function place() {
    if (!cart || !point) return;
    if (!address.trim()) return setError(t('checkout.address_needed'));
    setBusy(true);
    setError(null);
    const { data, error: err } = await sb().rpc('place_order', {
      p_store_id: cart.store_id,
      p_items: cart.items.map((i) => ({ product_id: i.product_id, qty: i.qty })),
      p_address: address.trim(),
      p_lat: point.lat,
      p_lng: point.lng,
      p_notes: notes.trim() || null,
      p_coupon: promo?.code ?? null,
    });
    if (err || !data) {
      setBusy(false);
      setError(t(`error.${errorCode(err)}` as any));
      return;
    }
    cartStore.clear();
    router.replace(`/order/${(data as any).id}`);
  }

  return (
    <main className="min-h-screen bg-background pb-36">
      <TopBar back={`/store/${cart.store_id}`} title={t('checkout.title')} />
      <div className="max-w-md mx-auto px-5 flex flex-col gap-6">
        {/* items */}
        <section>
          <div className="flex items-center justify-between">
            <h2 className="font-extrabold text-lg">{pick(cart.store_name_ar, cart.store_name)}</h2>
            <button onClick={() => cartStore.clear()} className="text-sm text-danger font-bold">
              {t('cart.clear')}
            </button>
          </div>
          <ul className="divide-y divide-border mt-2">
            {cart.items.map((i) => (
              <li key={i.product_id} className="py-3 flex items-center gap-3">
                <span className="w-12 h-12 rounded-xl bg-surface flex items-center justify-center text-2xl shrink-0">{i.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-bold leading-snug truncate">{pick(i.name_ar, i.name)}</p>
                  <p className="text-sm text-muted">{money(i.price * i.qty, cart.currency, locale)}</p>
                </div>
                <div className="flex items-center gap-1 bg-surface rounded-full p-1">
                  <button onClick={() => cartStore.add(i, -1)} aria-label="−" className="w-8 h-8 rounded-full bg-background flex items-center justify-center">
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-6 text-center font-black">{i.qty}</span>
                  <button onClick={() => cartStore.add(i, 1)} aria-label="+" className="w-8 h-8 rounded-full bg-accent text-ink flex items-center justify-center">
                    <Plus className="w-4 h-4" strokeWidth={3} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* address */}
        <section className="flex flex-col gap-3">
          <h2 className="font-extrabold text-lg flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            {t('checkout.deliver_to')}
          </h2>
          <KapMap
            className="h-40 rounded-2xl overflow-hidden"
            markers={markers}
            fitKey={point ? 1 : 0}
            onDragEnd={(_, p) => {
              setPoint(p);
              mapProvider.reverse(p).then((a) => a && setAddress(a)).catch(() => {});
            }}
          />
          <p className="text-xs text-muted">{t('map.drag_hint')}</p>
          <textarea
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder={t('checkout.address_ph')}
            rows={2}
            className={`${inputCls} h-auto py-3 resize-none`}
          />
          <Field label={t('checkout.notes')}>
            <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t('checkout.notes_ph')} className={inputCls} />
          </Field>
        </section>

        {/* payment */}
        <section className="flex flex-col gap-3">
          <h2 className="font-extrabold text-lg">{t('checkout.payment')}</h2>
          <div className="rounded-2xl border-2 border-fg px-4 h-14 flex items-center gap-3 font-bold">
            <Banknote className="w-5 h-5" />
            {t('checkout.cod')}
          </div>
          <PromoField service="FOOD" amount={subtotal} fee={fee} currency={cart.currency} value={promo} onChange={setPromo} />
        </section>

        {/* summary */}
        <section className="rounded-2xl bg-surface p-4 text-sm flex flex-col gap-2">
          <Line label={t('cart.subtotal')} value={money(subtotal, cart.currency, locale)} />
          <Line label={t('cart.delivery')} value={fee === 0 ? t('food.free_delivery') : money(fee, cart.currency, locale)} />
          {promo && <Line label={t('cart.discount')} value={`−${money(promo.discount, cart.currency, locale)}`} accent />}
          <div className="border-t border-border pt-2 flex justify-between text-base">
            <span className="font-extrabold">{t('common.total')}</span>
            <span className="font-black">{money(total, cart.currency, locale)}</span>
          </div>
          <p className="text-xs text-muted">{t('checkout.eta', { n: cart.delivery_minutes })}</p>
        </section>

        {belowMin && (
          <p className="text-sm font-bold text-warning">{t('food.min_order', { amount: money(cart.min_order, cart.currency, locale) })}</p>
        )}
        {error && (
          <p role="alert" className="text-danger text-sm font-medium">
            {error}
          </p>
        )}
      </div>

      <div className="fixed bottom-0 inset-x-0 z-50 bg-background border-t border-border px-5 pt-3 safe-bottom">
        <div className="max-w-md mx-auto">
          <Button full loading={busy} disabled={belowMin || !point} onClick={place}>
            {busy ? t('checkout.placing') : t('checkout.place', { total: money(total, cart.currency, locale) })}
          </Button>
        </div>
      </div>
    </main>
  );
}

function Line({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`flex justify-between ${accent ? 'text-success font-bold' : ''}`}>
      <span className={accent ? '' : 'text-muted'}>{label}</span>
      <span className="font-bold">{value}</span>
    </div>
  );
}
