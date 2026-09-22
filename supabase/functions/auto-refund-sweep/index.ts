// supabase/functions/auto-refund-sweep/index.ts
//
// Scheduled via Supabase Cron (pg_cron -> net.http_post) every 2 minutes.
// Finds SLA breaches and refunds them immediately — the #1 fix for the
// "refund takes weeks or never happens" complaint pattern seen across
// Careem/Bolt/Talabat reviews. No human ticket required for the common cases.

import { createClient } from 'jsr:@supabase/supabase-js@2';

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { data: rules } = await supabase
    .from('auto_refund_rules')
    .select('*')
    .eq('is_active', true);

  let refundedCount = 0;

  for (const rule of rules ?? []) {
    if (rule.trigger_condition === 'SLA_BREACH' && rule.service_key === 'DELIVERY') {
      const graceMs = (rule.sla_grace_minutes ?? 30) * 60 * 1000;
      const cutoff = new Date(Date.now() - graceMs).toISOString();

      const { data: breaches } = await supabase
        .from('deliveries')
        .select('id, price, currency_code, customer_id')
        .in('status', ['ASSIGNED', 'PICKED_UP', 'ON_THE_WAY'])
        .lt('created_at', cutoff)
        .is('delivered_at', null);

      for (const delivery of breaches ?? []) {
        await refund(supabase, rule, 'delivery', delivery.id, delivery.customer_id, delivery.price);
        refundedCount++;
      }
    }

    if (rule.trigger_condition === 'DRIVER_NO_SHOW' && rule.service_key === 'RIDE') {
      const graceMs = (rule.sla_grace_minutes ?? 8) * 60 * 1000;
      const cutoff = new Date(Date.now() - graceMs).toISOString();

      const { data: noShows } = await supabase
        .from('rides')
        .select('id, estimated_fare, currency_code, customer_id')
        .eq('status', 'ARRIVED')
        .lt('requested_at', cutoff);

      for (const ride of noShows ?? []) {
        await refund(supabase, rule, 'ride', ride.id, ride.customer_id, ride.estimated_fare);
        await supabase.from('rides').update({ status: 'CANCELLED', cancelled_by: 'system', cancellation_reason: 'driver_no_show_auto_refund' }).eq('id', ride.id);
        refundedCount++;
      }
    }
  }

  return new Response(JSON.stringify({ refunded: refundedCount }), {
    headers: { 'Content-Type': 'application/json' },
  });
});

async function refund(
  supabase: ReturnType<typeof createClient>,
  rule: { id: string; refund_scope: string },
  referenceType: 'ride' | 'delivery',
  referenceId: string,
  customerId: string,
  amount: number,
) {
  const { data: wallet } = await supabase
    .from('wallets')
    .select('id')
    .eq('owner_type', 'customer')
    .eq('owner_id', customerId)
    .single();
  if (!wallet) return;

  const idempotencyKey = `auto_refund:${referenceType}:${referenceId}`;

  const { data: tx } = await supabase
    .from('wallet_transactions')
    .insert({
      wallet_id: wallet.id,
      amount,
      type: 'refund',
      status: 'COMPLETED',
      reference_type: referenceType,
      reference_id: referenceId,
      idempotency_key: idempotencyKey, // unique constraint = this can NEVER double-refund the same event
    })
    .select()
    .single();

  if (tx) {
    await supabase.from('auto_refund_events').insert({
      rule_id: rule.id,
      reference_type: referenceType,
      reference_id: referenceId,
      refunded_amount: amount,
      wallet_transaction_id: tx.id,
    });
  }
}
