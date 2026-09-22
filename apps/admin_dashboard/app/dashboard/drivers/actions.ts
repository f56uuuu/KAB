'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient, getCurrentAdmin } from '@/lib/supabase-server';

/// Every decision here is logged to audit_logs (WHO/WHAT/WHEN/previous→new
/// value, section 115) — a driver approval/rejection is exactly the kind of
/// action that must be traceable months later.
async function logDecision(entityId: string, action: string, previousValue: string, newValue: string) {
  const supabase = createSupabaseServerClient();
  const admin = await getCurrentAdmin();
  await supabase.from('audit_logs').insert({
    actor_id: admin?.id,
    actor_type: 'admin',
    action,
    entity_type: 'driver',
    entity_id: entityId,
    previous_value: { status: previousValue },
    new_value: { status: newValue },
  });
}

export async function approveDriver(driverId: string, previousStatus: string) {
  const supabase = createSupabaseServerClient();
  await supabase
    .from('drivers')
    .update({ status: 'APPROVED', approved_at: new Date().toISOString() })
    .eq('id', driverId);
  await logDecision(driverId, 'driver_approved', previousStatus, 'APPROVED');
  revalidatePath('/dashboard/drivers');
}

export async function rejectDriver(driverId: string, previousStatus: string, reason: string) {
  const supabase = createSupabaseServerClient();
  await supabase
    .from('drivers')
    .update({ status: 'REJECTED', admin_notes: reason })
    .eq('id', driverId);
  await logDecision(driverId, 'driver_rejected', previousStatus, 'REJECTED');
  revalidatePath('/dashboard/drivers');
}

export async function requestMoreInfo(driverId: string, previousStatus: string, note: string) {
  const supabase = createSupabaseServerClient();
  await supabase
    .from('drivers')
    .update({ status: 'MORE_INFO_REQUIRED', admin_notes: note })
    .eq('id', driverId);
  await logDecision(driverId, 'driver_more_info_requested', previousStatus, 'MORE_INFO_REQUIRED');
  revalidatePath('/dashboard/drivers');
}

export async function suspendDriver(driverId: string, previousStatus: string, reason: string) {
  const supabase = createSupabaseServerClient();
  await supabase.from('drivers').update({ status: 'SUSPENDED', admin_notes: reason }).eq('id', driverId);
  await logDecision(driverId, 'driver_suspended', previousStatus, 'SUSPENDED');
  revalidatePath('/dashboard/drivers');
}
