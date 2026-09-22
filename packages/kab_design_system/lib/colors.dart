import 'package:flutter/material.dart';

/// KAP official brand palette (from the brand book): Primary Yellow,
/// Deep Black, Neutral Gray, White. No screen should hardcode a Color(...)
/// — everything references KabColors so a brand refresh is a one-file change.
class KabColors {
  KabColors._();

  // Brand — exact hex values from the KAP brand book.
  static const accent = Color(0xFFFFD100);       // Primary Yellow
  static const accentPressed = Color(0xFFE6BC00);
  static const onAccent = Color(0xFF0D0D0F);     // Deep Black — required for contrast on yellow

  static const ink = Color(0xFF0D0D0F);          // Deep Black
  static const neutralGray = Color(0xFFA1A1A1);  // Neutral Gray
  static const inkSoft = neutralGray;

  static const success = Color(0xFF16A34A);
  static const warning = Color(0xFFF5A623);
  static const danger = Color(0xFFE5484D);
  static const info = Color(0xFF2F6FED);

  // Light theme surfaces
  static const lightBackground = Color(0xFFFFFFFF);
  static const lightSurface = Color(0xFFF7F7F8);
  static const lightBorder = Color(0xFFE7E7EA);
  static const lightTextPrimary = ink;
  static const lightTextSecondary = neutralGray;

  // Dark theme — driver app + splash default to this, matching the brand
  // book's own black-dominant mockups (taxi livery, app icon, screens).
  static const darkBackground = ink;
  static const darkSurface = Color(0xFF17171A);
  static const darkBorder = Color(0xFF2A2A2E);
  static const darkTextPrimary = Color(0xFFF5F5F7);
  static const darkTextSecondary = neutralGray;

  // Deprecated aliases kept only so existing code keeps compiling without a
  // find-replace pass; new screens should reference accent/ink directly.
  static const primary = accent;
  static const primaryDark = accentPressed;
  static const onPrimary = onAccent;
  static const secondary = ink;
}


