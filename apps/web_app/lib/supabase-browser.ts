import { createBrowserClient } from '@supabase/ssr';

/** The admin area keeps its own session (separate cookie), fully isolated from the customer/driver app. */
export const ADMIN_COOKIE = 'sb-kap-admin';

export function isAdminPath(path: string) {
  return path.startsWith('/admin') || path.startsWith('/superadmin');
}

export function createSupabaseBrowserClient(admin = false) {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    admin ? { cookieOptions: { name: ADMIN_COOKIE } } : undefined,
  );
}
