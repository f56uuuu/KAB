import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:kab_core/auth/auth_provider.dart';
import 'package:kab_design_system/colors.dart';
import 'package:kab_design_system/components/kab_states.dart';
import '../home/home_screen.dart';

final _rideStreamProvider = StreamProvider.autoDispose.family<Map<String, dynamic>?, String>((ref, rideId) {
  final client = ref.watch(supabaseClientProvider);
  return client
      .from('rides')
      .stream(primaryKey: ['id'])
      .eq('id', rideId)
      .map((rows) => rows.isEmpty ? null : rows.first);
});

const _statusCopy = {
  'ASSIGNED': 'Driver assigned',
  'ARRIVING': 'Driver is on the way',
  'ARRIVED': 'Driver has arrived',
  'STARTED': 'On the way to your destination',
  'COMPLETED': 'Trip complete',
};

/// Driver location is intentionally NOT a live realtime stream here — the
/// `drivers` table's RLS only lets a driver see their own row (privacy),
/// so the customer app pulls the driver's public info through the
/// `get_driver_public_profile` RPC on a short poll instead of subscribing
/// to raw table changes. A production upgrade would move this to a
/// per-ride Realtime Broadcast channel the driver app publishes location
/// to — same privacy guarantee, push instead of poll.
class LiveTrackingScreen extends ConsumerStatefulWidget {
  const LiveTrackingScreen({required this.rideId, super.key});
  final String rideId;

  @override
  ConsumerState<LiveTrackingScreen> createState() => _LiveTrackingScreenState();
}

class _LiveTrackingScreenState extends ConsumerState<LiveTrackingScreen> {
  Map<String, dynamic>? _driver;
  Timer? _pollTimer;
  String? _driverId;

  void _startPolling(String driverId) {
    if (_driverId == driverId && _pollTimer != null) return;
    _driverId = driverId;
    _pollTimer?.cancel();
    _fetchDriver(driverId);
    _pollTimer = Timer.periodic(const Duration(seconds: 5), (_) => _fetchDriver(driverId));
  }

  Future<void> _fetchDriver(String driverId) async {
    final client = ref.read(supabaseClientProvider);
    final rows = await client.rpc('get_driver_public_profile', params: {'target_driver_id': driverId});
    if (mounted && rows is List && rows.isNotEmpty) {
      setState(() => _driver = rows.first as Map<String, dynamic>);
    }
  }

  @override
  void dispose() {
    _pollTimer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final rideAsync = ref.watch(_rideStreamProvider(widget.rideId));

    ref.listen(_rideStreamProvider(widget.rideId), (previous, next) {
      final ride = next.valueOrNull;
      if (ride?['driver_id'] != null) _startPolling(ride!['driver_id']);
      if (ride != null && ['COMPLETED', 'CANCELLED'].contains(ride['status'])) {
        _pollTimer?.cancel();
        // A brief moment on the final status before returning Home gives
        // the customer a sense of closure rather than an abrupt jump.
        Future.delayed(const Duration(seconds: 2), () {
          if (mounted) {
            Navigator.of(context).pushAndRemoveUntil(
              MaterialPageRoute(builder: (_) => const HomeScreen()),
              (route) => false,
            );
          }
        });
      }
    });

    return rideAsync.when(
      loading: () => const Scaffold(body: KabLoadingView()),
      error: (e, _) => Scaffold(body: KabErrorView(title: 'Couldn\'t load your ride')),
      data: (ride) {
        if (ride == null) return const Scaffold(body: KabEmptyView(title: 'Ride not found'));
        return Scaffold(
          appBar: AppBar(title: Text(_statusCopy[ride['status']] ?? ride['status'])),
          body: Column(
            children: [
              Expanded(
                child: Container(
                  color: KabColors.lightSurface,
                  alignment: Alignment.center,
                  child: const Text('Map view — see kab_maps package', style: TextStyle(color: KabColors.lightTextSecondary)),
                ),
              ),
              if (_driver != null) _DriverCard(driver: _driver!),
              Padding(
                padding: const EdgeInsets.all(20),
                child: Text(
                  '${ride['estimated_fare']} ${ride['currency_code']}',
                  style: Theme.of(context).textTheme.titleLarge,
                  textAlign: TextAlign.center,
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}

class _DriverCard extends StatelessWidget {
  const _DriverCard({required this.driver});
  final Map<String, dynamic> driver;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.all(16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: KabColors.lightSurface,
        border: Border.all(color: KabColors.lightBorder),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(
        children: [
          CircleAvatar(radius: 24, backgroundColor: KabColors.lightBorder, child: const Icon(Icons.person)),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(driver['full_name'] ?? 'Driver', style: Theme.of(context).textTheme.titleMedium),
                Text(
                  '${driver['make'] ?? ''} ${driver['model'] ?? ''} · ${driver['plate_number'] ?? ''}',
                  style: TextStyle(color: KabColors.lightTextSecondary, fontSize: 12),
                ),
              ],
            ),
          ),
          Row(
            children: [
              const Icon(Icons.star, color: KabColors.warning, size: 16),
              const SizedBox(width: 4),
              Text('${driver['rating'] ?? '-'}'),
            ],
          ),
        ],
      ),
    );
  }
}
