import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:kab_core/localization/language_provider.dart';

/// Wrap MaterialApp's `builder` with this so that EVERYTHING under it —
/// navigation transitions, icon mirroring, list alignment, map controls —
/// flips direction automatically. Section 9 is explicit: RTL/LTR is not
/// just text alignment, it's the whole layout, so we drive it from one
/// single Directionality widget rather than scattering `TextDirection`
/// checks across every screen.
class KabDirectionalityScope extends ConsumerWidget {
  const KabDirectionalityScope({required this.child, super.key});
  final Widget child;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final languageCode = ref.watch(selectedLanguageProvider) ?? 'ar';
    final direction = isRtl(languageCode) ? TextDirection.rtl : TextDirection.ltr;
    return Directionality(textDirection: direction, child: child);
  }
}

/// Feed this into MaterialApp(locale: ...).
Locale currentAppLocale(WidgetRef ref) {
  final languageCode = ref.watch(selectedLanguageProvider) ?? 'ar';
  return Locale(languageCode);
}

/// Icons that must be manually mirrored in RTL (arrows, chevrons — Flutter's
/// Material icons don't all auto-mirror). Use this instead of hardcoding
/// Icons.arrow_forward everywhere (section 9: "Icons where directional").
IconData directionalIcon(BuildContext context, {required IconData ltr, required IconData rtl}) {
  return Directionality.of(context) == TextDirection.rtl ? rtl : ltr;
}
