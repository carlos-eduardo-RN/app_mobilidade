import 'dart:math';
import 'package:google_maps_flutter/google_maps_flutter.dart';

/// Cálculos de distância e tempo entre pontos
class RouteCalculations {
  /// Calcula distância entre dois pontos em km usando Haversine
  static double calculateDistance(LatLng start, LatLng end) {
    const double earthRadius = 6371; // km
    
    final double lat1 = _degreesToRadians(start.latitude);
    final double lon1 = _degreesToRadians(start.longitude);
    final double lat2 = _degreesToRadians(end.latitude);
    final double lon2 = _degreesToRadians(end.longitude);

    final double dLat = lat2 - lat1;
    final double dLon = lon2 - lon1;

    final double a = sin(dLat / 2) * sin(dLat / 2) +
        cos(lat1) * cos(lat2) * sin(dLon / 2) * sin(dLon / 2);

    final double c = 2 * atan2(sqrt(a), sqrt(1 - a));
    final double distance = earthRadius * c;

    return distance;
  }

  /// Calcula distância total de uma polyline em km
  static double calculatePolylineDistance(List<LatLng> polyline) {
    if (polyline.length < 2) return 0;

    double totalDistance = 0;
    for (int i = 0; i < polyline.length - 1; i++) {
      totalDistance += calculateDistance(polyline[i], polyline[i + 1]);
    }

    return totalDistance;
  }

  /// Estima tempo em minutos baseado na distância
  /// Assume velocidade média de 30 km/h (ambiente urbano)
  static int estimateTimeMinutes(double distanceKm) {
    const double averageSpeedKmh = 30;
    final double hours = distanceKm / averageSpeedKmh;
    return max(1, (hours * 60).toInt());
  }

  /// Converte graus para radianos
  static double _degreesToRadians(double degrees) {
    return degrees * pi / 180;
  }

  /// Encontra o ponto mais próximo na polyline a uma posição
  static int findNearestPolylinePoint(
    LatLng position,
    List<LatLng> polyline,
  ) {
    if (polyline.isEmpty) return 0;

    double minDistance = double.infinity;
    int nearestIndex = 0;

    for (int i = 0; i < polyline.length; i++) {
      final double distance = calculateDistance(position, polyline[i]);
      if (distance < minDistance) {
        minDistance = distance;
        nearestIndex = i;
      }
    }

    return nearestIndex;
  }
}
