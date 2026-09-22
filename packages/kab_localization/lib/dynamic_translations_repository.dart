import 'package:supabase_flutter/supabase_flutter.dart';

/// Reads Admin-editable text (FAQ, banners, campaigns, terms) that must
/// change without an app release. Static UI strings never go through here —
/// they come from the compiled AppLocalizations instead. Keeping these two
/// sources separate is the point of section 8's "no scattered translation
/// strings": one path for what ships with the app, one for what Admin edits live.
class DynamicTranslationsRepository {
  DynamicTranslationsRepository(this._client);
  final SupabaseClient _client;

  Future<Map<String, String>> fieldsFor({
    required String entityType,
    String? entityId,
    required String languageCode,
  }) async {
    var query = _client
        .from('content_translations')
        .select('field, value')
        .eq('entity_type', entityType)
        .eq('language_code', languageCode);

    query = entityId == null
        ? query.filter('entity_id', 'is', null)
        : query.eq('entity_id', entityId);

    final rows = await query;
    return {for (final r in rows) r['field'] as String: r['value'] as String};
  }
}
