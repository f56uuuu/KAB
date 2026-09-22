import 'package:flutter/material.dart';

/// Tajawal — the official KAP brand typeface. Renders both Arabic and Latin
/// scripts cleanly at the same weight/x-height, so switching languages never
/// makes the UI look like two different apps stitched together.
class KabTypography {
  KabTypography._();

  static const fontFamily = 'Tajawal';

  static const TextTheme textTheme = TextTheme(
    displayLarge: TextStyle(fontFamily: fontFamily, fontSize: 34, fontWeight: FontWeight.w700, height: 1.2),
    headlineMedium: TextStyle(fontFamily: fontFamily, fontSize: 26, fontWeight: FontWeight.w700, height: 1.25),
    headlineSmall: TextStyle(fontFamily: fontFamily, fontSize: 22, fontWeight: FontWeight.w600, height: 1.3),
    titleLarge: TextStyle(fontFamily: fontFamily, fontSize: 18, fontWeight: FontWeight.w600, height: 1.3),
    titleMedium: TextStyle(fontFamily: fontFamily, fontSize: 16, fontWeight: FontWeight.w600, height: 1.35),
    bodyLarge: TextStyle(fontFamily: fontFamily, fontSize: 16, fontWeight: FontWeight.w400, height: 1.5),
    bodyMedium: TextStyle(fontFamily: fontFamily, fontSize: 14, fontWeight: FontWeight.w400, height: 1.5),
    bodySmall: TextStyle(fontFamily: fontFamily, fontSize: 12, fontWeight: FontWeight.w400, height: 1.4),
    labelLarge: TextStyle(fontFamily: fontFamily, fontSize: 15, fontWeight: FontWeight.w600, height: 1.2),
  );
}


