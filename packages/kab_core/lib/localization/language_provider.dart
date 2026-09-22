import 'dart:ui' show PlatformDispatcher;
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

const _prefsKey = 'kab_selected_language';

/// Languages the app architecture supports from day one (section 10).
/// Adding a new one later is a data change (ARB file + this list), never a rebuild.
const supportedLanguageCodes = <String>[
  'ar', 'en', 'fr', 'es', 'de', 'it', 'tr', 'fa', 'ur', 'ru', 'pt', 'zh', 'ja', 'ko',
];

const rtlLanguageCodes = <String>['ar', 'fa', 'ur'];

bool isRtl(String languageCode) => rtlLanguageCodes.contains(languageCode);

/// null = user has never chosen yet → app shows the language selection screen.
final selectedLanguageProvider =
    StateNotifierProvider<LanguageNotifier, String?>((ref) {
  return LanguageNotifier();
});

class LanguageNotifier extends StateNotifier<String?> {
  LanguageNotifier() : super(null) {
    _load();
  }

  Future<void> _load() async {
    final prefs = await SharedPreferences.getInstance();
    final saved = prefs.getString(_prefsKey);
    state = saved; // stays null on very first launch — triggers onboarding
  }

  /// Best-guess language from the device locale, only if we support it.
  /// Used to pre-select (not force) an option on the language screen (section 6).
  String? detectDeviceLanguage() {
    final deviceCode = PlatformDispatcher.instance.locale.languageCode;
    return supportedLanguageCodes.contains(deviceCode) ? deviceCode : null;
  }

  Future<void> select(String languageCode) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_prefsKey, languageCode);
    state = languageCode;
  }
}
