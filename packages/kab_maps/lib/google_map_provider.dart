import 'dart:convert';
import 'package:http/http.dart' as http;
import 'kab_map_provider.dart';

/// Google Maps is the primary provider (section 17 — official SDK/API only,
/// never scraping or unofficial endpoints). All Google-specific quirks
/// (response shape, API key handling) live only in this file.
class GoogleMapProvider implements KabMapProvider {
  GoogleMapProvider({required this.apiKey});
  final String apiKey;

  @override
  String get providerName => 'google';

  @override
  Future<GeoPoint> geocode(String address, {required String countryCode}) async {
    final uri = Uri.https('maps.googleapis.com', '/maps/api/geocode/json', {
      'address': address,
      'components': 'country:$countryCode',
      'key': apiKey,
    });
    final res = await http.get(uri);
    final body = jsonDecode(res.body);
    final loc = body['results'][0]['geometry']['location'];
    return GeoPoint(loc['lat'], loc['lng']);
  }

  @override
  Future<String> reverseGeocode(GeoPoint point) async {
    final uri = Uri.https('maps.googleapis.com', '/maps/api/geocode/json', {
      'latlng': '${point.latitude},${point.longitude}',
      'key': apiKey,
    });
    final res = await http.get(uri);
    final body = jsonDecode(res.body);
    return body['results'][0]['formatted_address'] as String;
  }

  @override
  Future<RouteResult> calculateRoute({
    required GeoPoint origin,
    required GeoPoint destination,
    List<GeoPoint> waypoints = const [],
  }) async {
    final uri = Uri.https('maps.googleapis.com', '/maps/api/directions/json', {
      'origin': '${origin.latitude},${origin.longitude}',
      'destination': '${destination.latitude},${destination.longitude}',
      'alternatives': 'true',
      'key': apiKey,
    });
    final res = await http.get(uri);
    final body = jsonDecode(res.body);
    final routes = (body['routes'] as List);

    RouteResult toResult(Map r) {
      final leg = r['legs'][0];
      return RouteResult(
        distanceMeters: (leg['distance']['value'] as num).toDouble(),
        durationSeconds: leg['duration']['value'] as int,
        polyline: r['overview_polyline']['points'] as String,
      );
    }

    final primary = toResult(routes.first as Map);
    final alternates = routes.skip(1).map((r) => toResult(r as Map)).toList();
    return RouteResult(
      distanceMeters: primary.distanceMeters,
      durationSeconds: primary.durationSeconds,
      polyline: primary.polyline,
      alternates: alternates,
    );
  }

  @override
  Future<List<PlaceSuggestion>> searchPlaces(String query, {required GeoPoint biasCenter}) async {
    final uri = Uri.https('maps.googleapis.com', '/maps/api/place/autocomplete/json', {
      'input': query,
      'location': '${biasCenter.latitude},${biasCenter.longitude}',
      'radius': '20000',
      'key': apiKey,
    });
    final res = await http.get(uri);
    final body = jsonDecode(res.body);
    return (body['predictions'] as List).map((p) {
      return PlaceSuggestion(label: p['description'] as String, point: biasCenter, placeId: p['place_id'] as String);
    }).toList();
  }

  @override
  Future<void> refreshOfflineRegion(String countryCode) async {
    // Google Maps SDK tile caching is handled natively by the map widget's
    // own disk cache; there is no public "pre-download region" API like
    // Mapbox/HERE offer. For KAB's target countries we instead pre-warm the
    // cache by rendering the map at each major city's default camera position
    // in the background — see OfflineMapCacheService, which calls this on a
    // schedule and simply "visits" city centers so tiles are already cached
    // next time a real user opens the map there.
    return;
  }
}
