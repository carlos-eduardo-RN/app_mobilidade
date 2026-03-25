import 'package:app_motorista/controllers/driver_controller.dart';
import 'package:app_motorista/core/constants/ui_constants.dart';
import 'package:app_motorista/models/ride_model.dart';
import 'package:app_motorista/widgets/map_view.dart';
import 'package:app_motorista/widgets/ride_request_card.dart';
import 'package:app_motorista/widgets/driver_live_map.dart';
import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';

class RideRequestScreen extends StatelessWidget {
  final DriverController controller;
  final RideModel ride;
  final VoidCallback onAccept;
  final VoidCallback onReject;
  final String distanceText;

  const RideRequestScreen({
    super.key,
    required this.controller,
    required this.ride,
    required this.onAccept,
    required this.onReject,
    required this.distanceText,
  });

  @override
  Widget build(BuildContext context) {
    final pickupPosition = LatLng(
      ride.pickupLocation.latitude,
      ride.pickupLocation.longitude,
    );

    return Scaffold(
      body: Stack(
        children: [
          MapView(
            driverLocation: controller.driverLocation,
            driverHeading: controller.driverHeading,
            isMapFollowing: controller.isMapFollowing,
            targetPosition: pickupPosition,
            routeType: MapRouteType.toPickup,
            zoom: 14,
          ),
          Positioned(
            left: 14,
            right: 14,
            bottom: 20,
            child: RideRequestCard(
              pickup: ride.pickupAddress,
              destination: ride.dropoffAddress,
              distanceText: distanceText,
              onAccept: onAccept,
              onReject: onReject,
            ),
          ),
          const Positioned(
            top: 52,
            left: 14,
            child: _StatusChip(label: 'NOVA CORRIDA'),
          ),
        ],
      ),
    );
  }
}

class _StatusChip extends StatelessWidget {
  final String label;

  const _StatusChip({required this.label});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
      decoration: BoxDecoration(
        color: UiConstants.surface,
        borderRadius: BorderRadius.circular(999),
        boxShadow: const [UiConstants.cardShadow],
      ),
      child: Text(
        label,
        style: const TextStyle(
          color: UiConstants.primaryText,
          fontWeight: FontWeight.w800,
          fontSize: 12,
        ),
      ),
    );
  }
}
