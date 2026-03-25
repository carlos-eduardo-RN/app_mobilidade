import 'dart:convert';

import 'package:app_passageiro/core/config/app_config.dart';
import 'package:app_passageiro/core/enums/ride_status.dart';
import 'package:app_passageiro/models/driver_location_model.dart';
import 'package:app_passageiro/models/ride_model.dart';
import 'package:app_passageiro/models/route_data_model.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:http/http.dart' as http;

class RideService {
  RideService({http.Client? client, String? baseUrl})
      : _client = client ?? http.Client(),
        _baseUrl = baseUrl ?? AppConfig.apiBaseUrl;

  final http.Client _client;
  final String _baseUrl;

  Future<RideModel> createRide({
    required String token,
    required String origin,
    required String destination,
    LatLng? passengerLocation,
    LatLng? destinationLocation,
  }) async {
    final uri = Uri.parse('$_baseUrl/passenger/rides');
    final response = await _client.post(
      uri,
      headers: _headers(token),
      body: jsonEncode({
        'pickupLocation': _latLngToJson(passengerLocation, address: origin),
        'dropoffLocation': _latLngToJson(destinationLocation, address: destination),
      }),
    );

    _ensureSuccess(response);
    final createdRide = rideFromJson(_extractData(response.body));

    // Dispara matching para viabilizar fluxo E2E (passageiro -> motorista)
    final matchedRide = await _startMatching(token: token, rideId: createdRide.id);
    return matchedRide ?? createdRide;
  }

  Future<RideModel?> getActiveRide({required String token}) async {
    final uri = Uri.parse('$_baseUrl/passenger/rides/active');
    final response = await _client.get(uri, headers: _headers(token));
    if (response.statusCode == 204 || response.body.isEmpty) {
      return null;
    }
    _ensureSuccess(response);
    return rideFromJson(_extractData(response.body));
  }

  Future<RideModel> getRide({required String token, required String rideId}) async {
    final uri = Uri.parse('$_baseUrl/passenger/rides/$rideId');
    final response = await _client.get(uri, headers: _headers(token));
    _ensureSuccess(response);
    return rideFromJson(_extractData(response.body));
  }

  Future<RideModel> cancelRide({required String token, required String rideId}) async {
    final uri = Uri.parse('$_baseUrl/passenger/rides/$rideId/cancel');
    final response = await _client.post(uri, headers: _headers(token));
    _ensureSuccess(response);
    return rideFromJson(_extractData(response.body));
  }

  Map<String, String> _headers(String token) => {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $token',
      };

  void _ensureSuccess(http.Response response) {
    if (response.statusCode == 401) {
      throw UnauthorizedException();
    }
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw Exception(
        'RideService: HTTP ${response.statusCode} - ${response.body}',
      );
    }
  }

  Future<RideModel?> _startMatching({
    required String token,
    required String rideId,
  }) async {
    if (rideId.isEmpty) return null;
    final uri = Uri.parse('$_baseUrl/passenger/rides/$rideId/start-matching');
    final response = await _client.post(uri, headers: _headers(token));

    if (response.statusCode < 200 || response.statusCode >= 300) {
      return null;
    }

    final data = _extractData(response.body);
    return rideFromJson(data);
  }

  Map<String, dynamic>? _latLngToJson(LatLng? value, {String? address}) {
    if (value == null) return null;

    final payload = <String, dynamic>{
      'latitude': value.latitude,
      'longitude': value.longitude,
    };

    if (address != null && address.trim().isNotEmpty) {
      payload['address'] = address.trim();
    }

    return payload;
  }

  Map<String, dynamic> _extractData(String body) {
    final decoded = jsonDecode(body);
    if (decoded is! Map<String, dynamic>) {
      throw Exception('RideService: resposta invalida');
    }

    final data = decoded['data'];
    if (decoded.containsKey('success') && data is Map<String, dynamic>) {
      return data;
    }

    return decoded;
  }

  RideModel rideFromJson(Map<String, dynamic> json) {
    final pickup = json['pickupLocation'] as Map<String, dynamic>?;
    final dropoff = json['dropoffLocation'] as Map<String, dynamic>?;
    final passengerLoc = _latLngFromJson(pickup);
    final driverLoc = _driverLocationFromJson(json['driverLocation']);
    final approachRoute = _routeFromJson(json['approachRoute']);
    final rideRoute = _routeFromJson(json['rideRoute']);

    return RideModel(
      id: json['id']?.toString() ?? '',
      origin: pickup?['address']?.toString() ?? 'Origem',
      destination: dropoff?['address']?.toString() ?? 'Destino',
      estimatedDistanceKm:
          (json['estimate']?['estimatedDistanceMeters'] as num?)?.toDouble() !=
                  null
              ? ((json['estimate']?['estimatedDistanceMeters'] as num).toDouble() /
                  1000)
              : (json['estimatedDistanceKm'] as num?)?.toDouble() ?? 0,
      estimatedPrice:
          (json['estimate']?['estimatedPrice'] as num?)?.toDouble() ??
              (json['estimatedPrice'] as num?)?.toDouble() ??
              0,
      status: rideStatusFromString(json['status'] as String?),
      driverName: null,
      driverRating: null,
      driverVehicle: null,
      driverPlate: null,
      passengerLocation: passengerLoc,
      driverLocation: driverLoc,
      approachRoute: approachRoute,
      rideRoute: rideRoute,
      remainingDistanceKm: (json['remainingDistanceKm'] as num?)?.toDouble(),
      remainingTimeMinutes: (json['remainingTimeMinutes'] as num?)?.toInt(),
      hasError: false,
      errorMessage: null,
      lastPositionUpdate: DateTime.tryParse(
        json['lastStatusUpdate']?.toString() ?? '',
      ),
    );
  }

  LatLng? _latLngFromJson(dynamic json) {
    if (json is! Map<String, dynamic>) return null;
    final lat = (json['lat'] as num?)?.toDouble() ??
        (json['latitude'] as num?)?.toDouble();
    final lng = (json['lng'] as num?)?.toDouble() ??
        (json['longitude'] as num?)?.toDouble();
    if (lat == null || lng == null) return null;
    return LatLng(lat, lng);
  }

  DriverLocation? _driverLocationFromJson(dynamic json) {
    if (json is! Map<String, dynamic>) return null;
    final pos = _latLngFromJson(json);
    if (pos == null) return null;
    final heading = (json['heading'] as num?)?.toDouble() ?? 0;
    final timestamp = DateTime.tryParse(json['timestamp']?.toString() ?? '');
    return DriverLocation(
      position: pos,
      heading: heading,
      timestamp: timestamp ?? DateTime.now(),
    );
  }

  RouteData? _routeFromJson(dynamic json) {
    if (json is! Map<String, dynamic>) return null;
    final polylineJson = json['polyline'] as List<dynamic>? ?? [];
    final polyline = polylineJson
        .whereType<Map<String, dynamic>>()
        .map((point) => LatLng(
              (point['lat'] as num?)?.toDouble() ??
                  (point['latitude'] as num?)?.toDouble() ??
                  0,
              (point['lng'] as num?)?.toDouble() ??
                  (point['longitude'] as num?)?.toDouble() ??
                  0,
            ))
        .toList();

    return RouteData(
      polyline: polyline,
      totalDistanceKm: (json['totalDistanceKm'] as num?)?.toDouble() ?? 0,
      estimatedTimeMinutes: (json['estimatedTimeMinutes'] as num?)?.toInt() ?? 0,
    );
  }
}

class UnauthorizedException implements Exception {
  @override
  String toString() => 'UnauthorizedException';
}
