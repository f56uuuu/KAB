import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:kab_core/auth/auth_provider.dart';

const _activeStatuses = ['REQUESTED', 'SEARCHING', 'ASSIGNED', 'ARRIVING', 'ARRIVED', 'STARTED'];

/// Realtime — the moment a ride finishes or is cancelled, this clears
/// automatically and the Home screen's "ride in progress" banner disappears
/// with it. No manual refresh, no stale banner (section 91: Crash Recovery
/// principle applies here too — state always comes from the backend).
final activeRideProvider = StreamProvider.autoDispose<Map<String, dynamic>?>((ref) {
  final client = ref.watch(supabaseClientProvider);
  final userId = ref.watch(authRepositoryProvider).currentUser?.id;
  if (userId == null) return const Stream.empty();

  return client
      .from('rides')
      .stream(primaryKey: ['id'])
      .eq('customer_id', userId)
      .order('requested_at')
      .map((rows) {
        final active = rows.where((r) => _activeStatuses.contains(r['status'])).toList();
        return active.isEmpty ? null : active.last;
      });
});
