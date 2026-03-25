import 'dart:async';
import 'dart:math';
import '../models/ride_model.dart' hide DriverState;
import '../controllers/driver_controller.dart';

/// MockRideService simula solicitações de corrida do backend
/// 
/// IMPORTANTE: Este é código MOCK. Será substituído por chamadas
/// reais de API quando integrado com backend.
/// 
/// Busca por "MockRideService" para encontrar pontos de integração futura.
class MockRideService {
  Timer? _timer;
  int _rideCounter = 0;
  final Random _random = Random();

  static final MockRideService _instance = MockRideService._internal();
  factory MockRideService() => _instance;
  MockRideService._internal();

  /// Inicia simulação de solicitações de corrida
  void startListening() {
    _timer?.cancel();

    // Simula recebimento de corrida após 4-8 segundos
    final delaySeconds = 4 + _random.nextInt(4);
    _timer = Timer(Duration(seconds: delaySeconds), () {
      if (DriverController.instance.driverState.value ==
          DriverState.waitingRide) {
        _generateMockRide();
      }
    });
  }

  /// Para a simulação
  void stop() {
    _timer?.cancel();
  }

  /// Gera uma corrida mock aleatória
  void _generateMockRide() {
    _rideCounter++;

    // Mock de rotas em São Paulo
    final mockRoutes = [
      (
        'Av. Central',
        LatLngModel(latitude: -23.5491, longitude: -46.6293),
        'Rua das Flores',
        LatLngModel(latitude: -23.5505, longitude: -46.6400),
      ),
      (
        'Pça. da República',
        LatLngModel(latitude: -23.5437, longitude: -46.6596),
        'Av. Paulista',
        LatLngModel(latitude: -23.5615, longitude: -46.6560),
      ),
      (
        'Terminal Rodoviário',
        LatLngModel(latitude: -23.5548, longitude: -46.6144),
        'Shopping Center',
        LatLngModel(latitude: -23.5505, longitude: -46.6333),
      ),
    ];

    final routeIndex = _random.nextInt(mockRoutes.length);
    final route = mockRoutes[routeIndex];

    final ride = RideModel(
      id: 'RIDE_MOCK_$_rideCounter',
      passengerId: 'PASS_MOCK_${_rideCounter}01',
      driverId: 'DRIV_001', // Será preenchido quando houver autenticação
      pickupLocation: route.$2,
      dropoffLocation: route.$4,
      pickupAddress: route.$1,
      dropoffAddress: route.$3,
      price: 15.50 + (_random.nextDouble() * 10),
      createdAt: DateTime.now(),
    );

    // Notificar controller
    DriverController.instance.receiveRideRequest(ride);

    // Schedular próxima corrida após 30s (timeout) + delay
    Future.delayed(const Duration(seconds: 35), () {
      if (DriverController.instance.driverState.value == DriverState.waitingRide) {
        startListening();
      }
    });
  }

  @override
  String toString() => 'MockRideService(rides_generated: $_rideCounter)';
}
