import { requireAdmin } from '@/lib/auth-guard';
import { Sidebar } from '@/components/Sidebar';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin(); // redirects to /login if not an active admin

  return (
    <div className="flex">
      <Sidebar roleName={(admin as any).roles?.name ?? 'Admin'} />
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
