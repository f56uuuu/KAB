import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:kab_core/localization/language_provider.dart';
import 'package:kab_core/auth/auth_provider.dart';
import 'package:kab_design_system/colors.dart';
import '../auth/phone_entry_screen.dart';
import '../home/home_screen.dart';

const _languageNames = <String, String>{
  'ar': 'العربية', 'en': 'English', 'fr': 'Français', 'es': 'Español',
  'de': 'Deutsch', 'it': 'Italiano', 'tr': 'Türkçe', 'fa': 'فارسی',
  'ur': 'اردو', 'ru': 'Русский', 'pt': 'Português', 'zh': '中文',
  'ja': '日本語', 'ko': '한국어',
};

/// Matches the iOS "Choose Your Language" pattern exactly: a plain list,
/// tap a row to highlight it with a checkmark, tap Continue to confirm —
/// two deliberate taps instead of one row-tap that instantly navigates,
/// which is what makes iOS's version feel calm rather than trigger-happy.
class LanguageSelectionScreen extends ConsumerStatefulWidget {
  const LanguageSelectionScreen({super.key});

  @override
  ConsumerState<LanguageSelectionScreen> createState() => _LanguageSelectionScreenState();
}

class _LanguageSelectionScreenState extends ConsumerState<LanguageSelectionScreen> {
  late String _selected;

  @override
  void initState() {
    super.initState();
    _selected = ref.read(selectedLanguageProvider.notifier).detectDeviceLanguage() ?? 'en';
  }

  Future<void> _confirm() async {
    await ref.read(selectedLanguageProvider.notifier).select(_selected);
    if (!mounted) return;
    final isLoggedIn = ref.read(isLoggedInProvider);
    Navigator.of(context).pushReplacement(
      MaterialPageRoute(builder: (_) => isLoggedIn ? const HomeScreen() : const PhoneEntryScreen()),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: KabColors.lightBackground,
      body: SafeArea(
        child: Column(
          children: [
            const Padding(
              padding: EdgeInsets.fromLTRB(24, 32, 24, 8),
              child: Align(
                alignment: Alignment.centerLeft,
                child: Text(
                  'Choose your language\nاختر لغتك',
                  style: TextStyle(fontFamily: 'Tajawal', fontSize: 22, fontWeight: FontWeight.w700, height: 1.3),
                ),
              ),
            ),
            Expanded(
              child: ListView.separated(
                padding: const EdgeInsets.symmetric(vertical: 8),
                itemCount: supportedLanguageCodes.length,
                separatorBuilder: (_, __) => Divider(height: 1, color: KabColors.lightBorder, indent: 24),
                itemBuilder: (context, i) {
                  final code = supportedLanguageCodes[i];
                  final isSelected = code == _selected;
                  return InkWell(
                    onTap: () => setState(() => _selected = code),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
                      color: isSelected ? KabColors.accent.withOpacity(0.08) : Colors.transparent,
                      child: Row(
                        children: [
                          Expanded(
                            child: Text(
                              _languageNames[code] ?? code,
                              style: TextStyle(
                                fontFamily: 'Tajawal',
                                fontSize: 17,
                                fontWeight: isSelected ? FontWeight.w700 : FontWeight.w400,
                                color: KabColors.ink,
                              ),
                            ),
                          ),
                          if (isSelected) const Icon(Icons.check_circle, color: KabColors.accentPressed, size: 22),
                        ],
                      ),
                    ),
                  );
                },
              ),
            ),
            SafeArea(
              top: false,
              child: Padding(
                padding: const EdgeInsets.fromLTRB(24, 12, 24, 20),
                child: SizedBox(
                  width: double.infinity,
                  height: 52,
                  child: FilledButton(
                    onPressed: _confirm,
                    style: FilledButton.styleFrom(
                      backgroundColor: KabColors.accent,
                      foregroundColor: KabColors.onAccent,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                    ),
                    child: const Text('Continue', style: TextStyle(fontFamily: 'Tajawal', fontWeight: FontWeight.w700, fontSize: 16)),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

