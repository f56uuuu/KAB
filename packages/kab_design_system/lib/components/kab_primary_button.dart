import 'package:flutter/material.dart';

/// Every primary action in the app uses this — never a raw FilledButton.
/// Bakes in the loading spinner so "tap → wait → result" never needs to be
/// re-implemented per screen (fewer places for a bug to hide = more reliability).
class KabPrimaryButton extends StatelessWidget {
  const KabPrimaryButton({
    required this.label,
    required this.onPressed,
    this.isLoading = false,
    this.enabled = true,
    super.key,
  });

  final String label;
  final VoidCallback? onPressed;
  final bool isLoading;
  final bool enabled;

  @override
  Widget build(BuildContext context) {
    return FilledButton(
      onPressed: (enabled && !isLoading) ? onPressed : null,
      child: isLoading
          ? const SizedBox(
              height: 20,
              width: 20,
              child: CircularProgressIndicator(strokeWidth: 2.4, color: Colors.white),
            )
          : Text(label),
    );
  }
}
