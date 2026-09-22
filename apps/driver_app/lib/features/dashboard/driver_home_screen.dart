import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:kab_design_system/colors.dart';
import 'package:kab_design_system/components/kab_card.dart';
import 'package:kab_core/auth/auth_provider.dart';
import '../../core/driver_status_provider.dart';
import '../../core/incoming_ride_provider.dart';
import '../ride_request/incoming_ride_sheet.dart';
import '../earnings/earnings_screen.dart';
import '../documents/documents_screen.dart';

class DriverHomeScreen extends ConsumerStatefulWidget {
  const DriverHomeScreen({super.key});

  @override
  ConsumerState<DriverHomeScreen> createState() => _DriverHomeScreenState();
}

class _DriverHomeScreenState extends ConsumerState<DriverHomeScreen> {
  bool _sheetOpen = false;

  @override
  Widget build(BuildContext context) {
    final status = ref.watch(driverStatusProvider);

    // The moment a ride is assigned, take over the whole screen — no banner
    // to miss, no notification to swipe away by accident.
    ref.listen(incomingRideProvider, (previous, next) {
      final ride = next.valueOrNull;
      if (ride != null && !_sheetOpen) {
        _sheetOpen = true;
        Navigator.of(context).push(
          MaterialPageRoute(
            fullscreenDialog: true,
            builder: (_) => IncomingRideSheet(ride: ride),
          ),
        ).then((_) => _sheetOpen = false);
      }
    });

    return Scaffold(
      backgroundColor: KabColors.ink,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              _TopBar(isOnline: status.isOnline),
              const SizedBox(height: 24),
              _OnlineToggle(isOnline: status.isOnline),
              const SizedBox(height: 24),
              Expanded(
                child: SingleChildScrollView(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: const [
                      _TodayEarningsCard(),
                      SizedBox(height: 12),
                      _QuickLinksRow(),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _TopBar extends StatelessWidget {
  const _TopBar({required this.isOnline});
  final bool isOnline;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(
          width: 10,
          height: 10,
          decoration: BoxDecoration(
            color: isOnline ? KabColors.accent : KabColors.darkTextSecondary,
            shape: BoxShape.circle,
          ),
        ),
        const SizedBox(width: 8),
        Text(
          isOnline ? 'Online' : 'Offline',
          style: const TextStyle(color: Colors.white, fontSize: 15, fontWeight: FontWeight.w600),
        ),
      ],
    );
  }
}

/// The one interaction this whole screen exists for. Full-width, unmissable,
/// binary — no settings menu buried three taps deep to start earning.
class _OnlineToggle extends ConsumerWidget {
  const _OnlineToggle({required this.isOnline});
  final bool isOnline;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return GestureDetector(
      onTap: () {
        final notifier = ref.read(driverStatusProvider.notifier);
        isOnline ? notifier.goOffline() : notifier.goOnline();
      },
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        height: 88,
        decoration: BoxDecoration(
          color: isOnline ? KabColors.accent : KabColors.darkSurface,
          borderRadius: BorderRadius.circular(24),
          border: isOnline ? null : Border.all(color: KabColors.darkBorder),
        ),
        alignment: Alignment.center,
        child: Text(
          isOnline ? 'You\'re online — tap to stop' : 'Go online',
          style: TextStyle(
            color: isOnline ? KabColors.onAccent : Colors.white,
            fontSize: 18,
            fontWeight: FontWeight.w700,
          ),
        ),
      ),
    );
  }
}

class _TodayEarningsCard extends ConsumerWidget {
  const _TodayEarningsCard();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Container(
      decoration: BoxDecoration(color: KabColors.darkSurface, borderRadius: BorderRadius.circular(20)),
      padding: const EdgeInsets.all(20),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          const Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Today', style: TextStyle(color: KabColors.darkTextSecondary, fontSize: 13)),
              SizedBox(height: 4),
              Text('—', style: TextStyle(color: Colors.white, fontSize: 26, fontWeight: FontWeight.w700)),
            ],
          ),
          TextButton(
            onPressed: () => Navigator.of(context).push(
              MaterialPageRoute(builder: (_) => const EarningsScreen()),
            ),
            child: const Text('View details', style: TextStyle(color: KabColors.accent)),
          ),
        ],
      ),
    );
  }
}

class _QuickLinksRow extends StatelessWidget {
  const _QuickLinksRow();

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: _QuickLinkTile(
            label: 'Documents',
            icon: Icons.badge_outlined,
            onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const DocumentsScreen())),
          ),
        ),
        const SizedBox(width: 12),
        const Expanded(child: _QuickLinkTile(label: 'Support', icon: Icons.support_agent_outlined)),
      ],
    );
  }
}

class _QuickLinkTile extends StatelessWidget {
  const _QuickLinkTile({required this.label, required this.icon, this.onTap});
  final String label;
  final IconData icon;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        decoration: BoxDecoration(color: KabColors.darkSurface, borderRadius: BorderRadius.circular(16)),
        padding: const EdgeInsets.symmetric(vertical: 18),
        child: Column(
          children: [
            Icon(icon, color: Colors.white70),
            const SizedBox(height: 6),
            Text(label, style: const TextStyle(color: Colors.white, fontSize: 13)),
          ],
        ),
      ),
    );
  }
}
