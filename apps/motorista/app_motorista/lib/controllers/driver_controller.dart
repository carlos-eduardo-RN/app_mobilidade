// ignore_for_file: avoid_print

import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;

import '../config/api_config.dart';
import '../helpers/app_error_handler.dart';
import '../models/ride_model.dart' hide DriverState;
import '../services/driver_sync_service.dart';
import 'auth_controller.dart';
import 'driver_state_controller.dart';
import 'session_controller.dart';

enum DriverState {
  offline,
  waitingRide,
  requestReceived,
  headingToPickup,
  inRide,
  rideFinished,
}

class DriverController extends ChangeNotifier {
  static final DriverController instance = DriverController._internal();

  DriverController._internal();

  final AppErrorHandler errorHandler = AppErrorHandler();
  final DriverSyncService _syncService = DriverSyncService.instance;
  final DriverStateController driverStatus = DriverStateController();

  final ValueNotifier<DriverState> driverState = ValueNotifier<DriverState>(
    DriverState.offline,
  );
  final ValueNotifier<RideModel?> currentRide = ValueNotifier<RideModel?>(null);
  final ValueNotifier<LatLngModel> driverLocation = ValueNotifier(
    LatLngModel(latitude: -23.5505, longitude: -46.6333),
  );
  final ValueNotifier<double> driverHeading = ValueNotifier<double>(0);
  final ValueNotifier<double?> distanceToTarget = ValueNotifier<double?>(null);
  final ValueNotifier<int?> etaMinutes = ValueNotifier<int?>(null);
  final ValueNotifier<String?> errorMessage = ValueNotifier<String?>(null);
  final ValueNotifier<bool> isMapFollowing = ValueNotifier<bool>(true);

  Timer? _rideRequestTimeout;

  Future<void> setDriverId(String driverId) async {
    await SessionController.instance.setDriverId(driverId);
    debugPrint(
      '[DriverController] DRIVER ID definido: ${SessionController.instance.driverId}',
    );
  }

  Future<void> goOnline() async {
    _ensureDriverRole();
    print('GO ONLINE INICIADO');
    final authToken = AuthController.instance.token.value;
    print('TOKEN BRUTO: $authToken');
    final driverId = SessionController.instance.driverId;

    print('TOKEN: ${AuthController.instance.token.value}');
    print('DRIVER ID: ${SessionController.instance.driverId}');

    if (authToken == null || authToken.isEmpty) {
      throw Exception('Token invalido no goOnline');
    }

    if (driverId == null || driverId.isEmpty) {
      throw Exception('DriverId nao definido');
    }

    final response = await http.post(
      Uri.parse('${ApiConfig.baseUrl}/api/driver/status/online'),
      headers: {
        'Authorization': 'Bearer $authToken',
        'Content-Type': 'application/json',
      },
    );

    print('GO ONLINE STATUS: ${response.statusCode}');
    print('GO ONLINE BODY: ${response.body}');
    print('GO ONLINE RESPONSE: ${response.body}');

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw Exception(
        'Falha ao ficar online: ${response.statusCode} ${response.body}',
      );
    }

    _clearError();
    driverStatus.goOnline();
    driverState.value = DriverState.waitingRide;
    await startRealtimeSync();
    debugPrint('[DriverController] ONLINE -> aguardando corrida');
  }

  Future<void> goOffline() async {
    if (driverState.value == DriverState.offline && !_syncService.isRunning) {
      return;
    }

    driverState.value = DriverState.offline;
    driverStatus.goOffline();
    await stopRealtimeSync();
    errorHandler.cancelTimeout(_rideRequestTimeout);
    currentRide.value = null;
    debugPrint('[DriverController] OFFLINE');
  }

  Future<void> startRealtimeSync() async {
    _ensureDriverRole();
    final driverId = SessionController.instance.driverId;
    if (driverId == null || driverId.isEmpty) {
      throw Exception('Driver ID nao disponivel para realtime');
    }

    await _syncService.start(
      driverId: driverId,
      getDriverLocation: () => driverLocation.value,
      getDriverHeading: () => driverHeading.value,
      shouldSendLocation: _shouldSendLocation,
      onRideAssigned: onRideAssignedFromBackend,
      onRideCancelled: onRideCancelledFromBackend,
      onRideStatusUpdated: onRideStatusUpdatedFromBackend,
    );
  }

  Future<void> stopRealtimeSync() async {
    await _syncService.stop();
  }

  void onRideAssignedFromBackend(RideModel ride) {
    if (driverState.value != DriverState.waitingRide) return;

    currentRide.value = ride;
    driverState.value = DriverState.requestReceived;
    _startRideRequestTimeout();

    debugPrint('[DriverController] Corrida recebida do backend: ${ride.id}');
  }

  void receiveRideRequest(RideModel ride) => onRideAssignedFromBackend(ride);

  void onRideCancelledFromBackend(String rideId) {
    if (currentRide.value?.id != rideId) return;

    errorHandler.cancelTimeout(_rideRequestTimeout);
    currentRide.value = null;
    driverState.value = DriverState.waitingRide;
    _setError('Corrida cancelada pelo passageiro');
  }

  void onRideStatusUpdatedFromBackend(RideStatus status) {
    final ride = currentRide.value;
    if (ride == null) return;

    ride.status = status;
    currentRide.notifyListeners();

    switch (status) {
      case RideStatus.requested:
        driverState.value = DriverState.requestReceived;
        _startRideRequestTimeout();
        break;
      case RideStatus.accepted:
      case RideStatus.headingToPickup:
        driverState.value = DriverState.headingToPickup;
        errorHandler.cancelTimeout(_rideRequestTimeout);
        break;
      case RideStatus.inProgress:
        driverState.value = DriverState.inRide;
        break;
      case RideStatus.finished:
        driverState.value = DriverState.rideFinished;
        Future.delayed(const Duration(seconds: 2), () {
          currentRide.value = null;
          driverState.value = DriverState.waitingRide;
        });
        break;
    }
  }

  void acceptRide() {
    if (!_hasDriverRole()) {
      _setError('Usuario nao e motorista');
      return;
    }

    final ride = currentRide.value;
    if (ride == null || driverState.value != DriverState.requestReceived) {
      _setError('Nenhuma corrida para aceitar');
      return;
    }

    ride.status = RideStatus.accepted;
    ride.acceptedAt = DateTime.now();
    currentRide.notifyListeners();

    driverState.value = DriverState.headingToPickup;
    errorHandler.cancelTimeout(_rideRequestTimeout);

    debugPrint('[DriverController] Corrida aceita: ${ride.id}');
  }

  void declineRide() {
    if (!_hasDriverRole()) {
      _setError('Usuario nao e motorista');
      return;
    }

    final ride = currentRide.value;
    if (ride == null) {
      _setError('Nenhuma corrida para recusar');
      return;
    }

    currentRide.value = null;
    driverState.value = DriverState.waitingRide;
    errorHandler.cancelTimeout(_rideRequestTimeout);

    debugPrint('[DriverController] Corrida recusada: ${ride.id}');
  }

  void startRide() {
    if (!_hasDriverRole()) {
      _setError('Usuario nao e motorista');
      return;
    }

    final ride = currentRide.value;
    if (ride == null || driverState.value != DriverState.headingToPickup) {
      _setError('Nao esta a caminho do passageiro');
      return;
    }

    ride.status = RideStatus.inProgress;
    ride.pickedUpAt = DateTime.now();
    currentRide.notifyListeners();

    driverState.value = DriverState.inRide;
    debugPrint('[DriverController] Corrida iniciada: ${ride.id}');
  }

  void finishRide() {
    if (!_hasDriverRole()) {
      _setError('Usuario nao e motorista');
      return;
    }

    final ride = currentRide.value;
    if (ride == null || driverState.value != DriverState.inRide) {
      _setError('Nenhuma corrida em andamento');
      return;
    }

    ride.status = RideStatus.finished;
    ride.finishedAt = DateTime.now();
    currentRide.notifyListeners();

    driverState.value = DriverState.rideFinished;
    debugPrint('[DriverController] Corrida finalizada: ${ride.id}');

    Future.delayed(const Duration(seconds: 2), () {
      currentRide.value = null;
      driverState.value = DriverState.waitingRide;
    });
  }

  void toggleMapFollowing() {
    isMapFollowing.value = !isMapFollowing.value;
  }

  void clearError() {
    errorMessage.value = null;
    errorHandler.clearError();
  }

  void updateRealtimeLocation({
    required LatLngModel location,
    required double heading,
  }) {
    driverLocation.value = location;
    driverHeading.value = heading;
  }

  void _startRideRequestTimeout() {
    errorHandler.cancelTimeout(_rideRequestTimeout);
    _rideRequestTimeout = errorHandler.createTimeout(
      duration: const Duration(seconds: 30),
      timeoutName: 'rideRequest',
      onTimeout: () {
        currentRide.value = null;
        driverState.value = DriverState.waitingRide;
        _setError('Corrida expirada');
      },
    );
  }

  void _setError(String message) {
    errorMessage.value = message;
    debugPrint('[DriverController] ERRO: $message');
  }

  void _clearError() {
    errorMessage.value = null;
  }

  bool _hasDriverRole() {
    final role = SessionController.instance.role?.toUpperCase();
    return role == 'DRIVER';
  }

  void _ensureDriverRole() {
    final role = SessionController.instance.role?.toUpperCase();
    if (role != 'DRIVER') {
      throw Exception('Usuario nao e motorista');
    }
  }

  bool _shouldSendLocation() {
    final state = driverState.value;
    return state != DriverState.offline && state != DriverState.rideFinished;
  }

  @override
  void dispose() {
    unawaited(stopRealtimeSync());
    errorHandler.cancelAllTimeouts();
    driverState.dispose();
    currentRide.dispose();
    driverLocation.dispose();
    driverHeading.dispose();
    distanceToTarget.dispose();
    etaMinutes.dispose();
    errorMessage.dispose();
    isMapFollowing.dispose();
    driverStatus.dispose();
    super.dispose();
  }
}
