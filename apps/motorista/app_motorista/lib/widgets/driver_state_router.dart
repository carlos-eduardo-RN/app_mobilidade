// ignore_for_file: avoid_print

import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';

import '../controllers/driver_controller.dart';
import '../models/ride_model.dart' hide DriverState;
import '../screens/home/driver_home_page.dart';
import '../screens/home/driving_to_passenger_page.dart';
import '../screens/home/driver_ride_in_progress_page.dart';
import '../screens/home/incoming_ride_page.dart';
import '../screens/home/waiting_for_ride_page.dart';
import '../screens/profile/driver_profile_page.dart';

class DriverStateRouter extends StatelessWidget {
  final Future<void> Function()? onLogout;

  const DriverStateRouter({super.key, this.onLogout});

  @override
  Widget build(BuildContext context) {
    final controller = DriverController.instance;

    return ValueListenableBuilder<DriverState>(
      valueListenable: controller.driverState,
      builder: (context, state, _) {
        final ride = controller.currentRide.value;

        switch (state) {
          case DriverState.offline:
            return DriverHomePage(
              controller: controller,
              isOnline: false,
              onGoOnline: () async {
                print('BOTAO ONLINE CLICADO');
                await controller.goOnline();
              },
              onGoOffline: () async {
                await controller.goOffline();
              },
              driverName: 'Motorista',
              onOpenProfile: () {
                Navigator.of(context).pushNamed(
                  DriverProfilePage.routeName,
                  arguments: DriverProfilePageArgs(
                    driverName: 'Motorista',
                    accountBalance: 0,
                    rides: const [],
                    onLogout: () {
                      Navigator.of(context).popUntil((route) => route.isFirst);
                      onLogout?.call();
                    },
                  ),
                );
              },
              onLogout: () async {
                if (onLogout != null) {
                  await onLogout!();
                }
              },
            );
          case DriverState.waitingRide:
          case DriverState.rideFinished:
            return WaitingForRidePage(controller: controller);
          case DriverState.requestReceived:
            return IncomingRidePage(
              controller: controller,
              pickupLabel: ride?.pickupAddress ?? 'Local do passageiro',
              distanceText: '2,4 km ate o passageiro',
              pickupPosition: _toLatLng(
                ride?.pickupLocation,
                const LatLng(-23.5520, -46.6390),
              ),
              onAccept: controller.acceptRide,
              onReject: controller.declineRide,
            );
          case DriverState.headingToPickup:
            return DrivingToPassengerPage(
              controller: controller,
              passengerPosition: _toLatLng(
                ride?.pickupLocation,
                const LatLng(-23.5520, -46.6390),
              ),
              onArrived: controller.startRide,
            );
          case DriverState.inRide:
            return DriverRideInProgressPage(
              controller: controller,
              destinationPosition: _toLatLng(
                ride?.dropoffLocation,
                const LatLng(-23.5632, -46.6544),
              ),
              onFinishRide: controller.finishRide,
            );
        }
      },
    );
  }

  static LatLng _toLatLng(LatLngModel? source, LatLng fallback) {
    if (source == null) {
      return fallback;
    }

    return LatLng(source.latitude, source.longitude);
  }
}
