import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
import 'package:kab_core/permissions/contextual_permission.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:kab_design_system/colors.dart';
import 'package:kab_design_system/components/kab_states.dart';
import 'package:kab_maps/kab_map_provider.dart';
import 'ride_repository.dart';
import 'select_vehicle_screen.dart';

class SelectDestinationScreen extends ConsumerStatefulWidget {
  const SelectDestinationScreen({super.key});

  @override
  ConsumerState<SelectDestinationScreen> createState() => _SelectDestinationScreenState();
}

class _SelectDestinationScreenState extends ConsumerState<SelectDestinationScreen> {
  GeoPoint? _pickup;
  String _pickupAddress = 'Locating…';
  final _searchController = TextEditingController();
  List<PlaceSuggestion> _suggestions = [];
  Timer? _debounce;
  bool _resolvingPickup = true;

  @override
  void initState() {
    super.initState();
    _resolvePickup();
  }

  Future<void> _resolvePickup() async {
    final granted = await requestContextualPermission(
      context: context,
      permission: Permission.locationWhenInUse,
      reasonText: 'So we can find the closest drivers and get your pickup point right.',
    );
    if (!granted) {
      setState(() {
        _resolvingPickup = false;
        _pickupAddress = 'Location unavailable — enter pickup manually';
      });
      return;
    }

    final position = await Geolocator.getCurrentPosition();
    final point = GeoPoint(position.latitude, position.longitude);
    final mapProvider = ref.read(mapProviderInstance);
    final address = await mapProvider.reverseGeocode(point);

    if (!mounted) return;
    setState(() {
      _pickup = point;
      _pickupAddress = address;
      _resolvingPickup = false;
    });
  }

  void _onSearchChanged(String query) {
    _debounce?.cancel();
    if (query.trim().length < 3 || _pickup == null) {
      setState(() => _suggestions = []);
      return;
    }
    _debounce = Timer(const Duration(milliseconds: 350), () async {
      final results = await ref.read(mapProviderInstance).searchPlaces(query, biasCenter: _pickup!);
      if (mounted) setState(() => _suggestions = results);
    });
  }

  Future<void> _selectSuggestion(PlaceSuggestion suggestion) async {
    if (_pickup == null) return;
    // Autocomplete doesn't return coordinates directly — resolving the exact
    // point from the label keeps this screen self-contained without adding
    // a separate Place Details call for the MVP.
    final point = await ref.read(mapProviderInstance).geocode(suggestion.label, countryCode: 'IQ');
    if (!mounted) return;
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => SelectVehicleScreen(
          pickup: _pickup!,
          pickupAddress: _pickupAddress,
          destination: point,
          destinationAddress: suggestion.label,
        ),
      ),
    );
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Where to?')),
      body: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            _LocationField(
              icon: Icons.my_location,
              label: _resolvingPickup ? 'Locating…' : _pickupAddress,
              color: KabColors.accentPressed,
            ),
            const SizedBox(height: 8),
            _LocationField(
              icon: Icons.place_outlined,
              color: KabColors.danger,
              child: TextField(
                controller: _searchController,
                autofocus: true,
                onChanged: _onSearchChanged,
                decoration: const InputDecoration(
                  hintText: 'Enter destination',
                  border: InputBorder.none,
                ),
              ),
            ),
            const SizedBox(height: 12),
            Expanded(
              child: _suggestions.isEmpty
                  ? (_resolvingPickup
                      ? const KabLoadingView()
                      : const KabEmptyView(title: 'Search for where you\'re headed', icon: Icons.search))
                  : ListView.separated(
                      itemCount: _suggestions.length,
                      separatorBuilder: (_, __) => const Divider(height: 1),
                      itemBuilder: (context, i) {
                        final s = _suggestions[i];
                        return ListTile(
                          leading: const Icon(Icons.location_on_outlined),
                          title: Text(s.label),
                          onTap: () => _selectSuggestion(s),
                        );
                      },
                    ),
            ),
          ],
        ),
      ),
    );
  }
}

class _LocationField extends StatelessWidget {
  const _LocationField({required this.icon, required this.color, this.label, this.child});
  final IconData icon;
  final Color color;
  final String? label;
  final Widget? child;

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 52,
      padding: const EdgeInsets.symmetric(horizontal: 14),
      decoration: BoxDecoration(
        color: KabColors.lightSurface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: KabColors.lightBorder),
      ),
      child: Row(
        children: [
          Icon(icon, color: color, size: 20),
          const SizedBox(width: 10),
          Expanded(child: child ?? Text(label ?? '', overflow: TextOverflow.ellipsis)),
        ],
      ),
    );
  }
}
