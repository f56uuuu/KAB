import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:kab_design_system/colors.dart';
import 'package:kab_design_system/components/kab_states.dart';
import 'package:kab_maps/kab_map_provider.dart';
import 'ride_repository.dart';
import 'searching_driver_screen.dart';

class SelectVehicleScreen extends ConsumerStatefulWidget {
  const SelectVehicleScreen({
    required this.pickup,
    required this.pickupAddress,
    required this.destination,
    required this.destinationAddress,
    super.key,
  });

  final GeoPoint pickup;
  final String pickupAddress;
  final GeoPoint destination;
  final String destinationAddress;

  @override
  ConsumerState<SelectVehicleScreen> createState() => _SelectVehicleScreenState();
}

class _SelectVehicleScreenState extends ConsumerState<SelectVehicleScreen> {
  String _selectedType = vehicleOptions.first.type;
  final Map<String, FareEstimate> _estimates = {};
  String? _countryId;
  String? _cityId;
  bool _loading = true;
  bool _requesting = false;

  @override
  void initState() {
    super.initState();
    _loadEstimates();
  }

  Future<void> _loadEstimates() async {
    final repo = ref.read(rideRepositoryProvider);
    final resolved = await repo.resolveLocationContext(widget.pickup);
    _countryId = resolved.countryId;
    _cityId = resolved.cityId;

    for (final option in vehicleOptions) {
      final estimate = await repo.estimateFare(
        pickup: widget.pickup,
        destination: widget.destination,
        vehicleType: option.type,
        countryId: _countryId!,
        cityId: _cityId!,
      );
      _estimates[option.type] = estimate;
    }
    if (mounted) setState(() => _loading = false);
  }

  Future<void> _confirm() async {
    final estimate = _estimates[_selectedType];
    if (estimate == null || _countryId == null || _cityId == null) return;
    setState(() => _requesting = true);

    final repo = ref.read(rideRepositoryProvider);
    final rideId = await repo.createRide(
      pickup: widget.pickup,
      pickupAddress: widget.pickupAddress,
      destination: widget.destination,
      destinationAddress: widget.destinationAddress,
      vehicleType: _selectedType,
      estimate: estimate,
      countryId: _countryId!,
      cityId: _cityId!,
    );

    if (!mounted) return;
    Navigator.of(context).pushReplacement(
      MaterialPageRoute(builder: (_) => SearchingDriverScreen(rideId: rideId)),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Choose a ride')),
      body: _loading
          ? const KabLoadingView()
          : Column(
              children: [
                Expanded(
                  child: ListView(
                    padding: const EdgeInsets.all(20),
                    children: vehicleOptions.map((option) {
                      final estimate = _estimates[option.type];
                      final selected = option.type == _selectedType;
                      return GestureDetector(
                        onTap: () => setState(() => _selectedType = option.type),
                        child: Container(
                          margin: const EdgeInsets.only(bottom: 12),
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: selected ? KabColors.accent.withOpacity(0.1) : KabColors.lightSurface,
                            border: Border.all(color: selected ? KabColors.accentPressed : KabColors.lightBorder, width: selected ? 2 : 1),
                            borderRadius: BorderRadius.circular(16),
                          ),
                          child: Row(
                            children: [
                              Text(option.icon, style: const TextStyle(fontSize: 28)),
                              const SizedBox(width: 14),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(option.label, style: Theme.of(context).textTheme.titleMedium),
                                    if (estimate != null)
                                      Text(
                                        '${estimate.distanceKm.toStringAsFixed(1)} km · ${estimate.durationMin} min',
                                        style: TextStyle(color: KabColors.lightTextSecondary, fontSize: 12),
                                      ),
                                  ],
                                ),
                              ),
                              if (estimate != null)
                                Text(
                                  '${estimate.amount} ${estimate.currencyCode}',
                                  style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16),
                                ),
                            ],
                          ),
                        ),
                      );
                    }).toList(),
                  ),
                ),
                // Price Transparency (section 137): the exact number the
                // customer is about to pay is the last thing they see before
                // confirming — no surprises after the fact.
                Padding(
                  padding: const EdgeInsets.all(20),
                  child: FilledButton(
                    onPressed: _requesting ? null : _confirm,
                    child: _requesting
                        ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2.4, color: Colors.white))
                        : Text('Confirm · ${_estimates[_selectedType]?.amount ?? '--'} ${_estimates[_selectedType]?.currencyCode ?? ''}'),
                  ),
                ),
              ],
            ),
    );
  }
}
