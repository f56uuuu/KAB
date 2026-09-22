import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:kab_core/auth/auth_provider.dart';
import 'package:kab_maps/kab_map_provider.dart';
import 'package:kab_maps/google_map_provider.dart';

final mapProviderInstance = Provider<KabMapProvider>((ref) {
  return GoogleMapProvider(
    apiKey: const String.fromEnvironment('GOOGLE_MAPS_API_KEY'),
  );
});

class VehicleOption {
  const VehicleOption(this.type, this.label, this.icon);
  final String type;
  final String label;
  final String icon; // emoji placeholder until real vehicle art ships
}

const vehicleOptions = [
  VehicleOption('ECONOMY', 'Economy', '🚗'),
  VehicleOption('COMFORT', 'Comfort', '🚙'),
  VehicleOption('XL', 'XL', '🚐'),
];

class FareEstimate {
  const FareEstimate({required this.amount, required this.currencyCode, required this.distanceKm, required this.durationMin});
  final double amount;
  final String currencyCode;
  final double distanceKm;
  final int durationMin;
}

/// Client-side estimate for display only — the number the customer sees
/// before confirming (section 137: Price Transparency). The ride row's
/// final charge is still whatever the backend computes/locks at creation,
/// never trusted from the client alone (section 109).
class RideRepository {
  RideRepository(this._ref);
  final Ref _ref;

  /// Every price and ride row needs a country_id/city_id — resolved once
  /// here from the pickup point rather than asking the user to pick their
  /// own city (one less decision for them, per the "less than the user
  /// thinks" philosophy in section 3).
  Future<({String countryId, String cityId})> resolveLocationContext(GeoPoint point) async {
    final client = _ref.read(supabaseClientProvider);
    final nearest = await client.rpc('nearest_city', params: {
      'p_lat': point.latitude,
      'p_lng': point.longitude,
    }).single();
    return (countryId: nearest['country_id'] as String, cityId: nearest['id'] as String);
  }

  Future<FareEstimate> estimateFare({
    required GeoPoint pickup,
    required GeoPoint destination,
    required String vehicleType,
    required String countryId,
    required String cityId,
  }) async {
    final mapProvider = _ref.read(mapProviderInstance);
    final route = await mapProvider.calculateRoute(origin: pickup, destination: destination);
    final client = _ref.read(supabaseClientProvider);

    final rule = await client
        .from('pricing_rules')
        .select()
        .eq('service_key', 'RIDE')
        .eq('city_id', cityId)
        .eq('vehicle_type', vehicleType)
        .eq('is_active', true)
        .maybeSingle();

    final distanceKm = route.distanceMeters / 1000;
    final durationMin = (route.durationSeconds / 60).ceil();

    if (rule == null) {
      // No pricing configured yet for this city/vehicle — surface a clear
      // zero rather than a silently wrong number.
      return FareEstimate(amount: 0, currencyCode: '—', distanceKm: distanceKm, durationMin: durationMin);
    }

    final base = (rule['base_fare'] as num).toDouble();
    final perKm = (rule['per_km'] as num).toDouble();
    final perMin = (rule['per_min'] as num).toDouble();
    final minFare = (rule['min_fare'] as num).toDouble();
    final surge = (rule['surge_multiplier'] as num?)?.toDouble() ?? 1.0;

    final raw = (base + perKm * distanceKm + perMin * durationMin) * surge;
    final fare = raw < minFare ? minFare : raw;

    final country = await client.from('countries').select('currency_code').eq('id', countryId).single();

    return FareEstimate(
      amount: double.parse(fare.toStringAsFixed(2)),
      currencyCode: country['currency_code'],
      distanceKm: distanceKm,
      durationMin: durationMin,
    );
  }

  Future<String> createRide({
    required GeoPoint pickup,
    required String pickupAddress,
    required GeoPoint destination,
    required String destinationAddress,
    required String vehicleType,
    required FareEstimate estimate,
    required String countryId,
    required String cityId,
  }) async {
    final client = _ref.read(supabaseClientProvider);
    final customerId = _ref.read(authRepositoryProvider).currentUser!.id;

    final row = await client.from('rides').insert({
      'customer_id': customerId,
      'status': 'SEARCHING',
      'pickup_location': 'POINT(${pickup.longitude} ${pickup.latitude})',
      'pickup_address': pickupAddress,
      'dropoff_location': 'POINT(${destination.longitude} ${destination.latitude})',
      'dropoff_address': destinationAddress,
      'vehicle_type': vehicleType,
      'estimated_fare': estimate.amount,
      'currency_code': estimate.currencyCode,
      'distance_km': estimate.distanceKm,
      'duration_min': estimate.durationMin,
      'country_id': countryId,
      'city_id': cityId,
    }).select().single();

    return row['id'] as String;
  }
}

final rideRepositoryProvider = Provider((ref) => RideRepository(ref));
