import 'dart:math' as Math;
import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import '../models/ride_model.dart';

/// Helper para criar markers e polylines do mapa
class MapHelper {
  // IDs dos markers
  static const String driverMarkerId = 'driver_marker';
  static const String pickupMarkerId = 'pickup_marker';
  static const String dropoffMarkerId = 'dropoff_marker';

  // IDs das polylines
  static const String toPickupPolylineId = 'to_pickup_polyline';
  static const String toDropoffPolylineId = 'to_dropoff_polyline';

  /// Cria marker do motorista com rotação
  static Marker createDriverMarker({
    required LatLng position,
    required double heading,
  }) {
    return Marker(
      markerId: const MarkerId(driverMarkerId),
      position: position,
      infoWindow: const InfoWindow(
        title: '📍 Você',
        snippet: 'Posição atual',
      ),
      // Emoji como infoWindow personalizado
      flat: true,
      rotation: heading,
    );
  }

  /// Cria marker do passageiro (pickup)
  static Marker createPickupMarker(LatLngModel location) {
    return Marker(
      markerId: const MarkerId(pickupMarkerId),
      position: LatLng(location.latitude, location.longitude),
      infoWindow: const InfoWindow(
        title: '🚶 Passageiro',
        snippet: 'Local de pickup',
      ),
    );
  }

  /// Cria marker do destino (dropoff)
  static Marker createDropoffMarker(LatLngModel location) {
    return Marker(
      markerId: const MarkerId(dropoffMarkerId),
      position: LatLng(location.latitude, location.longitude),
      infoWindow: const InfoWindow(
        title: '📍 Destino',
        snippet: 'Local de dropoff',
      ),
    );
  }

  /// Cria polyline de motorista até pickup
  static Polyline createToPickupPolyline({
    required LatLng driverPosition,
    required LatLngModel pickupLocation,
  }) {
    return Polyline(
      polylineId: const PolylineId(toPickupPolylineId),
      points: [
        driverPosition,
        LatLng(pickupLocation.latitude, pickupLocation.longitude),
      ],
      color: const Color(0xFF00BCD4), // Cyan para pickup
      width: 4,
      geodesic: true,
    );
  }

  /// Cria polyline de motorista até dropoff
  static Polyline createToDropoffPolyline({
    required LatLng driverPosition,
    required LatLngModel dropoffLocation,
  }) {
    return Polyline(
      polylineId: const PolylineId(toDropoffPolylineId),
      points: [
        driverPosition,
        LatLng(dropoffLocation.latitude, dropoffLocation.longitude),
      ],
      color: const Color(0xFFFF5722), // Orange para dropoff
      width: 4,
      geodesic: true,
    );
  }

  /// Calcula distância aproximada entre dois pontos (Haversine)
  static double calculateDistance(LatLng from, LatLng to) {
    const earthRadiusKm = 6371.0;

    final dLat = _toRadians(to.latitude - from.latitude);
    final dLon = _toRadians(to.longitude - from.longitude);

    final a = 
        (Math.sin(dLat / 2) * Math.sin(dLat / 2)) +
        (Math.cos(_toRadians(from.latitude)) *
            Math.cos(_toRadians(to.latitude)) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2));

    final c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return earthRadiusKm * c * 1000; // Retorna em metros
  }

  static double _toRadians(double degrees) => degrees * Math.pi / 180.0;
}
