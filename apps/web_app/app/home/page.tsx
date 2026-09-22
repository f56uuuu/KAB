import Link from 'next/link';
import { BottomNav } from '@/components/BottomNav';
import { ActiveRideBanner } from '@/components/ActiveRideBanner';

const SERVICES = [
  { label: 'رحلة', icon: '🚗', href: '/ride/new' },
  { label: 'توصيل', icon: '📦', href: null },
  { label: 'مطاعم', icon: '🍽️', href: null },
  { label: 'المتجر', icon: '🛍️', href: null },
  { label: 'عروض', icon: '🏷️', href: null },
  { label: 'كوبونات', icon: '🎟️', href: null },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background pb-24">
      <div className="px-5 pt-6 flex items-center justify-between">
        <span className="text-sm text-neutralGray">📍 موقعك الحالي</span>
        <div className="w-8 h-8 rounded-full bg-surface flex items-center justify-center">👤</div>
      </div>

      <div className="px-5 mt-5">
        <div className="h-12 rounded-2xl bg-surface border border-border flex items-center px-4 text-sm text-neutralGray gap-2">
          <span>🔍</span> ابحث في KAP
        </div>
      </div>

      <div className="px-5 mt-5">
        <ActiveRideBanner />
      </div>

      <div className="px-5 mt-7">
        <h2 className="font-extrabold text-lg mb-3">الخدمات</h2>
        <div className="grid grid-cols-3 gap-3">
          {SERVICES.map((s) =>
            s.href ? (
              <Link
                key={s.label}
                href={s.href}
                className="aspect-square rounded-2xl bg-surface border border-border flex flex-col items-center justify-center gap-2"
              >
                <span className="text-2xl">{s.icon}</span>
                <span className="text-xs font-medium">{s.label}</span>
              </Link>
            ) : (
              <div
                key={s.label}
                className="aspect-square rounded-2xl bg-surface border border-border flex flex-col items-center justify-center gap-2 opacity-50"
              >
                <span className="text-2xl">{s.icon}</span>
                <span className="text-xs font-medium">{s.label}</span>
              </div>
            ),
          )}
        </div>
      </div>

      <BottomNav />
    </main>
  );
}
