import 'package:flutter/foundation.dart';

/// RideMock é um wrapper antigo mantido apenas para compatibilidade.
/// 
/// ⚠️ DEPRECATED: Use DriverController.instance.currentRide diretamente.
/// Este arquivo será removido na Etapa 7 (limpeza final).

@Deprecated('Use DriverController.instance.currentRide instead')
class RideMock {
  static final RideMock instance = RideMock._internal();
  RideMock._internal();

  final ValueNotifier<SharedRide?> currentRide = ValueNotifier<SharedRide?>(
    null,
  );

  void mockIncomingRide() {
    currentRide.value = SharedRide(
      origin: 'Av. Central',
      destination: 'Rua das Flores',
      price: 12.50,
      status: SharedRideStatus.requested,
    );
  }

  void acceptRide() {
    final ride = currentRide.value;
    if (ride == null) return;

    currentRide.value = SharedRide(
      origin: ride.origin,
      destination: ride.destination,
      price: ride.price,
      status: SharedRideStatus.accepted,
    );
  }

  void clear() {
    currentRide.value = null;
  }
}

enum SharedRideStatus { requested, accepted }

class SharedRide {
  final String origin;
  final String destination;
  final double price;
  final SharedRideStatus status;

  SharedRide({
    required this.origin,
    required this.destination,
    required this.price,
    required this.status,
  });
}
