import 'package:app_motorista/models/ride_model.dart';
import 'package:app_motorista/widgets/driver_live_map.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';

class MapView extends StatelessWidget {
  final ValueListenable<LatLngModel> driverLocation;
  final ValueListenable<double> driverHeading;
  final ValueListenable<bool>? isMapFollowing;
  final LatLng? targetPosition;
  final MapRouteType routeType;
  final double zoom;

  const MapView({
    super.key,
    required this.driverLocation,
    required this.driverHeading,
    this.isMapFollowing,
    this.targetPosition,
    this.routeType = MapRouteType.none,
    this.zoom = 15,
  });

  @override
  Widget build(BuildContext context) {
    return DriverLiveMap(
      driverLocation: driverLocation,
      driverHeading: driverHeading,
      isMapFollowing: isMapFollowing,
      targetPosition: targetPosition,
      routeType: routeType,
      zoom: zoom,
    );
  }
}
