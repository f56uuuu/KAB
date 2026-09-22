import 'package:flutter/material.dart';
import 'package:connectivity_plus/connectivity_plus.dart';

/// Wrap the app's root (or any screen doing network-heavy work) in this.
/// A silent network failure reads to the user as "the app is broken";
/// a one-line banner reads as "the network is the problem" — a small
/// difference in wording that changes who the user blames and what they do
/// next (retry vs. uninstall).
class ConnectivityBanner extends StatefulWidget {
  const ConnectivityBanner({required this.child, super.key});
  final Widget child;

  @override
  State<ConnectivityBanner> createState() => _ConnectivityBannerState();
}

class _ConnectivityBannerState extends State<ConnectivityBanner> {
  bool _offline = false;

  @override
  void initState() {
    super.initState();
    Connectivity().onConnectivityChanged.listen((results) {
      final offline = results.every((r) => r == ConnectivityResult.none);
      if (mounted) setState(() => _offline = offline);
    });
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        if (_offline)
          Container(
            width: double.infinity,
            color: Colors.black87,
            padding: const EdgeInsets.symmetric(vertical: 6),
            child: const Text(
              'No internet connection',
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.white, fontSize: 12),
            ),
          ),
        Expanded(child: widget.child),
      ],
    );
  }
}
