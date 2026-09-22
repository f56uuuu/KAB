import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:kab_core/auth/auth_provider.dart';

/// Subscribes to Postgres Changes on `rides` filtered to this driver.
/// The moment the matching engine assigns a ride (driver_id set, status =
/// ASSIGNED), this fires — no polling, no delay, which is exactly the kind
/// of responsiveness competitor reviews complain is missing ("waited 30+
/// minutes for a driver who was assigned but not moving").
final incomingRideProvider = StreamProvider.autoDispose<Map<String, dynamic>?>((ref) {
  final client = ref.watch(supabaseClientProvider);
  final driverId = ref.watch(authRepositoryProvider).currentUser?.id;
  if (driverId == null) return const Stream.empty();

  return client
      .from('rides')
      .stream(primaryKey: ['id'])
      .eq('driver_id', driverId)
      .order('requested_at')
      .map((rows) {
        final assigned = rows.where((r) => r['status'] == 'ASSIGNED').toList();
        return assigned.isEmpty ? null : assigned.first;
      });
});
