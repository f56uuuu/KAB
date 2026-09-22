import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:kab_core/auth/auth_provider.dart';
import 'package:kab_design_system/colors.dart';
import 'live_tracking_screen.dart';
import '../home/home_screen.dart';

final _rideStatusProvider = StreamProvider.autoDispose.family<Map<String, dynamic>?, String>((ref, rideId) {
  final client = ref.watch(supabaseClientProvider);
  return client
      .from('rides')
      .stream(primaryKey: ['id'])
      .eq('id', rideId)
      .map((rows) => rows.isEmpty ? null : rows.first);
});

/// "تم العثور على سائق" (section 49) fires the instant the matching engine
/// assigns a driver — this screen just reacts to the realtime row, it never
/// polls and never guesses.
class SearchingDriverScreen extends ConsumerWidget {
  const SearchingDriverScreen({required this.rideId, super.key});
  final String rideId;

  Future<void> _cancel(BuildContext context, WidgetRef ref) async {
    final client = ref.read(supabaseClientProvider);
    // Free cancellation while still searching (section 138: no surprise fee
    // for a ride that never got a driver in the first place).
    await client.from('rides').update({
      'status': 'CANCELLED',
      'cancelled_by': 'customer',
      'cancellation_reason': 'cancelled_while_searching',
    }).eq('id', rideId);
    if (context.mounted) {
      Navigator.of(context).pushAndRemoveUntil(
        MaterialPageRoute(builder: (_) => const HomeScreen()),
        (route) => false,
      );
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final rideAsync = ref.watch(_rideStatusProvider(rideId));

    ref.listen(_rideStatusProvider(rideId), (previous, next) {
      final ride = next.valueOrNull;
      if (ride != null && ['ASSIGNED', 'ARRIVING', 'ARRIVED', 'STARTED'].contains(ride['status'])) {
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(builder: (_) => LiveTrackingScreen(rideId: rideId)),
        );
      }
      if (ride != null && ride['status'] == 'CANCELLED') {
        Navigator.of(context).pushAndRemoveUntil(
          MaterialPageRoute(builder: (_) => const HomeScreen()),
          (route) => false,
        );
      }
    });

    return Scaffold(
      backgroundColor: KabColors.ink,
      body: SafeArea(
        child: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const CircularProgressIndicator(color: KabColors.accent, strokeWidth: 3),
              const SizedBox(height: 24),
              const Text('Finding your driver…', style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w600)),
              const SizedBox(height: 8),
              const Text('This usually takes under a minute', style: TextStyle(color: KabColors.neutralGray, fontSize: 13)),
              const SizedBox(height: 40),
              if (rideAsync.valueOrNull?['status'] == 'SEARCHING')
                OutlinedButton(
                  onPressed: () => _cancel(context, ref),
                  style: OutlinedButton.styleFrom(foregroundColor: Colors.white, side: const BorderSide(color: KabColors.darkBorder)),
                  child: const Text('Cancel'),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
