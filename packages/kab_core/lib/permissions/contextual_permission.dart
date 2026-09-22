import 'package:flutter/material.dart';
import 'package:permission_handler/permission_handler.dart';

/// KAP never front-loads permission requests at first launch (section 121).
/// Call this right before the moment the permission actually matters
/// (e.g. right before "find nearby drivers", not on the splash screen).
///
/// Shows a one-line reason first, in plain language, THEN triggers the
/// system dialog — because a bare OS prompt with no context gets denied
/// far more often than one with a reason attached.
///
/// [reasonText] and [continueLabel] are passed in already localized by the
/// caller (via AppLocalizations) — this package intentionally has no
/// dependency on kab_localization to avoid a circular package dependency.
Future<bool> requestContextualPermission({
  required BuildContext context,
  required Permission permission,
  required String reasonText,
  String continueLabel = 'Continue',
}) async {
  final status = await permission.status;
  if (status.isGranted) return true;

  if (!context.mounted) return false;
  final shouldProceed = await showModalBottomSheet<bool>(
        context: context,
        builder: (ctx) => Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(reasonText, textAlign: TextAlign.center),
              const SizedBox(height: 16),
              FilledButton(
                onPressed: () => Navigator.pop(ctx, true),
                child: Text(continueLabel),
              ),
            ],
          ),
        ),
      ) ??
      false;

  if (!shouldProceed) return false;

  final result = await permission.request();
  return result.isGranted;
}

