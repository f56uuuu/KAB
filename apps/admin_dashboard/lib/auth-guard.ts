import { redirect } from 'next/navigation';
import { getCurrentAdmin } from './supabase-server';

/// Call at the top of every protected Server Component page.
/// Redirects to /login instead of rendering anything if the caller isn't
/// an active row in admin_users — never trust a client-side check alone
/// (section 113/114: multi-tenant + super-admin security).
export async function requireAdmin() {
  const admin = await getCurrentAdmin();
  if (!admin) redirect('/login');
  return admin;
}

/// For pages restricted to specific roles (e.g. only Finance can see payouts).
export async function requireRole(allowedRoles: string[]) {
  const admin = await requireAdmin();
  const roleName = (admin as any).roles?.name;
  if (!allowedRoles.includes(roleName)) redirect('/dashboard?error=insufficient_permissions');
  return admin;
}
