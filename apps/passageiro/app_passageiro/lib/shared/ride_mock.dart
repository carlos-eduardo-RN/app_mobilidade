import 'package:flutter/foundation.dart';

enum SharedRideStatus {
  requested,
  accepted,
  inProgress,
  finished,
  cancelled,
}

class SharedRide {
  final String origin;
  final String destination;
  final double price;
  final SharedRideStatus status;

  const SharedRide({
    required this.origin,
    required this.destination,
    required this.price,
    required this.status,
  });

  SharedRide copyWith({
    String? origin,
    String? destination,
    double? price,
    SharedRideStatus? status,
  }) {
    return SharedRide(
      origin: origin ?? this.origin,
      destination: destination ?? this.destination,
      price: price ?? this.price,
      status: status ?? this.status,
    );
  }
}

class RideMock {
  static final RideMock instance = RideMock._internal();
  RideMock._internal();

  final ValueNotifier<SharedRide?> currentRide =
      ValueNotifier<SharedRide?>(null);

  /// Passageiro solicita corrida
  void requestRide(SharedRide ride) {
    currentRide.value = ride.copyWith(
      status: SharedRideStatus.requested,
    );
  }

  /// Motorista aceita a corrida
  void acceptRide() {
    _updateStatus(SharedRideStatus.accepted);
  }

  /// Corrida iniciada
  void startRide() {
    _updateStatus(SharedRideStatus.inProgress);
  }

  /// Corrida finalizada
  void finishRide() {
    _updateStatus(SharedRideStatus.finished);
  }

  /// Corrida cancelada
  void cancelRide() {
    _updateStatus(SharedRideStatus.cancelled);
  }

  /// Limpa estado (volta para Home)
  void clear() {
    currentRide.value = null;
  }

  /// Atualiza status de forma segura e imutável
  void _updateStatus(SharedRideStatus status) {
    final ride = currentRide.value;
    if (ride == null) return;

    currentRide.value = ride.copyWith(status: status);
  }
}