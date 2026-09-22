'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export async function setFlagStatus(key: string, status: 'ON' | 'OFF' | 'BETA') {
  const supabase = createSupabaseServerClient();
  await supabase
    .from('feature_flags')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('key', key);
  revalidatePath('/dashboard/feature-flags');
}
