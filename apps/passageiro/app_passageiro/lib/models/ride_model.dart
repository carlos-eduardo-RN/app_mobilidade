import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:app_passageiro/core/enums/ride_status.dart';
import 'driver_location_model.dart';
import 'route_data_model.dart';

class RideModel {
  final String id;
  final String origin;
  final String destination;
  final double estimatedDistanceKm;
  final double estimatedPrice;
  final RideStatus status;

  // 🧑‍✈️ Dados do motorista
  final String? driverName;
  final double? driverRating;
  final String? driverVehicle;
  final String? driverPlate;

  // 🗺️ Dados de localização e rota
  final LatLng? passengerLocation;
  final DriverLocation? driverLocation;
  final RouteData? approachRoute; // Rota motorista → passageiro
  final RouteData? rideRoute; // Rota passageiro → destino
  final double? remainingDistanceKm; // Distância restante
  final int? remainingTimeMinutes; // Tempo restante estimado

  // 🔴 ETAPA 4 - Modo erro: Flags internas para tratamento de exceções
  final bool hasError;
  final String? errorMessage;

  // ⏰ ETAPA 3 - Timeout: Rastreamento de última atualização
  final DateTime? lastPositionUpdate; // Última atualização de posição do motorista

  const RideModel({
    required this.id,
    required this.origin,
    required this.destination,
    required this.estimatedDistanceKm,
    required this.estimatedPrice,
    this.status = RideStatus.idle,
    this.driverName,
    this.driverRating,
    this.driverVehicle,
    this.driverPlate,
    this.passengerLocation,
    this.driverLocation,
    this.approachRoute,
    this.rideRoute,
    this.remainingDistanceKm,
    this.remainingTimeMinutes,
    this.hasError = false,
    this.errorMessage,
    this.lastPositionUpdate,
  });

  /// Cria uma nova instância alterando apenas os campos desejados
  RideModel copyWith({
    String? id,
    String? origin,
    String? destination,
    double? estimatedDistanceKm,
    double? estimatedPrice,
    RideStatus? status,
    String? driverName,
    double? driverRating,
    String? driverVehicle,
    String? driverPlate,
    LatLng? passengerLocation,
    DriverLocation? driverLocation,
    RouteData? approachRoute,
    RouteData? rideRoute,
    double? remainingDistanceKm,
    int? remainingTimeMinutes,
    bool? hasError,
    String? errorMessage,
    DateTime? lastPositionUpdate,
  }) {
    return RideModel(
      id: id ?? this.id,
      origin: origin ?? this.origin,
      destination: destination ?? this.destination,
      estimatedDistanceKm:
          estimatedDistanceKm ?? this.estimatedDistanceKm,
      estimatedPrice: estimatedPrice ?? this.estimatedPrice,
      status: status ?? this.status,
      driverName: driverName ?? this.driverName,
      driverRating: driverRating ?? this.driverRating,
      driverVehicle: driverVehicle ?? this.driverVehicle,
      driverPlate: driverPlate ?? this.driverPlate,
      passengerLocation: passengerLocation ?? this.passengerLocation,
      driverLocation: driverLocation ?? this.driverLocation,
      approachRoute: approachRoute ?? this.approachRoute,
      rideRoute: rideRoute ?? this.rideRoute,
      remainingDistanceKm: remainingDistanceKm ?? this.remainingDistanceKm,
      remainingTimeMinutes: remainingTimeMinutes ?? this.remainingTimeMinutes,
      hasError: hasError ?? this.hasError,
      errorMessage: errorMessage ?? this.errorMessage,
      lastPositionUpdate: lastPositionUpdate ?? this.lastPositionUpdate,
    );
  }
}