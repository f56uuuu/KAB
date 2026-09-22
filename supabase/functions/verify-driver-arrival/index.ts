// supabase/functions/verify-driver-arrival/index.ts
//
// Called by the driver app the moment the driver taps "I've arrived".
// This is the ONLY path that can flip a ride/delivery into ARRIVED / PICKED_UP —
// the client is never trusted to set that status directly (closes the
// #1 Careem complaint pattern: drivers marking "arrived" while still far away).

import { createClient } from 'jsr:@supabase/supabase-js@2';

const ARRIVAL_RADIUS_METERS = 100;

Deno.serve(async (req) => {
  const { ride_id, delivery_id, driver_id } = await req.json();

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, // service_role — bypasses RLS intentionally, this is trusted server code
  );

  // 1. Pull the driver's most recent GPS ping — reject if stale (prevents replaying an old "close" location).
  const { data: driver, error: driverErr } = await supabase
    .from('drivers')
    .select('current_location, last_location_at')
    .eq('id', driver_id)
    .single();

  if (driverErr || !driver) {
    return json({ accepted: false, reason: 'driver_not_found' }, 404);
  }

  const locationAgeSeconds = (Date.now() - new Date(driver.last_location_at).getTime()) / 1000;
  if (locationAgeSeconds > 20) {
    return json({ accepted: false, reason: 'stale_location' }, 409);
  }

  // 2. Pull the target pickup point from the ride or delivery.
  const table = ride_id ? 'rides' : 'deliveries';
  const id = ride_id ?? delivery_id;
  const { data: trip, error: tripErr } = await supabase
    .from(table)
    .select('pickup_location, status, driver_id')
    .eq('id', id)
    .single();

  if (tripErr || !trip) return json({ accepted: false, reason: 'trip_not_found' }, 404);
  if (trip.driver_id !== driver_id) return json({ accepted: false, reason: 'not_assigned_driver' }, 403);

  // 3. Compute distance server-side via PostGIS (ST_Distance on geography = meters, great-circle accurate).
  const { data: distanceRows, error: distErr } = await supabase.rpc('st_distance_geo', {
    point_a: driver.current_location,
    point_b: trip.pickup_location,
  });
  if (distErr) return json({ accepted: false, reason: 'distance_calc_failed' }, 500);

  const distanceMeters = distanceRows as number;
  const accepted = distanceMeters <= ARRIVAL_RADIUS_METERS;

  // 4. Log every attempt — accepted or not — for dispute resolution and driver reliability scoring.
  await supabase.from('arrival_verifications').insert({
    ride_id: ride_id ?? null,
    delivery_id: delivery_id ?? null,
    driver_id,
    reported_location: driver.current_location,
    target_location: trip.pickup_location,
    distance_meters: distanceMeters,
    accepted,
  });

  if (!accepted) {
    return json({
      accepted: false,
      reason: 'too_far',
      distance_meters: Math.round(distanceMeters),
    }, 409);
  }

  // 5. Only now do we allow the actual status transition.
  const newStatus = ride_id ? 'ARRIVED' : 'PICKED_UP';
  await supabase.from(table).update({ status: newStatus }).eq('id', id);
  await supabase.from('ride_status_history').insert({
    ride_id: ride_id ?? null,
    status: newStatus,
    metadata: { verified_distance_meters: distanceMeters },
  });

  return json({ accepted: true, status: newStatus });
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
