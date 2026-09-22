import { createSupabaseServerClient } from '@/lib/supabase-server';
import { FeatureFlagRow } from './FeatureFlagRow';

export default async function FeatureFlagsPage() {
  const supabase = createSupabaseServerClient();
  const { data: flags } = await supabase.from('feature_flags').select('*').order('key');

  return (
    <div>
      <h1 className="text-2xl font-bold text-secondary mb-1">Feature Flags</h1>
      <p className="text-sm text-gray-500 mb-6">
        Toggling here takes effect immediately in the apps — no release needed (section 156).
      </p>

      <div className="grid gap-3 max-w-2xl">
        {(flags ?? []).map((flag) => (
          <FeatureFlagRow key={flag.key} flag={flag} />
        ))}
        {(flags ?? []).length === 0 && (
          <p className="text-sm text-gray-400">
            No flags yet — insert rows into feature_flags (see supabase_migrations/001_core_schema.sql).
          </p>
        )}
      </div>
    </div>
  );
}
