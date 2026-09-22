import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:kab_design_system/colors.dart';
import 'package:kab_design_system/breakpoints.dart';
import '../ride/select_destination_screen.dart';
import '../ride/active_ride_provider.dart';
import '../ride/live_tracking_screen.dart';

/// Deliberately not a lot on this screen (section 12: "لا أريد أكثر من
/// اللازم في الشاشة الأولى"). Six services, one search bar, one smart slot
/// for whatever is actually relevant right now (an active ride, or nothing).
class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final spacing = KabSpacing.of(context);
    final activeRide = ref.watch(activeRideProvider).valueOrNull;

    return Scaffold(
      backgroundColor: KabColors.lightBackground,
      body: SafeArea(
        child: SingleChildScrollView(
          child: Padding(
            padding: EdgeInsets.symmetric(horizontal: spacing.screenPadding, vertical: 12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const _HomeHeader(),
                SizedBox(height: spacing.sectionGap),
                const _SearchBar(),
                SizedBox(height: spacing.sectionGap),
                if (activeRide != null) ...[
                  _ActiveRideBanner(ride: activeRide),
                  SizedBox(height: spacing.sectionGap),
                ],
                Text('Services', style: Theme.of(context).textTheme.titleMedium),
                SizedBox(height: spacing.cardGap),
                _ServicesGrid(spacing: spacing),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _HomeHeader extends StatelessWidget {
  const _HomeHeader();

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        const Icon(Icons.location_on, color: KabColors.accentPressed, size: 20),
        const SizedBox(width: 6),
        Expanded(
          child: Text(
            'Current location', // bound to the last resolved address in STEP 8 (reverse geocoding)
            style: Theme.of(context).textTheme.bodyMedium,
            overflow: TextOverflow.ellipsis,
          ),
        ),
        IconButton(
          icon: const Icon(Icons.notifications_outlined),
          onPressed: () {},
        ),
        const CircleAvatar(radius: 16, backgroundColor: KabColors.lightSurface, child: Icon(Icons.person, size: 18, color: KabColors.ink)),
      ],
    );
  }
}

class _SearchBar extends StatelessWidget {
  const _SearchBar();

  @override
  Widget build(BuildContext context) {
    // Universal Search (section 14) — tapping opens one shared search screen
    // that queries products/ads/stores/services/offers together.
    return Container(
      height: 48,
      padding: const EdgeInsets.symmetric(horizontal: 14),
      decoration: BoxDecoration(
        color: KabColors.lightSurface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: KabColors.lightBorder),
      ),
      child: Row(
        children: [
          const Icon(Icons.search, size: 20, color: KabColors.lightTextSecondary),
          const SizedBox(width: 10),
          Text('Search KAP', style: TextStyle(color: KabColors.lightTextSecondary)),
        ],
      ),
    );
  }
}

class _ActiveRideBanner extends StatelessWidget {
  const _ActiveRideBanner({required this.ride});
  final Map<String, dynamic> ride;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => Navigator.of(context).push(
        MaterialPageRoute(builder: (_) => LiveTrackingScreen(rideId: ride['id'])),
      ),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(color: KabColors.ink, borderRadius: BorderRadius.circular(18)),
        child: Row(
          children: [
            const Icon(Icons.local_taxi, color: KabColors.accent),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Ride in progress', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w700)),
                  Text(ride['status'] ?? '', style: const TextStyle(color: KabColors.neutralGray, fontSize: 12)),
                ],
              ),
            ),
            const Icon(Icons.chevron_right, color: Colors.white70),
          ],
        ),
      ),
    );
  }
}

class _ServiceItem {
  const _ServiceItem(this.label, this.icon);
  final String label;
  final IconData icon;
}

const _services = [
  _ServiceItem('Ride', Icons.local_taxi_outlined),
  _ServiceItem('Delivery', Icons.local_shipping_outlined),
  _ServiceItem('Market', Icons.storefront_outlined),
  _ServiceItem('Gifts', Icons.card_giftcard_outlined),
  _ServiceItem('Offers', Icons.local_offer_outlined),
  _ServiceItem('Coupons', Icons.confirmation_number_outlined),
];

class _ServicesGrid extends StatelessWidget {
  const _ServicesGrid({required this.spacing});
  final KabSpacing spacing;

  @override
  Widget build(BuildContext context) {
    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: _services.length,
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 3,
        mainAxisSpacing: 12,
        crossAxisSpacing: 12,
        childAspectRatio: 0.9,
      ),
      itemBuilder: (context, i) {
        final service = _services[i];
        return _ServiceTile(
          item: service,
          onTap: service.label == 'Ride'
              ? () => Navigator.of(context).push(
                    MaterialPageRoute(builder: (_) => const SelectDestinationScreen()),
                  )
              : null, // other services wire up in their own STEPs (10/12/13)
        );
      },
    );
  }
}

class _ServiceTile extends StatelessWidget {
  const _ServiceTile({required this.item, this.onTap});
  final _ServiceItem item;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        decoration: BoxDecoration(
          color: KabColors.lightSurface,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: KabColors.lightBorder),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(item.icon, size: 26, color: KabColors.ink),
            const SizedBox(height: 8),
            Text(item.label, style: Theme.of(context).textTheme.bodySmall),
          ],
        ),
      ),
    );
  }
}
