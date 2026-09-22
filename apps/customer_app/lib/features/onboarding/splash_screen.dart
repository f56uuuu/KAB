import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:kab_core/localization/language_provider.dart';
import 'package:kab_core/auth/auth_provider.dart';
import 'package:kab_design_system/colors.dart';
import 'language_selection_screen.dart';
import '../auth/phone_entry_screen.dart';
import '../home/home_screen.dart';

/// Brand-book-accurate splash: the KAP logo centered on Deep Black, exactly
/// like the app-icon/lock-screen mockups in the brand book — no competing
/// animation, no marketing copy. A quiet multilingual "Hello" cycles beneath
/// it only as a signal that language selection is coming next.
class SplashScreen extends ConsumerStatefulWidget {
  const SplashScreen({super.key});

  @override
  ConsumerState<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends ConsumerState<SplashScreen> {
  static const _greetings = [
    'مرحبًا', 'Hello', 'Bonjour', 'Hola', 'Merhaba', '你好',
  ];

  int _index = 0;

  @override
  void initState() {
    super.initState();
    _cycleGreetings();
    _decideNextScreen();
  }

  void _cycleGreetings() {
    Future.doWhile(() async {
      await Future.delayed(const Duration(milliseconds: 260));
      if (!mounted) return false;
      setState(() => _index = (_index + 1) % _greetings.length);
      return mounted;
    });
  }

  Future<void> _decideNextScreen() async {
    await Future.delayed(const Duration(milliseconds: 1400));
    if (!mounted) return;

    final savedLanguage = ref.read(selectedLanguageProvider);
    Widget destination;
    if (savedLanguage == null) {
      destination = const LanguageSelectionScreen();
    } else {
      // Supabase persists the session locally, so this reads instantly —
      // no network round-trip needed just to decide which screen to show.
      final isLoggedIn = ref.read(isLoggedInProvider);
      destination = isLoggedIn ? const HomeScreen() : const PhoneEntryScreen();
    }

    Navigator.of(context).pushReplacement(
      PageRouteBuilder(
        transitionDuration: const Duration(milliseconds: 300),
        pageBuilder: (_, animation, __) =>
            FadeTransition(opacity: animation, child: destination),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: KabColors.ink,
      body: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Image.asset(
              'assets/logo/kap_logo.png',
              width: 128,
              height: 128,
            ),
            const SizedBox(height: 28),
            AnimatedSwitcher(
              duration: const Duration(milliseconds: 220),
              child: Text(
                _greetings[_index],
                key: ValueKey(_index),
                style: const TextStyle(
                  color: Colors.white70,
                  fontFamily: 'Tajawal',
                  fontSize: 18,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

