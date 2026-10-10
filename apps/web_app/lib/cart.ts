'use client';

import { useSyncExternalStore } from 'react';

// The cart is a per-device convenience (like an unsent draft). Prices shown here are a preview only —
// the order total is always recalculated on the server from the product table.

export type CartItem = { product_id: number; name: string; name_ar: string; price: number; emoji: string; qty: number };
export type Cart = {
  store_id: number;
  store_name: string;
  store_name_ar: string;
  currency: string;
  delivery_fee: number;
  min_order: number;
  delivery_minutes: number;
  items: CartItem[];
} | null;

const KEY = 'kap_cart_v1';
let cart: Cart = null;
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === 'undefined') return;
  loaded = true;
  try {
    const raw = localStorage.getItem(KEY);
    cart = raw ? JSON.parse(raw) : null;
  } catch {
    cart = null;
  }
}

function persist() {
  try {
    if (cart) localStorage.setItem(KEY, JSON.stringify(cart));
    else localStorage.removeItem(KEY);
  } catch {
    /* storage unavailable: cart still works for this visit */
  }
  listeners.forEach((l) => l());
}

export const cartStore = {
  get(): Cart {
    load();
    return cart;
  },
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  setStore(store: Omit<NonNullable<Cart>, 'items'>) {
    load();
    if (!cart || cart.store_id !== store.store_id) cart = { ...store, items: [] };
    else cart = { ...cart, ...store };
    persist();
  },
  add(item: Omit<CartItem, 'qty'>, delta = 1) {
    load();
    if (!cart) return;
    const items = [...cart.items];
    const i = items.findIndex((x) => x.product_id === item.product_id);
    if (i >= 0) items[i] = { ...items[i], qty: Math.max(0, Math.min(50, items[i].qty + delta)) };
    else if (delta > 0) items.push({ ...item, qty: delta });
    cart = { ...cart, items: items.filter((x) => x.qty > 0) };
    persist();
  },
  clear() {
    cart = null;
    persist();
  },
};

export function useCart(): Cart {
  return useSyncExternalStore(cartStore.subscribe, cartStore.get, () => null);
}

export function cartCount(c: Cart) {
  return c ? c.items.reduce((s, x) => s + x.qty, 0) : 0;
}
export function cartSubtotal(c: Cart) {
  return c ? c.items.reduce((s, x) => s + x.qty * x.price, 0) : 0;
}
