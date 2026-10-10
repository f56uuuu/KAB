'use client';

import { useEffect, useMemo, useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import { BackButton, Button } from '@/components/ui';
import { StoreMeta } from '@/components/StoreMeta';
import { CartBar } from '@/components/CartBar';
import { useI18n } from '@/lib/i18n';
import { sb } from '@/lib/hooks';
import { cartStore, useCart } from '@/lib/cart';
import { money } from '@/lib/format';

export default function StorePage({ params }: { params: { id: string } }) {
  const { t, pick, locale } = useI18n();
  const cart = useCart();
  const [store, setStore] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [currency, setCurrency] = useState('IQD');
  const [pending, setPending] = useState<any>(null); // product waiting for "start new cart?"
  const [section, setSection] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const s = sb();
      const { data: st } = await s.from('stores').select('*, cities(country_id, countries(currency_code))').eq('id', params.id).maybeSingle();
      if (!st) return;
      setStore(st);
      setCurrency((st as any).cities?.countries?.currency_code ?? 'IQD');
      const { data: pr } = await s.from('products').select('*').eq('store_id', params.id).eq('is_available', true).order('sort');
      setProducts(pr ?? []);
    })();
  }, [params.id]);

  const sections = useMemo(() => {
    const m = new Map<string, any[]>();
    products.forEach((p) => m.set(p.section, [...(m.get(p.section) ?? []), p]));
    return [...m.entries()];
  }, [products]);

  const qtyOf = (pid: number) => (cart?.store_id === store?.id ? cart?.items.find((i) => i.product_id === pid)?.qty ?? 0 : 0);

  function storeInfo() {
    return {
      store_id: store.id,
      store_name: store.name,
      store_name_ar: store.name_ar,
      currency,
      delivery_fee: Number(store.delivery_fee),
      min_order: Number(store.min_order),
      delivery_minutes: store.delivery_minutes,
    };
  }

  function add(p: any, delta = 1, force = false) {
    if (cart && cart.items.length > 0 && cart.store_id !== store.id && !force) {
      setPending(p);
      return;
    }
    if (force) cartStore.clear();
    cartStore.setStore(storeInfo());
    cartStore.add({ product_id: p.id, name: p.name, name_ar: p.name_ar, price: Number(p.price), emoji: p.emoji }, delta);
  }

  if (!store) return <main className="min-h-screen flex items-center justify-center text-muted">{t('common.loading')}</main>;

  return (
    <main className="min-h-screen bg-background pb-32">
      <div
        className="relative h-56 flex items-center justify-center"
        style={{ background: `linear-gradient(160deg, ${store.color}55, ${store.color}18)` }}
      >
        <span className="text-[96px]" aria-hidden>
          {store.emoji}
        </span>
        <div className="absolute top-0 inset-x-0 safe-top px-4 pt-2">
          <BackButton href="/food" />
        </div>
      </div>

      <div className="max-w-md mx-auto -mt-6 relative bg-background rounded-t-sheet px-5 pt-6">
        <h1 className="text-2xl font-black leading-tight">{pick(store.name_ar, store.name)}</h1>
        <p className="text-sm text-muted mt-0.5">{store.address}</p>
        <StoreMeta store={store} currency={currency} className="mt-2 text-sm" />
        {Number(store.min_order) > 0 && (
          <p className="text-xs text-muted mt-1">{t('food.min_order', { amount: money(store.min_order, currency, locale) })}</p>
        )}
        {!store.is_open && (
          <p className="mt-3 rounded-xl bg-surface px-4 py-3 font-bold text-sm">{t('error.store_closed')}</p>
        )}

        {/* section tabs */}
        {sections.length > 1 && (
          <nav className="sticky top-0 z-20 bg-background -mx-5 px-5 py-3 mt-3 flex gap-2 overflow-x-auto no-scrollbar border-b border-border">
            {sections.map(([name, items]) => (
              <a
                key={name}
                href={`#sec-${slug(name)}`}
                onClick={() => setSection(name)}
                className={`h-9 px-4 rounded-full text-sm font-bold whitespace-nowrap flex items-center ${
                  section === name ? 'bg-fg text-background' : 'bg-surface'
                }`}
              >
                {pick(items[0]?.section_ar, name)}
              </a>
            ))}
          </nav>
        )}

        {sections.map(([name, items]) => (
          <section key={name} id={`sec-${slug(name)}`} className="pt-5 scroll-mt-16">
            <h2 className="font-extrabold text-lg mb-2">{pick(items[0]?.section_ar, name)}</h2>
            <ul className="divide-y divide-border">
              {items.map((p) => {
                const q = qtyOf(p.id);
                return (
                  <li key={p.id} className="py-3.5 flex gap-3 items-center">
                    <div className="w-20 h-20 rounded-2xl bg-surface flex items-center justify-center text-4xl shrink-0">{p.emoji}</div>
                    <div className="flex-1 min-w-0">
                      <p className="font-extrabold leading-snug">{pick(p.name_ar, p.name)}</p>
                      {(p.description || p.description_ar) && <p className="text-xs text-muted leading-snug mt-0.5 line-clamp-2">{pick(p.description_ar, p.description)}</p>}
                      <p className="font-black mt-1.5">{money(p.price, currency, locale)}</p>
                    </div>
                    {!p.is_available || !store.is_open ? (
                      <span className="text-xs text-muted font-bold">{t('store.unavailable')}</span>
                    ) : q === 0 ? (
                      <button
                        onClick={() => add(p)}
                        aria-label={`${t('store.add')} ${pick(p.name_ar, p.name)}`}
                        className="w-11 h-11 rounded-full bg-accent text-ink flex items-center justify-center shrink-0"
                      >
                        <Plus className="w-5 h-5" strokeWidth={3} />
                      </button>
                    ) : (
                      <div className="flex items-center gap-1 bg-surface rounded-full p-1 shrink-0">
                        <button onClick={() => add(p, -1)} aria-label="−" className="w-9 h-9 rounded-full bg-background flex items-center justify-center">
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="w-6 text-center font-black">{q}</span>
                        <button onClick={() => add(p, 1)} aria-label="+" className="w-9 h-9 rounded-full bg-accent text-ink flex items-center justify-center">
                          <Plus className="w-4 h-4" strokeWidth={3} />
                        </button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>

      {pending && (
        <div className="fixed inset-0 z-[900] bg-black/50 flex items-end sm:items-center justify-center" onClick={() => setPending(null)}>
          <div className="bg-background w-full max-w-md rounded-t-sheet sm:rounded-3xl p-6 safe-bottom" onClick={(e) => e.stopPropagation()}>
            <p className="font-extrabold text-lg">{t('cart.other_store', { store: pick(cart?.store_name_ar, cart?.store_name) })}</p>
            <div className="flex gap-2 mt-5">
              <Button variant="soft" size="md" className="flex-1" onClick={() => setPending(null)}>
                {t('common.cancel')}
              </Button>
              <Button
                size="md"
                className="flex-1"
                onClick={() => {
                  add(pending, 1, true);
                  setPending(null);
                }}
              >
                {t('cart.start_new')}
              </Button>
            </div>
          </div>
        </div>
      )}
      <CartBar bottom="bottom-4" />
    </main>
  );
}

function slug(s: string) {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-');
}
