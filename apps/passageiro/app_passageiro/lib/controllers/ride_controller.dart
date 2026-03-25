import 'dart:async';

import 'package:app_passageiro/core/enums/connection_status.dart';
import 'package:app_passageiro/core/enums/ride_status.dart';
import 'package:app_passageiro/core/services/connectivity_service.dart';
import 'package:app_passageiro/core/error_handler/error_handler.dart';
import 'package:app_passageiro/core/services/persistence_service.dart';
import 'package:app_passageiro/core/services/timeout_manager.dart';
import 'package:app_passageiro/core/state_machine/ride_state.dart';
import 'package:app_passageiro/core/state_machine/ride_state_machine.dart';
import 'package:app_passageiro/core/utils/route_calculations.dart';
import 'package:app_passageiro/controllers/realtime_controller.dart';
import 'package:app_passageiro/controllers/session_controller.dart';
import 'package:app_passageiro/models/driver_location_model.dart';
import 'package:app_passageiro/models/ride_model.dart';
import 'package:app_passageiro/services/ride_service.dart';
import 'package:flutter/foundation.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';

class RideController {
  RideController._();
  static final RideController instance = RideController._();

  final ValueNotifier<RideState> state = ValueNotifier(RideState.initial());

  final RideStateMachine _machine = RideStateMachine();
  final RideService _rideService = RideService();
  final RealtimeController _realtime = RealtimeController();
  final SessionController _session = SessionController.instance;
  final PersistenceService _persistence = PersistenceService.instance;

  Timer? _searchTimeoutTimer;
  bool _requestInFlight = false;

  Future<void> init() async {
    ErrorHandler.instance.init();
    await ConnectivityService.instance.start();
    await _session.init();

    final restored = await _persistence.loadRide();
    if (restored != null) {
      _setState(status: restored.status, ride: restored, isLoading: false);
      await _restoreFromBackend();
      _connectRealtimeIfNeeded(restored.id);
    }

    _realtime.connectionStatus.addListener(_syncConnectionStatus);
  }

  void _syncConnectionStatus() {
    final status = _realtime.connectionStatus.value;
    state.value = state.value.copyWith(connectionStatus: status);

    if (status == ConnectionStatus.connected) {
      final rideId = state.value.ride?.id ?? '';
      if (rideId.isNotEmpty) {
        _realtime.send({'type': 'subscribe', 'ride_id': rideId});
      }
    }
  }

  void acknowledgeDriverAssigned() {
    if (state.value.status == RideStatus.driverAssigned) {
      _transitionTo(RideStatus.driverArriving);
    }
  }

  void startDestinationSelection() {
    final existing = state.value.ride;
    if (existing == null) {
      final placeholder = RideModel(
        id: '',
        origin: 'Sua localizacao atual',
        destination: '',
        estimatedDistanceKm: 0,
        estimatedPrice: 0,
        status: RideStatus.selectingDestination,
      );
      _transitionTo(RideStatus.selectingDestination, ride: placeholder);
      return;
    }
    _transitionTo(RideStatus.selectingDestination);
  }

  void cancelDestinationSelection() {
    _transitionTo(RideStatus.idle);
  }

  Future<void> confirmDestination({
    required String origin,
    required String destination,
    LatLng? passengerLocation,
    LatLng? destinationLocation,
  }) async {
    if (_requestInFlight) return;
    if (!_session.isAuthenticated) {
      ErrorHandler.instance.setErrorByType(
        type: AppErrorType.unknown,
        customMessage: 'Sessao expirada. Faca login novamente.',
      );
      return;
    }

    _requestInFlight = true;
    _setState(isLoading: true);

    try {
      final ride = await _executeWithAuth((token) {
        return _rideService.createRide(
          token: token,
          origin: origin,
          destination: destination,
          passengerLocation: passengerLocation,
          destinationLocation: destinationLocation,
        );
      });

      _transitionTo(RideStatus.searchingDriver, ride: ride);
      await _persistence.saveRide(ride.copyWith(status: RideStatus.searchingDriver));

      _startDriverSearchTimeout();
      _connectRealtimeIfNeeded(ride.id);
    } catch (e) {
      ErrorHandler.instance.setErrorByType(
        type: AppErrorType.serverError,
        customMessage: 'Falha ao solicitar corrida. Tente novamente.',
        originalError: e,
      );
    } finally {
      _requestInFlight = false;
      _setState(isLoading: false);
    }
  }

  void handleRideStarted() {
    if (state.value.status == RideStatus.driverArriving ||
        state.value.status == RideStatus.driverAssigned) {
      _transitionTo(RideStatus.rideStarted);
    }
  }

  void handleRideInProgress() {
    if (state.value.status == RideStatus.rideStarted ||
        state.value.status == RideStatus.driverArriving) {
      _transitionTo(RideStatus.rideInProgress);
    }
  }

  Future<void> cancelRide() async {
    final ride = state.value.ride;
    if (ride == null || !_canCancel(state.value.status)) return;

    _setState(isLoading: true);
    try {
      if (_session.isAuthenticated) {
        final updated = await _executeWithAuth((token) {
          return _rideService.cancelRide(
            token: token,
            rideId: ride.id,
          );
        });
        _transitionTo(RideStatus.rideCancelled, ride: updated);
      } else {
        _transitionTo(RideStatus.rideCancelled, ride: ride);
      }

      await _persistence.saveRide(
        (state.value.ride ?? ride).copyWith(status: RideStatus.rideCancelled),
      );
    } catch (e) {
      ErrorHandler.instance.setErrorByType(
        type: AppErrorType.serverError,
        customMessage: 'Nao foi possivel cancelar a corrida.',
        originalError: e,
      );
    } finally {
      _setState(isLoading: false);
    }
  }

  Future<void> clearRide() async {
    _searchTimeoutTimer?.cancel();
    _transitionTo(RideStatus.idle, ride: null);
  }

  Future<void> _restoreFromBackend() async {
    if (!_session.isAuthenticated) return;
    try {
      final activeRide = await _executeWithAuth(
        (token) => _rideService.getActiveRide(token: token),
      );
      if (activeRide != null) {
        _setState(status: activeRide.status, ride: activeRide, isLoading: false);
        await _persistence.saveRide(activeRide);
      } else {
        await clearRide();
      }
    } catch (e) {
      ErrorHandler.instance.setErrorByType(
        type: AppErrorType.apiTimeout,
        customMessage: 'Falha ao restaurar corrida ativa.',
        originalError: e,
      );
    }
  }

  void _connectRealtimeIfNeeded(String rideId) {
    if (!_session.isAuthenticated || rideId.isEmpty) return;
    _realtime.connect(
      token: _session.accessToken.value!,
      onEvent: _handleRealtimeEvent,
    );
    _realtime.send({
      'type': 'subscribe',
      'ride_id': rideId,
    });
  }

  void _handleRealtimeEvent(Map<String, dynamic> event) {
    final type = event['event'] ?? event['type'] ?? '';
    final envelope =
        event['payload'] is Map<String, dynamic> ? event['payload'] : event;
    final payload = (envelope is Map<String, dynamic>)
        ? (envelope['data'] is Map<String, dynamic>
            ? envelope['data']
            : envelope)
        : event;

    switch (type) {
      case 'ride_assigned':
        if (state.value.status == RideStatus.searchingDriver) {
          _transitionTo(RideStatus.driverAssigned);
        }
        _syncRideFromBackend(_extractRideId(envelope, payload));
        break;
      case 'ride_status_changed':
        _syncRideFromBackend(_extractRideId(envelope, payload));
        break;
      case 'driver_location_update':
        _applyDriverLocation(payload);
        break;
      case 'ride_cancelled':
        _transitionTo(RideStatus.rideCancelled);
        break;
      default:
        break;
    }
  }

  String _extractRideId(dynamic envelope, dynamic payload) {
    if (envelope is Map<String, dynamic>) {
      final fromEnvelope = envelope['ride_id']?.toString();
      if (fromEnvelope != null && fromEnvelope.isNotEmpty) return fromEnvelope;
    }
    if (payload is Map<String, dynamic>) {
      final fromPayload = payload['ride_id']?.toString() ?? payload['id']?.toString();
      if (fromPayload != null && fromPayload.isNotEmpty) return fromPayload;
    }
    return state.value.ride?.id ?? '';
  }

  Future<void> _syncRideFromBackend(String rideId) async {
    if (rideId.isEmpty || !_session.isAuthenticated) return;
    try {
      final updated = await _executeWithAuth(
        (token) => _rideService.getRide(token: token, rideId: rideId),
      );
      _transitionTo(updated.status, ride: updated);
      _persistIfActive(updated);
    } catch (e) {
      // Best effort sync from realtime signal.
      debugPrint('Ride sync after realtime event failed: $e');
    }
  }

  void _applyDriverLocation(dynamic payload) {
    if (payload is! Map<String, dynamic>) return;
    final ride = state.value.ride;
    if (ride == null) return;

    final lat = (payload['lat'] as num?)?.toDouble() ??
        (payload['latitude'] as num?)?.toDouble();
    final lng = (payload['lng'] as num?)?.toDouble() ??
        (payload['longitude'] as num?)?.toDouble();
    if (lat == null || lng == null) return;

    final driverLoc = DriverLocation(
      position: LatLng(lat, lng),
      heading: (payload['heading'] as num?)?.toDouble() ?? 0,
      timestamp: DateTime.tryParse(payload['timestamp']?.toString() ?? '') ??
          DateTime.now(),
    );

    final remaining = _calculateRemaining(ride, driverLoc.position);
    final updated = ride.copyWith(
      driverLocation: driverLoc,
      remainingDistanceKm: remaining.distanceKm,
      remainingTimeMinutes: remaining.etaMinutes,
      lastPositionUpdate: DateTime.now(),
    );

    _setState(ride: updated);
    _persistIfActive(updated);

    if (state.value.status == RideStatus.searchingDriver ||
        state.value.status == RideStatus.driverAssigned) {
      _transitionTo(RideStatus.driverArriving, ride: updated);
    }
  }

  void _persistIfActive(RideModel ride) {
    if (ride.status == RideStatus.rideCompleted ||
        ride.status == RideStatus.rideCancelled) {
      return;
    }
    _persistence.saveRide(ride);
  }

  void _startDriverSearchTimeout() {
    _searchTimeoutTimer?.cancel();
    _searchTimeoutTimer = Timer(TimeoutManager.driverSearchTimeout, () {
      if (state.value.status == RideStatus.searchingDriver) {
        ErrorHandler.instance.setErrorByType(
          type: AppErrorType.serverError,
          customMessage: 'Nenhum motorista disponivel. Tente novamente.',
        );
        cancelRide();
      }
    });
  }

  bool _canCancel(RideStatus status) {
    return status == RideStatus.searchingDriver ||
        status == RideStatus.driverAssigned ||
        status == RideStatus.driverArriving ||
        status == RideStatus.rideStarted ||
        status == RideStatus.rideInProgress;
  }

  void _transitionTo(RideStatus next, {RideModel? ride}) {
    final current = state.value.status;
    if (current == next) {
      if (ride != null) {
        _setState(ride: ride, status: next);
      }
      return;
    }

    if (!_machine.canTransition(current, next)) {
      return;
    }

    if (current == RideStatus.searchingDriver &&
        next != RideStatus.searchingDriver) {
      _searchTimeoutTimer?.cancel();
    }

    final nextRide = ride ?? state.value.ride;
    _setState(status: next, ride: nextRide);

    if (next == RideStatus.idle) {
      _persistence.clearRide();
    } else if (nextRide != null) {
      _persistence.saveRide(nextRide.copyWith(status: next));
    }
  }

  Future<T> _executeWithAuth<T>(Future<T> Function(String token) action) async {
    final token = _session.accessToken.value;
    if (token == null || token.isEmpty) {
      throw Exception('Sessao invalida');
    }

    try {
      return await action(token);
    } on UnauthorizedException {
      final refreshed = await _session.refreshTokens();
      if (!refreshed) {
        await _session.clear();
        ErrorHandler.instance.setErrorByType(
          type: AppErrorType.unknown,
          customMessage: 'Sessao expirada. Faca login novamente.',
        );
        rethrow;
      }
      final newToken = _session.accessToken.value;
      if (newToken == null || newToken.isEmpty) {
        throw Exception('Sessao invalida');
      }
      return action(newToken);
    }
  }

  void _setState({
    RideStatus? status,
    RideModel? ride,
    bool? isLoading,
  }) {
    state.value = state.value.copyWith(
      status: status ?? state.value.status,
      ride: ride ?? state.value.ride,
      isLoading: isLoading ?? state.value.isLoading,
      errorMessage: null,
    );
  }

  _RemainingResult _calculateRemaining(RideModel ride, LatLng driverPos) {
    final route = (state.value.status == RideStatus.driverArriving ||
            state.value.status == RideStatus.driverAssigned)
        ? ride.approachRoute
        : ride.rideRoute;

    if (route == null || route.polyline.isEmpty) {
      return const _RemainingResult(distanceKm: 0, etaMinutes: 0);
    }

    final nearestIndex = RouteCalculations.findNearestPolylinePoint(
      driverPos,
      route.polyline,
    );

    double remaining = 0;
    for (int i = nearestIndex; i < route.polyline.length - 1; i++) {
      remaining += RouteCalculations.calculateDistance(
        route.polyline[i],
        route.polyline[i + 1],
      );
    }

    return _RemainingResult(
      distanceKm: remaining,
      etaMinutes: RouteCalculations.estimateTimeMinutes(remaining),
    );
  }
}

class _RemainingResult {
  final double distanceKm;
  final int etaMinutes;

  const _RemainingResult({
    required this.distanceKm,
    required this.etaMinutes,
  });
}
