import { createSupabaseServerClient } from '@/lib/supabase-server';
import { KpiCard } from '@/components/KpiCard';

// A single day's cutoff, computed once per render — used for "today" counts.
function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export default async function OverviewPage() {
  const supabase = createSupabaseServerClient();
  const today = startOfToday();

  // All counts run in parallel — a slow dashboard is a broken dashboard
  // (section 89: performance is a feature, not an afterthought).
  const [
    { count: totalUsers },
    { count: totalDrivers },
    { count: pendingDrivers },
    { count: onlineDrivers },
    { count: ridesToday },
    { count: deliveriesToday },
    { count: openTickets },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('drivers').select('*', { count: 'exact', head: true }),
    supabase.from('drivers').select('*', { count: 'exact', head: true }).eq('status', 'PENDING'),
    supabase.from('drivers').select('*', { count: 'exact', head: true }).eq('is_online', true),
    supabase.from('rides').select('*', { count: 'exact', head: true }).gte('requested_at', today),
    supabase.from('deliveries').select('*', { count: 'exact', head: true }).gte('created_at', today),
    supabase.from('support_tickets').select('*', { count: 'exact', head: true }).eq('status', 'OPEN'),
  ]);

  const { data: revenueRows } = await supabase
    .from('payments')
    .select('amount, currency_code')
    .eq('status', 'SUCCESS')
    .gte('created_at', today);

  const revenueByCurrency: Record<string, number> = {};
  for (const row of revenueRows ?? []) {
    revenueByCurrency[row.currency_code] = (revenueByCurrency[row.currency_code] ?? 0) + Number(row.amount);
  }
  const revenueLabel = Object.entries(revenueByCurrency)
    .map(([currency, amount]) => `${amount.toLocaleString()} ${currency}`)
    .join(' · ') || '0';

  return (
    <div>
      <h1 className="text-2xl font-bold text-secondary mb-1">Overview</h1>
      <p className="text-sm text-gray-500 mb-6">Live snapshot across all countries</p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <KpiCard label="Total Users" value={totalUsers ?? 0} />
        <KpiCard label="Total Drivers" value={totalDrivers ?? 0} />
        <KpiCard label="Pending Driver Review" value={pendingDrivers ?? 0} hint="Needs action" />
        <KpiCard label="Drivers Online Now" value={onlineDrivers ?? 0} />
        <KpiCard label="Rides Today" value={ridesToday ?? 0} />
        <KpiCard label="Deliveries Today" value={deliveriesToday ?? 0} />
        <KpiCard label="Revenue Today" value={revenueLabel} />
        <KpiCard label="Open Support Tickets" value={openTickets ?? 0} hint={(openTickets ?? 0) > 0 ? 'Needs attention' : 'All clear'} />
      </div>

      {(pendingDrivers ?? 0) > 0 && (
        <a
          href="/dashboard/drivers"
          className="block bg-warning/10 border border-warning text-secondary rounded-xl px-4 py-3 text-sm font-medium"
        >
          ⚠️ {pendingDrivers} driver application{pendingDrivers === 1 ? '' : 's'} waiting for review →
        </a>
      )}
    </div>
  );
}
