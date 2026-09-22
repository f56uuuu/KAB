import { createBrowserClient } from '@supabase/ssr';

// Browser-side client — used inside Client Components only.
// Respects RLS: an admin's session still goes through is_admin() policies,
// so a compromised admin session can never see more than its role allows.
export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
