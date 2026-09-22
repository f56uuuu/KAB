import Link from 'next/link';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Overview', icon: '📊' },
  { href: '/dashboard/drivers', label: 'Driver Review', icon: '🪪' },
  { href: '/dashboard/feature-flags', label: 'Feature Flags', icon: '🚩' },
  { href: '/dashboard/rides', label: 'Live Ops', icon: '🗺️' },
  { href: '/dashboard/support', label: 'Support', icon: '💬' },
  { href: '/dashboard/finance', label: 'Finance', icon: '💳' },
];

export function Sidebar({ roleName }: { roleName: string }) {
  return (
    <aside className="w-60 shrink-0 border-r border-border bg-surface min-h-screen flex flex-col">
      <div className="px-5 py-6">
        <h1 className="text-xl font-bold text-secondary">KAP</h1>
        <p className="text-xs text-gray-500">Super Admin</p>
      </div>
      <nav className="flex-1 px-2">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-secondary hover:bg-background transition-colors"
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
      <div className="px-5 py-4 border-t border-border text-xs text-gray-500">
        Role: <span className="font-medium text-secondary">{roleName}</span>
      </div>
    </aside>
  );
}
