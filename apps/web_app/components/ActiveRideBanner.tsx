'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';

const ACTIVE_STATUSES = ['REQUESTED', 'SEARCHING', 'ASSIGNED', 'ARRIVING', 'ARRIVED', 'STARTED'];

export function ActiveRideBanner() {
  const [ride, setRide] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;

    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('rides')
        .select('*')
        .eq('customer_id', user.id)
        .in('status', ACTIVE_STATUSES)
        .order('requested_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      setRide(data);

      channel = supabase
        .channel(`rides-customer-${user.id}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'rides', filter: `customer_id=eq.${user.id}` },
          (payload) => {
            const row = payload.new as any;
            setRide(ACTIVE_STATUSES.includes(row?.status) ? row : null);
          },
        )
        .subscribe();
    })();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  if (!ride) return null;

  return (
    <button
      onClick={() => router.push(`/ride/${ride.id}`)}
      className="w-full bg-ink rounded-2xl p-4 flex items-center gap-3 text-right"
    >
      <span className="text-2xl">🚕</span>
      <span className="flex-1">
        <span className="block text-white font-bold text-sm">رحلة جارية</span>
        <span className="block text-neutralGray text-xs">{ride.status}</span>
      </span>
      <span className="text-white/60">‹</span>
    </button>
  );
}
