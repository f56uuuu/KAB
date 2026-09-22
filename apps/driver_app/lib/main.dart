import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:kab_design_system/theme.dart';
import 'features/dashboard/driver_home_screen.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  await Supabase.initialize(
    url: const String.fromEnvironment('SUPABASE_URL'),
    anonKey: const String.fromEnvironment('SUPABASE_ANON_KEY'),
  );

  runApp(const ProviderScope(child: KabDriverApp()));
}

class KabDriverApp extends StatelessWidget {
  const KabDriverApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'KAP Driver',
      debugShowCheckedModeBanner: false,
      // Driver app defaults to dark — matches the ink/lime identity and is
      // easier on the eyes for long shifts, especially at night.
      theme: KabTheme.dark(),
      darkTheme: KabTheme.dark(),
      themeMode: ThemeMode.dark,
      home: const DriverHomeScreen(),
    );
  }
}
