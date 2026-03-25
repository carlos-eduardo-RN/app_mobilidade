import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:app_passageiro/screens/tracking/ride_tracking_screen.dart';

class RideTrackingPage extends StatelessWidget {
  final LatLng driverPosition;
  final LatLng passengerPosition;
  final LatLng destinationPosition;
  final String statusText;
  final String etaText;
  final List<LatLng> polyline;
  final List<LatLng> approachPolyline;
  final bool isDriverArriving;
  final String? driverName;
  final double? driverRating;
  final String? driverVehicle;
  final String? driverPlate;
  final VoidCallback onCancel;

  const RideTrackingPage({
    super.key,
    required this.driverPosition,
    required this.passengerPosition,
    required this.destinationPosition,
    required this.statusText,
    required this.etaText,
    required this.polyline,
    required this.approachPolyline,
    required this.isDriverArriving,
    required this.driverName,
    required this.driverRating,
    required this.driverVehicle,
    required this.driverPlate,
    required this.onCancel,
  });

  @override
  Widget build(BuildContext context) {
    return RideTrackingScreen(
      driverPosition: driverPosition,
      passengerPosition: passengerPosition,
      destinationPosition: destinationPosition,
      statusText: statusText,
      etaText: etaText,
      polyline: polyline,
      approachPolyline: approachPolyline,
      isDriverArriving: isDriverArriving,
      driverName: driverName,
      driverRating: driverRating,
      driverVehicle: driverVehicle,
      driverPlate: driverPlate,
      onCancel: onCancel,
    );
  }
}
