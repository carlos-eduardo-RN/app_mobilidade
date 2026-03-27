import 'dart:convert';

import 'package:app_motorista/services/api_client.dart';
import 'package:app_motorista/services/auth_service.dart';

class DriverRideHistory {
  final String id;
  final DateTime date;
  final String pickup;
  final String destination;
  final String status;
  final double amount;

  const DriverRideHistory({
    required this.id,
    required this.date,
    required this.pickup,
    required this.destination,
    required this.status,
    required this.amount,
  });
}

class DriverEarningsSummary {
  final double today;
  final double week;
  final List<DriverRideHistory> rides;

  const DriverEarningsSummary({
    required this.today,
    required this.week,
    required this.rides,
  });
}

class DriverService {
  DriverService({ApiClient? apiClient, AuthService? authService})
      : _authService = authService ?? AuthService(),
        _apiClient = apiClient ??
            ApiClient(
              onRefreshToken: (authService ?? AuthService()).refreshAccessToken,
            );

  final AuthService _authService;
  final ApiClient _apiClient;

  Future<void> goOnline() async {
    final response = await _apiClient.post('/driver/status/online');
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw Exception(
        'Falha ao ficar online: ${response.statusCode} ${response.body}',
      );
    }
  }

  Future<void> goOffline() async {
    final response = await _apiClient.post('/api/driver/status/offline');
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw Exception(
        'Falha ao ficar offline: ${response.statusCode} ${response.body}',
      );
    }
  }

  Future<void> sendLocation({
    required double latitude,
    required double longitude,
    double? heading,
  }) async {
    final response = await _apiClient.post(
      '/api/driver/location',
      body: {
        'latitude': latitude,
        'longitude': longitude,
        if (heading != null) 'heading': heading,
      },
    );

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw Exception(
        'Falha ao enviar localizacao: ${response.statusCode} ${response.body}',
      );
    }
  }

  Future<DriverEarningsSummary> getEarningsSummary() async {
    final response = await _apiClient.get('/api/driver/rides');
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw Exception(
        'Falha ao obter corridas: ${response.statusCode} ${response.body}',
      );
    }

    final decoded = jsonDecode(response.body) as Map<String, dynamic>;
    final data = decoded['data'];
    final ridesJson = data is List ? data : const <dynamic>[];

    final rides = ridesJson
        .whereType<Map<String, dynamic>>()
        .map(_toRideHistory)
        .toList()
      ..sort((a, b) => b.date.compareTo(a.date));

    final now = DateTime.now();
    final todayStart = DateTime(now.year, now.month, now.day);
    final weekStart = todayStart.subtract(
      Duration(days: todayStart.weekday - DateTime.monday),
    );

    double today = 0;
    double week = 0;
    for (final ride in rides) {
      if (!ride.date.isBefore(todayStart)) {
        today += ride.amount;
      }
      if (!ride.date.isBefore(weekStart)) {
        week += ride.amount;
      }
    }

    return DriverEarningsSummary(today: today, week: week, rides: rides);
  }

  DriverRideHistory _toRideHistory(Map<String, dynamic> json) {
    final pickup = _extractAddress(
      json['pickupLocation'],
      json['pickupAddress'],
      fallback: 'Embarque',
    );
    final destination = _extractAddress(
      json['dropoffLocation'],
      json['dropoffAddress'],
      fallback: 'Destino',
    );

    final amount =
        (json['price'] as num?)?.toDouble() ??
        (json['estimatedPrice'] as num?)?.toDouble() ??
        (json['estimate'] is Map<String, dynamic>
            ? (json['estimate']['estimatedPrice'] as num?)?.toDouble()
            : null) ??
        0;

    final date = DateTime.tryParse(
          json['finishedAt']?.toString() ??
              json['lastStatusUpdate']?.toString() ??
              json['createdAt']?.toString() ??
              '',
        ) ??
        DateTime.now();

    return DriverRideHistory(
      id: json['id']?.toString() ?? '',
      date: date,
      pickup: pickup,
      destination: destination,
      status: json['status']?.toString() ?? 'unknown',
      amount: amount,
    );
  }

  String _extractAddress(
    dynamic location,
    dynamic fallbackAddress, {
    required String fallback,
  }) {
    if (location is Map<String, dynamic>) {
      final address = location['address']?.toString();
      if (address != null && address.trim().isNotEmpty) {
        return address.trim();
      }
    }

    final fallbackText = fallbackAddress?.toString();
    if (fallbackText != null && fallbackText.trim().isNotEmpty) {
      return fallbackText.trim();
    }

    return fallback;
  }
}
