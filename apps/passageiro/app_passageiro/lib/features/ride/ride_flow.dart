import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';

import 'package:app_passageiro/controllers/ride_controller.dart';
import 'package:app_passageiro/core/enums/connection_status.dart';
import 'package:app_passageiro/core/enums/ride_status.dart';
import 'package:app_passageiro/core/error_handler/error_handler.dart';
import 'package:app_passageiro/core/state_machine/ride_state.dart';
import 'package:app_passageiro/screens/ride/driver_assigned_screen.dart';
import 'package:app_passageiro/screens/ride/searching_driver_screen.dart';
import 'package:app_passageiro/screens/tracking/ride_tracking_page.dart';

import 'package:app_passageiro/features/rating/ride_finished_page.dart';
import 'ride_cancelled_page.dart';

class RideFlow extends StatelessWidget {
  const RideFlow({super.key});

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<RideState>(
      valueListenable: RideController.instance.state,
      builder: (_, rideState, __) {
        if (rideState.status == RideStatus.idle) {
          return const SizedBox.shrink();
        }

        // 🔒 Se há erro crítico (ex: sem internet), bloqueia fluxo
        return ValueListenableBuilder<AppError?>(
          valueListenable: ErrorHandler.instance.currentError,
          builder: (context, error, _) {
            // Se erro for crítico (sem rede), mostra modal bloqueador
            if (error?.type == AppErrorType.noNetwork) {
              return _buildErrorOverlay(error!);
            }

            // Caso contrário, mostra fluxo normal
            final content = _buildRideFlow(rideState);
            return Stack(
              children: [
                content,
                _buildConnectionBanner(rideState.connectionStatus),
                if (rideState.isLoading) _buildLoadingOverlay(),
              ],
            );
          },
        );
      },
    );
  }

  /// Constrói o fluxo normal da corrida
  Widget _buildRideFlow(RideState rideState) {
    final ride = rideState.ride;
    if (ride == null && rideState.status != RideStatus.selectingDestination) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }
    switch (rideState.status) {
      case RideStatus.selectingDestination:
        return const SizedBox.shrink();

      case RideStatus.searchingDriver:
        return SearchingDriverScreen(
          onCancel: () {
            RideController.instance.cancelRide();
          },
        );

      case RideStatus.driverAssigned:
        return DriverAssignedScreen(
          driverName: ride?.driverName ?? 'Motorista',
          rating: ride?.driverRating,
          etaMinutes:
              ride?.remainingTimeMinutes ??
              ride?.approachRoute?.estimatedTimeMinutes ??
              0,
          vehicle: ride?.driverVehicle,
          plate: ride?.driverPlate,
          onTrackRide: () {
            RideController.instance.acknowledgeDriverAssigned();
          },
        );

      case RideStatus.driverArriving:
      case RideStatus.rideStarted:
      case RideStatus.rideInProgress:
        final driverPos =
            ride?.driverLocation?.position ??
            ride?.passengerLocation ??
            const LatLng(0, 0);
        final passengerPos = ride?.passengerLocation ?? const LatLng(0, 0);
        final destinationPos = (ride?.rideRoute?.polyline.isNotEmpty ?? false)
            ? ride!.rideRoute!.polyline.last
            : passengerPos;

        final statusText = rideState.status == RideStatus.driverArriving
            ? 'Motorista a caminho'
            : rideState.status == RideStatus.rideStarted
            ? 'Corrida iniciada'
            : 'Corrida em andamento';
        final etaText = ride?.remainingTimeMinutes != null
            ? 'Chegada em ${ride?.remainingTimeMinutes} min'
            : 'Tempo estimado indisponivel';

        return RideTrackingPage(
          driverPosition: driverPos,
          passengerPosition: passengerPos,
          destinationPosition: destinationPos,
          statusText: statusText,
          etaText: etaText,
          polyline: ride?.rideRoute?.polyline ?? const [],
          approachPolyline: ride?.approachRoute?.polyline ?? const [],
          isDriverArriving: rideState.status == RideStatus.driverArriving,
          driverName: ride?.driverName,
          driverRating: ride?.driverRating,
          driverVehicle: ride?.driverVehicle,
          driverPlate: ride?.driverPlate,
          onCancel: () {
            RideController.instance.cancelRide();
          },
        );

      case RideStatus.rideCompleted:
        return const RideFinishedPage();

      case RideStatus.rideCancelled:
        return RideCancelledPage(
          onDismiss: () => RideController.instance.clearRide(),
        );

      case RideStatus.idle:
        return const SizedBox.shrink();
    }
  }

  Widget _buildConnectionBanner(ConnectionStatus status) {
    if (status == ConnectionStatus.connected) {
      return const SizedBox.shrink();
    }

    final text = status == ConnectionStatus.reconnecting
        ? 'Reconectando em tempo real...'
        : 'Sem conexao em tempo real';

    return Positioned(
      top: 48,
      left: 16,
      right: 16,
      child: Material(
        color: Colors.orange.shade700,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 16),
          child: Row(
            children: [
              const Icon(Icons.wifi_off, color: Colors.white, size: 18),
              const SizedBox(width: 8),
              Expanded(
                child: Text(text, style: const TextStyle(color: Colors.white)),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildLoadingOverlay() {
    return Positioned.fill(
      child: Container(
        color: Colors.black.withOpacity(0.3),
        child: const Center(child: CircularProgressIndicator()),
      ),
    );
  }

  /// Exibe overlay de erro bloqueador
  Widget _buildErrorOverlay(AppError error) {
    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.wifi_off, size: 48, color: Colors.orange.shade700),
            const SizedBox(height: 16),
            Text(
              error.title,
              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            Text(
              error.message,
              textAlign: TextAlign.center,
              style: const TextStyle(color: Colors.grey),
            ),
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () {
                  // Usuário reconhece o erro
                  ErrorHandler.instance.clearError();
                },
                child: const Text('Entendi'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
