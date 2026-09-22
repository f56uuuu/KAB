import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:kab_design_system/colors.dart';
import 'package:kab_core/auth/auth_provider.dart';

const _decisionWindowSeconds = 15;

/// Shown the instant incomingRideProvider fires. The countdown ring is the
/// signature interaction of this screen — glanceable at 2am without reading
/// text, matching the "Fast. Simple. Clear." principle harder than any
/// competitor reviewed (their common failure mode is a driver having no
/// visible urgency cue and missing/ignoring requests).
class IncomingRideSheet extends ConsumerStatefulWidget {
  const IncomingRideSheet({required this.ride, super.key});
  final Map<String, dynamic> ride;

  @override
  ConsumerState<IncomingRideSheet> createState() => _IncomingRideSheetState();
}

class _IncomingRideSheetState extends ConsumerState<IncomingRideSheet> {
  int _secondsLeft = _decisionWindowSeconds;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _timer = Timer.periodic(const Duration(seconds: 1), (t) {
      setState(() => _secondsLeft--);
      if (_secondsLeft <= 0) {
        t.cancel();
        _decline(auto: true);
      }
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  Future<void> _accept() async {
    _timer?.cancel();
    final client = ref.read(supabaseClientProvider);
    await client.from('rides').update({'status': 'ARRIVING'}).eq('id', widget.ride['id']);
    if (mounted) Navigator.of(context).pop(true);
  }

  Future<void> _decline({bool auto = false}) async {
    _timer?.cancel();
    final client = ref.read(supabaseClientProvider);
    final driverId = ref.read(authRepositoryProvider).currentUser?.id;
    // Put it back in the matching pool rather than cancelling outright —
    // a decline is a driver-level event, not a customer-facing failure.
    await client.from('rides').update({'status': 'SEARCHING', 'driver_id': null}).eq('id', widget.ride['id']);
    if (driverId != null) {
      await client.rpc('record_driver_decline', params: {'p_driver_id': driverId});
    }
    if (mounted) Navigator.of(context).pop(false);
  }

  @override
  Widget build(BuildContext context) {
    final progress = _secondsLeft / _decisionWindowSeconds;

    return Container(
      color: KabColors.ink,
      padding: const EdgeInsets.all(24),
      child: SafeArea(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            SizedBox(
              width: 96,
              height: 96,
              child: Stack(
                alignment: Alignment.center,
                children: [
                  CircularProgressIndicator(
                    value: progress,
                    strokeWidth: 6,
                    backgroundColor: KabColors.darkBorder,
                    valueColor: const AlwaysStoppedAnimation(KabColors.accent),
                  ),
                  Text(
                    '$_secondsLeft',
                    style: const TextStyle(color: Colors.white, fontSize: 28, fontWeight: FontWeight.w700),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 32),
            const Text('New ride request', style: TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.w700)),
            const SizedBox(height: 8),
            Text(
              widget.ride['pickup_address'] ?? 'Pickup nearby',
              style: const TextStyle(color: KabColors.darkTextSecondary, fontSize: 15),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            Text(
              '${widget.ride['estimated_fare'] ?? '--'} ${widget.ride['currency_code'] ?? ''}',
              style: const TextStyle(color: KabColors.accent, fontSize: 20, fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 40),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () => _decline(),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: Colors.white,
                      side: const BorderSide(color: KabColors.darkBorder),
                      minimumSize: const Size.fromHeight(56),
                    ),
                    child: const Text('Decline'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  flex: 2,
                  child: FilledButton(
                    onPressed: _accept,
                    style: FilledButton.styleFrom(
                      backgroundColor: KabColors.accent,
                      foregroundColor: KabColors.onAccent,
                      minimumSize: const Size.fromHeight(56),
                    ),
                    child: const Text('Accept', style: TextStyle(fontWeight: FontWeight.w700)),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
