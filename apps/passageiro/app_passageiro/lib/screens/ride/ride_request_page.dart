import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:app_passageiro/screens/ride/destination_search_screen.dart';

class RideRequestPage extends StatelessWidget {
  final LatLng currentLocation;
  final String initialQuery;

  const RideRequestPage({
    super.key,
    required this.currentLocation,
    this.initialQuery = '',
  });

  @override
  Widget build(BuildContext context) {
    return DestinationSearchScreen(
      currentLocation: currentLocation,
      initialQuery: initialQuery,
    );
  }
}
