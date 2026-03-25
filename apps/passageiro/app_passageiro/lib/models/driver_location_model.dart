import 'dart:math';
import 'package:google_maps_flutter/google_maps_flutter.dart';

/// Modelo que representa a localização e informações do motorista
class DriverLocation {
  final LatLng position;
  final double heading;
  final DateTime timestamp;

  const DriverLocation({
    required this.position,
    required this.heading,
    required this.timestamp,
  });

  /// Simula movimento do motorista seguindo uma polyline
  /// Retorna nova posição interpolada entre dois pontos
  static LatLng interpolatePosition(
    LatLng start,
    LatLng end,
    double progress, // 0.0 a 1.0
  ) {
    return LatLng(
      start.latitude + (end.latitude - start.latitude) * progress,
      start.longitude + (end.longitude - start.longitude) * progress,
    );
  }

  /// Calcula heading (ângulo) entre dois pontos
  /// Retorna ângulo em graus (0-360)
  static double calculateHeading(LatLng from, LatLng to) {
    final double dLng = (to.longitude - from.longitude);
    final double lat1 = from.latitude * pi / 180;
    final double lat2 = to.latitude * pi / 180;
    final double dlngRad = dLng * pi / 180;
    final double y = sin(dlngRad) * cos(lat2);
    final double x = cos(lat1) * sin(lat2) -
        sin(lat1) * cos(lat2) * cos(dlngRad);
    final double headingRad = atan2(y, x);
    return (headingRad * 180 / pi + 360) % 360;
  }
}
