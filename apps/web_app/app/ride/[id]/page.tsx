'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';

const STATUS_COPY: Record<string, string> = {
  SEARCHING: 'جارٍ البحث عن سائق…',
  ASSIGNED: 'تم العثور على سائق',
  ARRIVING: 'السائق في الطريق إليك',
  ARRIVED: 'السائق وصل',
  STARTED: 'الرحلة جارية',
  COMPLETED: 'انتهت الرحلة',
  CANCELLED: 'تم إلغاء الرحلة',
};

export default function RideTrackingPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [ride, setRide] = useState<any>(null);
  const [driver, setDriver] = useState<any>(null);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    let driverPoll: ReturnType<typeof setInterval> | null = null;

    async function fetchDriver(driverId: string) {
      const { data } = await supabase.rpc('get_driver_public_profile', { target_driver_id: driverId });
      if (Array.isArray(data) && data.length > 0) setDriver(data[0]);
    }

    (async () => {
      const { data } = await supabase.from('rides').select('*').eq('id', id).single();
      setRide(data);
      if (data?.driver_id) {
        fetchDriver(data.driver_id);
        driverPoll = setInterval(() => fetchDriver(data.driver_id), 5000);
      }
    })();

    const channel = supabase
      .channel(`ride-${id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'rides', filter: `id=eq.${id}` },
        (payload) => {
          const row = payload.new as any;
          setRide(row);
          if (row.driver_id && !driverPoll) {
            fetchDriver(row.driver_id);
            driverPoll = setInterval(() => fetchDriver(row.driver_id), 5000);
          }
          if (['COMPLETED', 'CANCELLED'].includes(row.status)) {
            if (driverPoll) clearInterval(driverPoll);
            setTimeout(() => router.push('/home'), 2000);
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (driverPoll) clearInterval(driverPoll);
    };
  }, [id, router]);

  async function cancelWhileSearching() {
    const supabase = createSupabaseBrowserClient();
    await supabase
      .from('rides')
      .update({ status: 'CANCELLED', cancelled_by: 'customer', cancellation_reason: 'cancelled_while_searching' })
      .eq('id', id);
    router.push('/home');
  }

  if (!ride) {
    return <main className="min-h-screen flex items-center justify-center bg-ink text-white">جارٍ التحميل…</main>;
  }

  return (
    <main className="min-h-screen bg-ink text-white flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6">
        {ride.status === 'SEARCHING' && (
          <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin" />
        )}
        <h1 className="font-extrabold text-lg text-center">{STATUS_COPY[ride.status] ?? ride.status}</h1>
        {ride.status === 'SEARCHING' && (
          <button onClick={cancelWhileSearching} className="text-sm text-white/70 underline mt-2">
            إلغاء
          </button>
        )}
      </div>

      {driver && (
        <div className="bg-[#17171A] rounded-t-3xl p-5 flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-[#2A2A2E] flex items-center justify-center text-xl">👤</div>
          <div className="flex-1">
            <div className="font-bold text-sm">{driver.full_name ?? 'السائق'}</div>
            <div className="text-xs text-neutralGray">
              {driver.make} {driver.model} · {driver.plate_number}
            </div>
          </div>
          <div className="text-sm">⭐ {driver.rating ?? '-'}</div>
        </div>
      )}

      <div className="p-5 text-center bg-[#141417]">
        <span className="font-extrabold text-lg">{ride.estimated_fare} {ride.currency_code}</span>
      </div>
    </main>
  );
}
