import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import '../../controllers/driver_controller.dart';
import '../../widgets/driver_live_map.dart';

class DriverRideInProgressPage extends StatelessWidget {
  const DriverRideInProgressPage({
    super.key,
    required this.controller,
    required this.destinationPosition,
    required this.onFinishRide,
  });

  final DriverController controller;
  final LatLng destinationPosition;
  final VoidCallback onFinishRide;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Stack(
        children: [
          DriverLiveMap(
            driverLocation: controller.driverLocation,
            driverHeading: controller.driverHeading,
            isMapFollowing: controller.isMapFollowing,
            targetPosition: destinationPosition,
            routeType: MapRouteType.toDropoff,
          ),
          Positioned(
            left: 16,
            right: 16,
            bottom: 24,
            child: Card(
              elevation: 8,
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Text(
                      'Corrida em andamento',
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.w600,
                          ),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 12),
                    SizedBox(
                      height: 48,
                      child: FilledButton(
                        onPressed: onFinishRide,
                        child: const Text('Finalizar corrida'),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
