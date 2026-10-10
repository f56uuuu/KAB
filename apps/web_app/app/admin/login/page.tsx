'use client';

import { Suspense } from 'react';
import { AdminLogin } from '@/components/AdminLogin';

export default function AdminLoginPage() {
  return (
    <Suspense>
      <AdminLogin />
    </Suspense>
  );
}
