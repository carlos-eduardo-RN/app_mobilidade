import 'package:app_motorista/screens/profile/driver_profile_page.dart';
import 'package:flutter/material.dart';

class ProfilePage extends StatelessWidget {
  final String driverName;
  final double accountBalance;
  final List<DriverRideHistoryItem> rides;
  final VoidCallback onLogout;

  const ProfilePage({
    super.key,
    required this.driverName,
    required this.accountBalance,
    required this.rides,
    required this.onLogout,
  });

  @override
  Widget build(BuildContext context) {
    return DriverProfilePage(
      driverName: driverName,
      accountBalance: accountBalance,
      rides: rides,
      onLogout: onLogout,
    );
  }
}
