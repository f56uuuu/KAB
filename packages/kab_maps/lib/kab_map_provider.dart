/// KAB never calls Google Maps (or any vendor) directly from feature code.
/// Every screen talks to this interface, so swapping/adding a provider later
/// (OSM, Mapbox, HERE, a local provider for a new country) never touches
/// Ride/Delivery/Marketplace code — only a new implementation of this file.
abstract class KabMapProvider {
  String get providerName;

  Future<GeoPoint> geocode(String address, {required String countryCode});

  Future<String> reverseGeocode(GeoPoint point);

  Future<RouteResult> calculateRoute({
    required GeoPoint origin,
    required GeoPoint destination,
    List<GeoPoint> waypoints = const [],
  });

  Future<List<PlaceSuggestion>> searchPlaces(String query, {required GeoPoint biasCenter});

  /// Pre-fetches/refreshes cached map tiles for a country so the map stays
  /// usable on weak connections (section 21/90) and stays visually current
  /// (section: "حمّل الخرائط الواضحة لكل دولة وتحدث بشكل دوري").
  Future<void> refreshOfflineRegion(String countryCode);
}

class GeoPoint {
  const GeoPoint(this.latitude, this.longitude);
  final double latitude;
  final double longitude;
}

class RouteResult {
  const RouteResult({
    required this.distanceMeters,
    required this.durationSeconds,
    required this.polyline,
    this.alternates = const [],
  });
  final double distanceMeters;
  final int durationSeconds;
  final String polyline; // encoded polyline
  final List<RouteResult> alternates;
}

class PlaceSuggestion {
  const PlaceSuggestion({required this.label, required this.point, this.placeId});
  final String label;
  final GeoPoint point;
  final String? placeId;
}
