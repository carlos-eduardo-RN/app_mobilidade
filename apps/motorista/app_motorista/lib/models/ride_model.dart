// ===== ENUMS =====

/// Estados do motorista durante o fluxo de corrida
enum DriverState {
  offline,           // App aberto, motorista offline
  online,            // Aguardando solicitações
  requestReceived,   // Solicitação recebida, aguardando resposta
  headingToPickup,   // Motorista indo buscar passageiro
  inRide,            // Corrida em andamento
  rideFinished,      // Corrida finalizada
}

/// Status da corrida (sync com DriverState)
enum RideStatus {
  requested,         // Esperando motorista aceitar
  accepted,          // Motorista aceitou
  headingToPickup,   // Indo buscar passageiro
  inProgress,        // Em andamento
  finished,          // Finalizada
}

// ===== MODELS =====

class LatLngModel {
  final double latitude;
  final double longitude;

  LatLngModel({
    required this.latitude,
    required this.longitude,
  });

  @override
  String toString() => 'LatLng($latitude, $longitude)';
}

/// Representa uma corrida
class RideModel {
  final String id;
  final String passengerId;
  final String driverId;
  final LatLngModel pickupLocation;
  final LatLngModel dropoffLocation;
  final String pickupAddress;
  final String dropoffAddress;
  final double price;
  RideStatus status;
  final DateTime createdAt;
  DateTime? acceptedAt;
  DateTime? pickedUpAt;
  DateTime? finishedAt;

  RideModel({
    required this.id,
    required this.passengerId,
    required this.driverId,
    required this.pickupLocation,
    required this.dropoffLocation,
    required this.pickupAddress,
    required this.dropoffAddress,
    required this.price,
    this.status = RideStatus.requested,
    required this.createdAt,
    this.acceptedAt,
    this.pickedUpAt,
    this.finishedAt,
  });

  /// Duração da corrida em minutos (se finalizada)
  int? getDurationMinutes() {
    if (pickedUpAt == null || finishedAt == null) return null;
    return finishedAt!.difference(pickedUpAt!).inMinutes;
  }

  @override
  String toString() =>
      'RideModel(id: $id, status: $status, price: $price)';
}
