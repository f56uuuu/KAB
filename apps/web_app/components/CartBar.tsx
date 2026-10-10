'use client';

import Link from 'next/link';
import { ShoppingBag } from 'lucide-react';
import { cartCount, cartSubtotal, useCart } from '@/lib/cart';
import { useI18n } from '@/lib/i18n';
import { money } from '@/lib/format';

/** Floating "view cart" bar shown above the bottom nav whenever the cart has items. */
export function CartBar({ bottom = 'bottom-[76px]' }: { bottom?: string }) {
  const cart = useCart();
  const { t, locale, pick } = useI18n();
  const n = cartCount(cart);
  if (!cart || n === 0) return null;
  return (
    <div className={`fixed inset-x-0 ${bottom} z-40 px-4`}>
      <Link
        href="/checkout"
        className="max-w-md mx-auto h-14 rounded-2xl bg-accent text-ink flex items-center gap-3 px-4 shadow-float font-extrabold"
      >
        <span className="relative">
          <ShoppingBag className="w-6 h-6" />
          <span className="absolute -top-1.5 -end-2 min-w-[20px] h-5 px-1 rounded-full bg-ink text-accent text-[11px] font-black flex items-center justify-center">
            {n}
          </span>
        </span>
        <span className="flex-1 truncate">
          {t('store.view_cart')}
          <span className="font-medium opacity-70"> {pick(cart.store_name_ar, cart.store_name)}</span>
        </span>
        <span className="font-black">{money(cartSubtotal(cart), cart.currency, locale)}</span>
      </Link>
    </div>
  );
}
