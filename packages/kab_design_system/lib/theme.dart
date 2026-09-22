import 'package:flutter/material.dart';
import 'colors.dart';
import 'typography.dart';

/// Every button, card, input across all three apps (customer/driver/admin)
/// pulls its default look from here. A visual refresh is a change to this
/// one file, not a hunt through hundreds of widgets.
class KabTheme {
  KabTheme._();

  static ThemeData light() {
    final scheme = ColorScheme.light(
      primary: KabColors.accent,
      onPrimary: KabColors.onAccent,
      secondary: KabColors.ink,
      error: KabColors.danger,
      surface: KabColors.lightSurface,
      onSurface: KabColors.lightTextPrimary,
    );
    return _base(scheme, KabColors.lightBackground, KabColors.lightBorder, KabColors.lightTextSecondary);
  }

  static ThemeData dark() {
    final scheme = ColorScheme.dark(
      primary: KabColors.accent,
      onPrimary: KabColors.onAccent,
      secondary: KabColors.darkTextPrimary,
      error: KabColors.danger,
      surface: KabColors.darkSurface,
      onSurface: KabColors.darkTextPrimary,
    );
    return _base(scheme, KabColors.darkBackground, KabColors.darkBorder, KabColors.darkTextSecondary);
  }

  static ThemeData _base(ColorScheme scheme, Color background, Color border, Color textSecondary) {
    return ThemeData(
      useMaterial3: true,
      colorScheme: scheme,
      scaffoldBackgroundColor: background,
      fontFamily: KabTypography.fontFamily,
      textTheme: KabTypography.textTheme.apply(
        bodyColor: scheme.onSurface,
        displayColor: scheme.onSurface,
      ),
      appBarTheme: AppBarTheme(
        backgroundColor: background,
        foregroundColor: scheme.onSurface,
        elevation: 0,
        centerTitle: false,
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          backgroundColor: scheme.primary,
          foregroundColor: scheme.onPrimary,
          minimumSize: const Size.fromHeight(52),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
          textStyle: KabTypography.textTheme.labelLarge,
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          minimumSize: const Size.fromHeight(52),
          side: BorderSide(color: border),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
        ),
      ),
      cardTheme: CardThemeData(
        color: scheme.surface,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: BorderSide(color: border),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: scheme.surface,
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: BorderSide(color: border),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: BorderSide(color: border),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: BorderSide(color: scheme.primary, width: 1.5),
        ),
        hintStyle: TextStyle(color: textSecondary),
      ),
      bottomSheetTheme: BottomSheetThemeData(
        backgroundColor: scheme.surface,
        shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        ),
      ),
      dividerTheme: DividerThemeData(color: border, thickness: 1, space: 1),
      // Motion with purpose (section 120): short, consistent, never bouncy/showy.
      pageTransitionsTheme: const PageTransitionsTheme(
        builders: {
          TargetPlatform.android: FadeUpwardsPageTransitionsBuilder(),
          TargetPlatform.iOS: CupertinoPageTransitionsBuilder(),
        },
      ),
    );
  }
}
