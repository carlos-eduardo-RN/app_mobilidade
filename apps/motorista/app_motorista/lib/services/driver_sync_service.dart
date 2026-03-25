import 'dart:async';

import 'package:flutter/foundation.dart';

import '../controllers/session_controller.dart';
import '../models/ride_model.dart' hide DriverState;
import 'api_client.dart';
import 'auth_service.dart';
import 'realtime_service.dart';

class DriverSyncService {
  static final DriverSyncService instance = DriverSyncService._internal();

  DriverSyncService._internal();

  final AuthService _authService = AuthService();
  final RealtimeService _realtimeService = RealtimeService.instance;

  late final ApiClient _apiClient;
  Timer? _locationTimer;
  StreamSubscription? _wsEventSubscription;
  bool _running = false;

  static const Duration _locationInterval = Duration(seconds: 2);

  late String _driverId;
  late LatLngModel Function() _getDriverLocation;
  late double Function() _getDriverHeading;
  late bool Function() _shouldSendLocation;
  late void Function(RideModel ride) _onRideAssigned;
  late void Function(String rideId) _onRideCancelled;
  late void Function(RideStatus status) _onRideStatusUpdated;

  bool get isRunning => _running;
  bool get isConnected => _realtimeService.isConnected;

  Future<void> start({
    required String driverId,
    required LatLngModel Function() getDriverLocation,
    required bool Function() shouldSendLocation,
    required double Function() getDriverHeading,
    required void Function(RideModel ride) onRideAssigned,
    required void Function(String rideId) onRideCancelled,
    required void Function(RideStatus status) onRideStatusUpdated,
  }) async {
    if (_running) return;

    _apiClient = ApiClient(onRefreshToken: _authService.refreshAccessToken);
    _running = true;
    _driverId = driverId;
    _getDriverLocation = getDriverLocation;
    _shouldSendLocation = shouldSendLocation;
    _getDriverHeading = getDriverHeading;
    _onRideAssigned = onRideAssigned;
    _onRideCancelled = onRideCancelled;
    _onRideStatusUpdated = onRideStatusUpdated;

    try {
      final token = SessionController.instance.accessToken;
      if (token == null || token.isEmpty) {
        throw Exception('Token nao disponivel para realtime do motorista');
      }

      await _realtimeService.connectAsDriver(token);
      _startLocationSync();
      _listenToWebSocketEvents();

      debugPrint('[DriverSyncService] Sincronizacao iniciada');
    } catch (e) {
      debugPrint('[DriverSyncService] Erro ao iniciar sincronizacao: $e');
      _running = false;
      rethrow;
    }
  }

  Future<void> stop() async {
    if (!_running) return;
    _running = false;

    _locationTimer?.cancel();
    _locationTimer = null;

    await _wsEventSubscription?.cancel();
    _wsEventSubscription = null;

    await _realtimeService.disconnect();

    try {
      await _sendDriverOffline();
    } catch (e) {
      debugPrint('[DriverSyncService] Erro ao enviar offline: $e');
    }

    debugPrint('[DriverSyncService] Sincronizacao parada');
  }

  Future<void> sendLocation({
    required double latitude,
    required double longitude,
    required double heading,
  }) async {
    try {
      final response = await _apiClient.post(
        '/api/driver/location',
        body: {
          'latitude': latitude,
          'longitude': longitude,
          'heading': heading,
          'timestamp': DateTime.now().toIso8601String(),
        },
      );

      if (response.statusCode != 200) {
        debugPrint(
          '[DriverSyncService] Erro ao enviar localizacao: '
          '${response.statusCode} ${response.body}',
        );
      } else {
        debugPrint('[DriverSyncService] Localizacao enviada com sucesso');
      }
    } catch (e) {
      debugPrint('[DriverSyncService] Erro ao enviar localizacao: $e');
    }
  }

  void _startLocationSync() {
    _locationTimer?.cancel();
    _locationTimer = Timer.periodic(_locationInterval, (_) {
      if (!_shouldSendLocation()) return;
      final location = _getDriverLocation();
      unawaited(
        sendLocation(
          latitude: location.latitude,
          longitude: location.longitude,
          heading: _getDriverHeading(),
        ),
      );
    });
  }

  Future<void> _sendDriverOffline() async {
    try {
      final response = await _apiClient.post(
        '/api/driver/status/offline',
        body: {'driverId': _driverId},
      );

      if (response.statusCode == 200) {
        debugPrint('[DriverSyncService] Status offline enviado');
      } else {
        debugPrint(
          '[DriverSyncService] Erro ao enviar status offline: ${response.statusCode}',
        );
      }
    } catch (e) {
      debugPrint('[DriverSyncService] Erro ao enviar status offline: $e');
    }
  }

  void _listenToWebSocketEvents() {
    unawaited(_wsEventSubscription?.cancel());

    _wsEventSubscription = _realtimeService.events.listen(
      (event) {
        final type = (event['type'] ?? event['event']) as String?;
        final envelope =
            event['payload'] is Map<String, dynamic>
                ? event['payload'] as Map<String, dynamic>
                : event;
        final payload =
            envelope['data'] is Map<String, dynamic>
                ? envelope['data'] as Map<String, dynamic>
                : envelope;

        switch (type) {
          case 'ride_assigned':
            _handleRideAssigned(payload);
            break;
          case 'ride_cancelled':
            _handleRideCancelled(payload);
            break;
          case 'ride_status_changed':
          case 'ride_status_updated':
            _handleRideStatusUpdated(payload);
            break;
          case 'connect':
            debugPrint('[DriverSyncService] WebSocket conectado');
            break;
          case 'disconnect':
            debugPrint('[DriverSyncService] WebSocket desconectado');
            break;
          default:
            debugPrint('[DriverSyncService] Evento desconhecido: $type');
        }
      },
      onError: (error) {
        debugPrint('[DriverSyncService] Erro na stream de eventos: $error');
      },
    );
  }

  void _handleRideAssigned(Map<String, dynamic> event) {
    try {
      final ride = _parseRideFromEvent(event);
      if (ride != null) {
        _onRideAssigned(ride);
        debugPrint('[DriverSyncService] Corrida atribuida: ${ride.id}');
      }
    } catch (e) {
      debugPrint('[DriverSyncService] Erro ao processar ride_assigned: $e');
    }
  }

  void _handleRideCancelled(Map<String, dynamic> event) {
    try {
      final rideId = event['rideId'] as String?;
      if (rideId != null) {
        _onRideCancelled(rideId);
        debugPrint('[DriverSyncService] Corrida cancelada: $rideId');
      }
    } catch (e) {
      debugPrint('[DriverSyncService] Erro ao processar ride_cancelled: $e');
    }
  }

  void _handleRideStatusUpdated(Map<String, dynamic> event) {
    try {
      final statusStr = event['status'] as String?;
      if (statusStr != null) {
        final status = RideStatus.values.firstWhere(
          (item) => item.toString() == 'RideStatus.$statusStr',
          orElse: () => RideStatus.requested,
        );
        _onRideStatusUpdated(status);
        debugPrint(
          '[DriverSyncService] Status da corrida atualizado: $statusStr',
        );
      }
    } catch (e) {
      debugPrint('[DriverSyncService] Erro ao processar ride_status_updated: $e');
    }
  }

  RideModel? _parseRideFromEvent(Map<String, dynamic> event) {
    try {
      final ride = event['ride'] as Map<String, dynamic>?;
      if (ride == null) return null;

      return RideModel(
        id: ride['id'] as String? ?? '',
        passengerId: ride['passengerId'] as String? ?? '',
        driverId: ride['driverId'] as String? ?? _driverId,
        pickupLocation: LatLngModel(
          latitude:
              (ride['pickupLocation']?['latitude'] as num?)?.toDouble() ?? 0,
          longitude:
              (ride['pickupLocation']?['longitude'] as num?)?.toDouble() ?? 0,
        ),
        dropoffLocation: LatLngModel(
          latitude:
              (ride['dropoffLocation']?['latitude'] as num?)?.toDouble() ?? 0,
          longitude:
              (ride['dropoffLocation']?['longitude'] as num?)?.toDouble() ?? 0,
        ),
        pickupAddress: ride['pickupAddress'] as String? ?? '',
        dropoffAddress: ride['dropoffAddress'] as String? ?? '',
        price: (ride['price'] as num?)?.toDouble() ?? 0,
        status: _parseRideStatus(ride['status']),
        createdAt:
            DateTime.tryParse(ride['createdAt'] as String? ?? '') ??
            DateTime.now(),
      );
    } catch (e) {
      debugPrint('[DriverSyncService] Erro ao fazer parse de ride: $e');
      return null;
    }
  }

  RideStatus _parseRideStatus(dynamic status) {
    if (status == null) return RideStatus.requested;

    final statusStr = status.toString().toLowerCase();

    if (statusStr.contains('requested')) return RideStatus.requested;
    if (statusStr.contains('searching')) return RideStatus.requested;
    if (statusStr.contains('assigned')) return RideStatus.accepted;
    if (statusStr.contains('accepted')) return RideStatus.accepted;
    if (statusStr.contains('heading')) return RideStatus.headingToPickup;
    if (statusStr.contains('progress')) return RideStatus.inProgress;
    if (statusStr.contains('completed')) return RideStatus.finished;
    if (statusStr.contains('finished')) return RideStatus.finished;

    return RideStatus.requested;
  }

  void dispose() {
    unawaited(stop());
    unawaited(_wsEventSubscription?.cancel());
    _locationTimer?.cancel();
  }
}
