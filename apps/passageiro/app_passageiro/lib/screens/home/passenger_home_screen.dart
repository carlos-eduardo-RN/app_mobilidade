import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';

import 'package:app_passageiro/controllers/ride_controller.dart';
import 'package:app_passageiro/core/location/location_service.dart';
import 'package:app_passageiro/core/enums/ride_status.dart';
import 'package:app_passageiro/core/state_machine/ride_state.dart';
import 'package:app_passageiro/core/utils/route_calculations.dart';
import 'package:app_passageiro/screens/ride/destination_search_screen.dart';
import 'package:app_passageiro/screens/ride/ride_request_page.dart';
import 'package:app_passageiro/widgets/map_view.dart';
import 'package:app_passageiro/widgets/ride_request_panel.dart';

class PassengerHomeScreen extends StatefulWidget {
  final LatLng fallbackPosition;
  final String userName;
  final String userEmail;
  final VoidCallback onOpenProfile;
  final VoidCallback onLogout;

  const PassengerHomeScreen({
    super.key,
    required this.fallbackPosition,
    required this.userName,
    required this.userEmail,
    required this.onOpenProfile,
    required this.onLogout,
  });

  @override
  State<PassengerHomeScreen> createState() => _PassengerHomeScreenState();
}

class _PassengerHomeScreenState extends State<PassengerHomeScreen> {
  static bool _rideControllerInitialized = false;

  LatLng? _currentLocation;
  DestinationSelection? _selectedDestination;
  GoogleMapController? _mapController;

  @override
  void initState() {
    super.initState();
    _bootstrap();
  }

  Future<void> _bootstrap() async {
    if (!_rideControllerInitialized) {
      await RideController.instance.init();
      _rideControllerInitialized = true;
    }

    final current = await LocationService.instance.getCurrentLocation();
    if (!mounted) return;
    setState(() {
      _currentLocation = current ?? widget.fallbackPosition;
    });
  }

  Future<void> _openDestinationSearch() async {
    final origin = _currentLocation ?? widget.fallbackPosition;
    final result = await Navigator.of(context).push<DestinationSelection>(
      MaterialPageRoute(
        builder: (_) => RideRequestPage(
          currentLocation: origin,
          initialQuery: _selectedDestination?.label ?? '',
        ),
      ),
    );

    if (!mounted || result == null) return;
    setState(() {
      _selectedDestination = result;
    });
  }

  Future<void> _requestRide() async {
    final origin = _currentLocation;
    final destination = _selectedDestination;
    if (origin == null || destination == null) return;

    await RideController.instance.confirmDestination(
      origin: 'Sua localizacao atual',
      destination: destination.label,
      passengerLocation: origin,
      destinationLocation: destination.location,
    );
  }

  double? _estimatedPrice() {
    final origin = _currentLocation;
    final destination = _selectedDestination;
    if (origin == null || destination == null) return null;

    final distanceKm = RouteCalculations.calculateDistance(
      origin,
      destination.location,
    );
    const baseFare = 6.0;
    const perKm = 2.3;
    return baseFare + (distanceKm * perKm);
  }

  Future<void> _centerMapOnUser() async {
    final origin = _currentLocation;
    if (_mapController == null || origin == null) return;
    await _mapController!.animateCamera(
      CameraUpdate.newCameraPosition(CameraPosition(target: origin, zoom: 16)),
    );
  }

  @override
  Widget build(BuildContext context) {
    final origin = _currentLocation ?? widget.fallbackPosition;
    final destination = _selectedDestination;
    final estimatedPrice = _estimatedPrice();

    return Scaffold(
      drawer: Drawer(
        child: Column(
          children: [
            UserAccountsDrawerHeader(
              currentAccountPicture: CircleAvatar(
                backgroundColor: Colors.white,
                child: Text(
                  widget.userName.isNotEmpty
                      ? widget.userName[0].toUpperCase()
                      : 'P',
                  style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF111111),
                  ),
                ),
              ),
              accountName: Text(widget.userName),
              accountEmail: Text(widget.userEmail),
            ),
            ListTile(
              leading: const Icon(Icons.person_outline),
              title: const Text('Meu perfil'),
              onTap: () {
                Navigator.pop(context);
                widget.onOpenProfile();
              },
            ),
            ListTile(
              leading: const Icon(Icons.logout),
              title: const Text('Sair'),
              onTap: () {
                Navigator.pop(context);
                widget.onLogout();
              },
            ),
          ],
        ),
      ),
      body: Stack(
        children: [
          MapView(
            initialCameraPosition: CameraPosition(target: origin, zoom: 15),
            onMapCreated: (controller) => _mapController = controller,
            myLocationEnabled: true,
            myLocationButtonEnabled: false,
            markers: {
              Marker(
                markerId: const MarkerId('passenger-current'),
                position: origin,
                icon: BitmapDescriptor.defaultMarkerWithHue(
                  BitmapDescriptor.hueAzure,
                ),
                infoWindow: const InfoWindow(title: 'Sua localizacao'),
              ),
              if (destination != null)
                Marker(
                  markerId: const MarkerId('destination-preview'),
                  position: destination.location,
                  icon: BitmapDescriptor.defaultMarkerWithHue(
                    BitmapDescriptor.hueRed,
                  ),
                  infoWindow: InfoWindow(title: destination.label),
                ),
            },
            polylines: {
              if (destination != null)
                Polyline(
                  polylineId: const PolylineId('request-preview'),
                  points: [origin, destination.location],
                  width: 4,
                  color: const Color(0xFF111111),
                ),
            },
          ),
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12),
              child: Row(
                children: [
                  Builder(
                    builder: (context) => Material(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(12),
                      child: IconButton(
                        icon: const Icon(Icons.menu),
                        onPressed: () => Scaffold.of(context).openDrawer(),
                      ),
                    ),
                  ),
                  const Spacer(),
                  Material(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(12),
                    child: IconButton(
                      icon: const Icon(Icons.my_location),
                      onPressed: _centerMapOnUser,
                    ),
                  ),
                ],
              ),
            ),
          ),
          DraggableScrollableSheet(
            initialChildSize: 0.27,
            minChildSize: 0.19,
            maxChildSize: 0.54,
            builder: (context, scrollController) {
              return ValueListenableBuilder<RideState>(
                valueListenable: RideController.instance.state,
                builder: (_, rideState, __) {
                  if (rideState.status != RideStatus.idle) {
                    return const SizedBox.shrink();
                  }

                  return RideRequestPanel(
                    scrollController: scrollController,
                    pickupLabel: 'Sua localizacao atual',
                    destinationLabel: destination?.label,
                    estimatedPrice: estimatedPrice,
                    isLoading: rideState.isLoading,
                    onSelectDestination: _openDestinationSearch,
                    onRequestRide: _requestRide,
                  );
                },
              );
            },
          ),
        ],
      ),
    );
  }
}
