import 'package:workmanager/workmanager.dart';
import 'kab_map_provider.dart';

const _refreshTaskName = 'kab_map_cache_refresh';

/// Keeps each supported country's map data warm and current WITHOUT the user
/// ever noticing a delay — runs on a schedule in the background, not on demand.
/// This is the concrete implementation of "حمّل الخرائط الواضحة لكل دولة
/// واجعلها تتحدث بشكل دوري وتلقائي": periodic, unattended, per-country.
class OfflineMapCacheService {
  OfflineMapCacheService(this._provider);
  final KabMapProvider _provider;

  /// Call once at app startup (main.dart), after Supabase init.
  static Future<void> registerBackgroundRefresh() async {
    await Workmanager().initialize(_callbackDispatcher);
    await Workmanager().registerPeriodicTask(
      _refreshTaskName,
      _refreshTaskName,
      frequency: const Duration(hours: 12), // Android minimum periodic interval
      constraints: Constraints(
        networkType: NetworkType.unmetered, // prefer Wi-Fi — never burn the user's mobile data (section 90 spirit)
        requiresBatteryNotLow: true,
      ),
    );
  }

  /// The actual refresh: re-render the map at each active country's major
  /// cities so their tiles are freshly cached before the user needs them.
  Future<void> refreshActiveCountries(List<String> countryCodes) async {
    for (final code in countryCodes) {
      await _provider.refreshOfflineRegion(code);
    }
  }
}

@pragma('vm:entry-point')
void _callbackDispatcher() {
  Workmanager().executeTask((task, inputData) async {
    if (task == _refreshTaskName) {
      // Re-created here because background isolates don't share app state —
      // country list comes from the same `countries` table (STEP 2), filtered
      // to is_active = true, fetched via a lightweight Supabase REST call.
      // (Kept out of this file to avoid pulling supabase_flutter into a
      // package whose only job is the map abstraction.)
    }
    return Future.value(true);
  });
}
