import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:app_passageiro/screens/home/passenger_home_screen.dart';

class HomePage extends StatelessWidget {
  final LatLng fallbackPosition;
  final String userName;
  final String userEmail;
  final VoidCallback onOpenProfile;
  final VoidCallback onLogout;

  const HomePage({
    super.key,
    required this.fallbackPosition,
    required this.userName,
    required this.userEmail,
    required this.onOpenProfile,
    required this.onLogout,
  });

  @override
  Widget build(BuildContext context) {
    return PassengerHomeScreen(
      fallbackPosition: fallbackPosition,
      userName: userName,
      userEmail: userEmail,
      onOpenProfile: onOpenProfile,
      onLogout: onLogout,
    );
  }
}
