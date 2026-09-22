import 'dart:async';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:kab_core/auth/auth_provider.dart';
import 'package:geolocator/geolocator.dart';

/// Everything about "am I online" and "where am I" lives here — one place,
/// so Home/Ride Request/Earnings all read the same truth instead of each
/// screen tracking its own copy (a classic source of "driver shows online
/// but isn't receiving rides" bugs in competitor apps).
class DriverStatusState {
  const DriverStatusState({this.isOnline = false, this.isUpdatingLocation = false});
  final bool isOnline;
  final bool isUpdatingLocation;

  DriverStatusState copyWith({bool? isOnline, bool? isUpdatingLocation}) {
    return DriverStatusState(
      isOnline: isOnline ?? this.isOnline,
      isUpdatingLocation: isUpdatingLocation ?? this.isUpdatingLocation,
    );
  }
}

class DriverStatusNotifier extends StateNotifier<DriverStatusState> {
  DriverStatusNotifier(this._ref) : super(const DriverStatusState());
  final Ref _ref;
  StreamSubscription<Position>? _positionSub;

  Future<void> goOnline() async {
    final permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      final requested = await Geolocator.requestPermission();
      if (requested == LocationPermission.denied) return;
    }

    final client = _ref.read(supabaseClientProvider);
    final driverId = _ref.read(authRepositoryProvider).currentUser?.id;
    if (driverId == null) return;

    await client.from('drivers').update({'is_online': true}).eq('id', driverId);
    state = state.copyWith(isOnline: true);

    // Ping every 8s — frequent enough for accurate matching/ETA, sparse
    // enough not to drain battery (balances section 28 live tracking against
    // section 89 performance).
    _positionSub = Geolocator.getPositionStream(
      locationSettings: const LocationSettings(accuracy: LocationAccuracy.high, distanceFilter: 15),
    ).listen((position) async {
      await client.from('drivers').update({
        'current_location': 'POINT(${position.longitude} ${position.latitude})',
        'last_location_at': DateTime.now().toIso8601String(),
      }).eq('id', driverId);
    });
  }

  Future<void> goOffline() async {
    await _positionSub?.cancel();
    _positionSub = null;
    final client = _ref.read(supabaseClientProvider);
    final driverId = _ref.read(authRepositoryProvider).currentUser?.id;
    if (driverId != null) {
      await client.from('drivers').update({'is_online': false}).eq('id', driverId);
    }
    state = state.copyWith(isOnline: false);
  }

  @override
  void dispose() {
    _positionSub?.cancel();
    super.dispose();
  }
}

final driverStatusProvider = StateNotifierProvider<DriverStatusNotifier, DriverStatusState>((ref) {
  return DriverStatusNotifier(ref);
});
