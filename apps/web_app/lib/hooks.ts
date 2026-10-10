'use client';

import { useEffect, useState } from 'react';
import { createSupabaseBrowserClient } from './supabase-browser';

let client: ReturnType<typeof createSupabaseBrowserClient> | null = null;
export function sb() {
  client ??= createSupabaseBrowserClient();
  return client;
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
  const [profile, setProfile] = useState<any>(null);
  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await sb().auth.getUser();
      if (!user) return;
      const { data } = await sb().from('profiles').select('*').eq('id', user.id).maybeSingle();
      setProfile({ ...(data ?? {}), id: user.id, is_anonymous: (user as any).is_anonymous, email: user.email });
    })();
  }, []);
  return profile;
}

export function useUnreadCount() {
  const [n, setN] = useState(0);
  useEffect(() => {
    let channel: any;
    (async () => {
      const {
        data: { user },
      } = await sb().auth.getUser();
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
