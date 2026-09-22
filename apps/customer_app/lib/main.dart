import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:kab_design_system/theme.dart';
import 'package:kab_core/localization/language_provider.dart';
import 'package:kab_localization/directionality_scope.dart';
import 'package:kab_localization/l10n/app_localizations.dart';
import 'package:kab_maps/offline_map_cache_service.dart';
import 'package:kab_core/connectivity/connectivity_banner.dart';
import 'features/onboarding/splash_screen.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  await Supabase.initialize(
    url: const String.fromEnvironment('SUPABASE_URL'),
    anonKey: const String.fromEnvironment('SUPABASE_ANON_KEY'),
  );

  // Periodic, automatic, unattended — maps for Iraq/UAE/Syria (and any
  // country added later) stay fresh without the user ever waiting on it.
  await OfflineMapCacheService.registerBackgroundRefresh();

  runApp(const ProviderScope(child: KabApp()));
}

class KabApp extends ConsumerWidget {
  const KabApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final locale = currentAppLocale(ref);

    return MaterialApp(
      title: 'KAP',
      debugShowCheckedModeBanner: false,
      theme: KabTheme.light(),
      darkTheme: KabTheme.dark(),
      themeMode: ThemeMode.system,
      locale: locale,
      supportedLocales: supportedLanguageCodes.map(Locale.new),
      localizationsDelegates: const [
        AppLocalizations.delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      builder: (context, child) => KabDirectionalityScope(
        child: ConnectivityBanner(child: child ?? const SizedBox.shrink()),
      ),
      home: const SplashScreen(),
    );
  }
}
