import 'package:google_maps_flutter/google_maps_flutter.dart';

/// Modelo para dados de rota entre dois pontos
class RouteData {
  final List<LatLng> polyline;
  final double totalDistanceKm;
  final int estimatedTimeMinutes;

  const RouteData({
    required this.polyline,
    required this.totalDistanceKm,
    required this.estimatedTimeMinutes,
  });

  /// Cria uma rota vazia/padrão
  static RouteData empty() {
    return const RouteData(
      polyline: [],
      totalDistanceKm: 0,
      estimatedTimeMinutes: 0,
    );
  }
}
