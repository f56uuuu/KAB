import 'package:flutter/material.dart';

/// Wraps Card with KAB's standard padding/tap behavior so service tiles,
/// history rows, and marketplace listings all share one visual language.
class KabCard extends StatelessWidget {
  const KabCard({
    required this.child,
    this.onTap,
    this.padding = const EdgeInsets.all(16),
    super.key,
  });

  final Widget child;
  final VoidCallback? onTap;
  final EdgeInsets padding;

  @override
  Widget build(BuildContext context) {
    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Padding(padding: padding, child: child),
      ),
    );
  }
}
