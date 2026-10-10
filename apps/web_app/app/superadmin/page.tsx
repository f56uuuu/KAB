'use client';

import { Suspense } from 'react';
import { AdminLogin } from '@/components/AdminLogin';

export default function SuperAdminLoginPage() {
  return (
    <Suspense>
      <AdminLogin superMode />
    </Suspense>
  );
}
