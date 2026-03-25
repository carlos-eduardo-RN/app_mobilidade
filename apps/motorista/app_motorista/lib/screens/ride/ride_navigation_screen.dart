import 'package:app_motorista/controllers/driver_controller.dart';
import 'package:app_motorista/core/constants/ui_constants.dart';
import 'package:app_motorista/models/ride_model.dart';
import 'package:app_motorista/widgets/driver_live_map.dart';
import 'package:app_motorista/widgets/map_view.dart';
import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';

class RideNavigationScreen extends StatelessWidget {
  final DriverController controller;
  final RideModel ride;
  final bool inProgress;
  final VoidCallback onPrimaryAction;

  const RideNavigationScreen({
    super.key,
    required this.controller,
    required this.ride,
    required this.inProgress,
    required this.onPrimaryAction,
  });

  @override
  Widget build(BuildContext context) {
    final target = inProgress
        ? LatLng(ride.dropoffLocation.latitude, ride.dropoffLocation.longitude)
        : LatLng(ride.pickupLocation.latitude, ride.pickupLocation.longitude);

    final title = inProgress ? 'Corrida em andamento' : 'Indo buscar passageiro';
    final subtitle = inProgress ? ride.dropoffAddress : ride.pickupAddress;
    final actionLabel = inProgress ? 'Finalizar corrida' : 'Iniciar corrida';

    return Scaffold(
      body: Stack(
        children: [
          MapView(
            driverLocation: controller.driverLocation,
            driverHeading: controller.driverHeading,
            isMapFollowing: controller.isMapFollowing,
            targetPosition: target,
            routeType: inProgress ? MapRouteType.toDropoff : MapRouteType.toPickup,
          ),
          Positioned(
            top: 52,
            left: 14,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(
                color: UiConstants.surface,
                borderRadius: BorderRadius.circular(999),
                boxShadow: const [UiConstants.cardShadow],
              ),
              child: Text(
                inProgress ? 'EM CORRIDA' : 'A CAMINHO',
                style: const TextStyle(
                  fontWeight: FontWeight.w800,
                  color: UiConstants.primaryText,
                ),
              ),
            ),
          ),
          Positioned(
            left: 14,
            right: 14,
            bottom: 20,
            child: Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: UiConstants.surface,
                borderRadius: BorderRadius.circular(UiConstants.cardRadius),
                boxShadow: const [UiConstants.cardShadow],
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: const TextStyle(
                      fontWeight: FontWeight.w800,
                      fontSize: 18,
                      color: UiConstants.primaryText,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    subtitle,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(color: UiConstants.secondaryText),
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      const Icon(
                        Icons.person_outline,
                        size: 18,
                        color: UiConstants.secondaryText,
                      ),
                      const SizedBox(width: 6),
                      const Expanded(
                        child: Text(
                          'Passageiro confirmado',
                          style: TextStyle(
                            color: UiConstants.secondaryText,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                      IconButton(
                        onPressed: controller.toggleMapFollowing,
                        icon: ValueListenableBuilder<bool>(
                          valueListenable: controller.isMapFollowing,
                          builder: (_, following, __) {
                            return Icon(
                              following ? Icons.gps_fixed : Icons.gps_not_fixed,
                              color: UiConstants.accent,
                            );
                          },
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  SizedBox(
                    width: double.infinity,
                    height: 50,
                    child: ElevatedButton(
                      onPressed: onPrimaryAction,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: UiConstants.accent,
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                      child: Text(
                        actionLabel.toUpperCase(),
                        style: const TextStyle(fontWeight: FontWeight.w800),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
