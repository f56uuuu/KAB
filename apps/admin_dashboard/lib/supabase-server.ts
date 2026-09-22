import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Server-side client for Server Components, layouts, and route handlers.
// Every admin page render re-validates the session against Supabase —
// no client-side-only "am I an admin" flag that could be spoofed.
export function createSupabaseServerClient() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: any) {
          cookieStore.set({ name, value: '', ...options });
        },
      },
    },
  );
}

/// Returns the current admin's row (with role) or null.
/// Used by every protected page — see requireAdmin() in lib/auth-guard.ts.
export async function getCurrentAdmin() {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: admin } = await supabase
    .from('admin_users')
    .select('id, is_active, role_id, roles(name)')
    .eq('id', user.id)
    .single();

  if (!admin || !admin.is_active) return null;
  return admin;
}
