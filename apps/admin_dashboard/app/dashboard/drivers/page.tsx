import { createSupabaseServerClient } from '@/lib/supabase-server';
import { DriverRow } from './DriverRow';

export default async function DriversPage() {
  const supabase = createSupabaseServerClient();

  const { data: drivers } = await supabase
    .from('drivers')
    .select('id, status, reliability_score, admin_notes, profiles(full_name, phone)')
    .order('created_at', { ascending: true });

  const needsReview = (drivers ?? []).filter((d) =>
    ['PENDING', 'UNDER_REVIEW', 'MORE_INFO_REQUIRED'].includes(d.status),
  );
  const others = (drivers ?? []).filter(
    (d) => !['PENDING', 'UNDER_REVIEW', 'MORE_INFO_REQUIRED'].includes(d.status),
  );

  return (
    <div>
      <h1 className="text-2xl font-bold text-secondary mb-1">Driver Review</h1>
      <p className="text-sm text-gray-500 mb-6">
        Every decision here is written to the audit log — nothing is approved silently.
      </p>

      {needsReview.length > 0 && (
        <>
          <h2 className="text-sm font-semibold text-gray-500 uppercase mb-2">Needs review ({needsReview.length})</h2>
          <div className="grid gap-3 mb-8">
            {needsReview.map((d) => (
              <DriverRow key={d.id} driver={d} />
            ))}
          </div>
        </>
      )}

      <h2 className="text-sm font-semibold text-gray-500 uppercase mb-2">All drivers</h2>
      <div className="grid gap-3">
        {others.map((d) => (
          <DriverRow key={d.id} driver={d} />
        ))}
      </div>
    </div>
  );
}
