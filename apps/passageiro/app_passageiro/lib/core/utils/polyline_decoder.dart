import 'package:google_maps_flutter/google_maps_flutter.dart';

/// Decodifica uma polyline comprimida do Google Directions API
/// Referência: https://developers.google.com/maps/documentation/utilities/polylinealgorithm
class PolylineDecoder {
  static List<LatLng> decode(String encoded) {
    final List<LatLng> polylineCoordinates = [];
    int index = 0;
    final int len = encoded.length;
    int lat = 0;
    int lng = 0;

    while (index < len) {
      int result = 0;
      int shift = 0;
      int b;

      // Decodifica latitude
      do {
        b = encoded.codeUnitAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);

      int dlat = ((result & 1) == 0) ? (result >> 1) : ~(result >> 1);
      lat += dlat;

      result = 0;
      shift = 0;

      // Decodifica longitude
      do {
        b = encoded.codeUnitAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);

      int dlng = ((result & 1) == 0) ? (result >> 1) : ~(result >> 1);
      lng += dlng;

      final double latitude = (lat / 1e5);
      final double longitude = (lng / 1e5);

      polylineCoordinates.add(LatLng(latitude, longitude));
    }

    return polylineCoordinates;
  }
}
