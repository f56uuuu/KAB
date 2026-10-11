'use client';

import { useCallback, useEffect, useState } from 'react';
import { createSupabaseBrowserClient, isAdminPath } from './supabase-browser';

// In-memory page data kept between screens, so switching tabs shows the last data instantly
// while fresh data loads in the background. Cleared on sign-out.
const memo = new Map<string, unknown>();

let client: ReturnType<typeof createSupabaseBrowserClient> | null = null;
let adminClient: ReturnType<typeof createSupabaseBrowserClient> | null = null;
/** Customer/driver pages and admin pages use separate sessions, so signing in to one never affects the other. */
export function sb() {
  if (typeof window !== 'undefined' && isAdminPath(window.location.pathname)) {
    adminClient ??= createSupabaseBrowserClient(true);
    return adminClient;
  }
  if (!client) {
    client = createSupabaseBrowserClient();
    client.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') memo.clear();
    });
  }
  return client;
}

/**
 * The signed-in user, read from the locally stored session (no network round trip).
 * Pages use it to know whose data to load; access itself is enforced by the database (RLS).
 */
export async function currentUser() {
  const {
    data: { session },
  } = await sb().auth.getSession();
  return session?.user ?? null;
}

export function useStickyState<T>(key: string, initial: T): [T, (v: T | ((prev: T) => T)) => void] {
  const [v, setV] = useState<T>(() => (memo.has(key) ? (memo.get(key) as T) : initial));
  const set = useCallback(
    (next: T | ((prev: T) => T)) =>
      setV((prev) => {
        const val = typeof next === 'function' ? (next as (p: T) => T)(prev) : next;
        memo.set(key, val);
        return val;
      }),
    [key],
  );
  return [v, set];
}

export type Flags = Record<string, boolean>;
let flagsCache: Flags | null = null;

export function useFlags() {
  const [flags, setFlags] = useState<Flags | null>(flagsCache);
  useEffect(() => {
    sb()
      .from('feature_flags')
      .select('name,is_enabled')
      .then(({ data }) => {
        const f: Flags = {};
        (data ?? []).forEach((r: any) => (f[r.name] = !!r.is_enabled));
        flagsCache = f;
        setFlags(f);
      });
  }, []);
  return flags;
}

export function useProfile() {
  const [profile, setProfile] = useStickyState<any>('profile', null);
  useEffect(() => {
    (async () => {
      const user = await currentUser();
      if (!user) return;
      const { data } = await sb().from('profiles').select('*').eq('id', user.id).maybeSingle();
      setProfile({ ...(data ?? {}), id: user.id, is_anonymous: (user as any).is_anonymous, email: user.email });
    })();
  }, []);
  return profile;
}

export function useUnreadCount() {
  const [n, setN] = useStickyState('unread', 0);
  useEffect(() => {
    let channel: any;
    (async () => {
      const user = await currentUser();
      if (!user) return;
      const load = () =>
        sb()
          .from('notifications')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('is_read', false)
          .then(({ count }) => setN(count ?? 0));
      load();
      channel = sb()
        .channel(`notif-count-${user.id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, load)
        .subscribe();
    })();
    return () => {
      if (channel) sb().removeChannel(channel);
    };
  }, []);
  return n;
}
