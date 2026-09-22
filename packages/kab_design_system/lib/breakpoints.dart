import 'package:flutter/widgets.dart';

/// KAB targets phones only — no tablet/desktop layouts to design or QA
/// (keeps the $2,000 budget honest). This file exists only to make phones
/// of very different sizes (small Android budget phones vs large iPhones)
/// look equally polished, not to support other device classes.
class KabBreakpoints {
  KabBreakpoints._();

  static const compactMaxWidth = 360.0;  // small Android phones (e.g. old budget devices)
  static const standardMaxWidth = 430.0; // typical modern phones (iPhone 14/15, mid-range Android)
  // Anything above standardMaxWidth (foldables unfolded, etc.) still uses the
  // "large" scale below rather than a distinct tablet layout.

  static KabScreenSize of(BuildContext context) {
    final width = MediaQuery.sizeOf(context).width;
    if (width <= compactMaxWidth) return KabScreenSize.compact;
    if (width <= standardMaxWidth) return KabScreenSize.standard;
    return KabScreenSize.large;
  }
}

enum KabScreenSize { compact, standard, large }

/// Spacing/type scale that shrinks gracefully on compact phones instead of
/// clipping text or forcing horizontal scroll — never a second layout to maintain.
class KabSpacing {
  const KabSpacing({required this.screenPadding, required this.cardGap, required this.sectionGap});

  final double screenPadding;
  final double cardGap;
  final double sectionGap;

  static KabSpacing of(BuildContext context) {
    switch (KabBreakpoints.of(context)) {
      case KabScreenSize.compact:
        return const KabSpacing(screenPadding: 16, cardGap: 10, sectionGap: 20);
      case KabScreenSize.standard:
        return const KabSpacing(screenPadding: 20, cardGap: 12, sectionGap: 24);
      case KabScreenSize.large:
        return const KabSpacing(screenPadding: 24, cardGap: 14, sectionGap: 28);
    }
  }
}

/// Wrap any screen body in this instead of hardcoding EdgeInsets.all(20) —
/// one change here reflows every screen consistently.
class KabScreenPadding extends StatelessWidget {
  const KabScreenPadding({required this.child, super.key});
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final spacing = KabSpacing.of(context);
    return Padding(
      padding: EdgeInsets.symmetric(horizontal: spacing.screenPadding),
      child: child,
    );
  }
}
