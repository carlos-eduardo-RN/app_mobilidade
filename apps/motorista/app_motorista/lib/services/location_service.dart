import 'dart:async';

import 'package:geolocator/geolocator.dart';
import 'package:app_motorista/models/ride_model.dart';

class LocationService {
  LocationService._();
  static final LocationService instance = LocationService._();

  StreamSubscription<Position>? _positionSubscription;

  Future<bool> ensurePermission() async {
    final serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      return false;
    }

    var permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
    }

    return permission == LocationPermission.always ||
        permission == LocationPermission.whileInUse;
  }

  Future<LatLngModel?> getCurrentLocation() async {
    final hasPermission = await ensurePermission();
    if (!hasPermission) return null;

    final position = await Geolocator.getCurrentPosition(
      desiredAccuracy: LocationAccuracy.high,
    );
    return LatLngModel(
      latitude: position.latitude,
      longitude: position.longitude,
    );
  }

  StreamSubscription<Position> startPositionStream({
    required void Function(Position position) onPosition,
    Duration interval = const Duration(seconds: 2),
  }) {
    _positionSubscription?.cancel();

    _positionSubscription = Geolocator.getPositionStream(
      locationSettings: LocationSettings(
        accuracy: LocationAccuracy.best,
        distanceFilter: 3,
        timeLimit: interval * 10,
      ),
    ).listen(onPosition);

    return _positionSubscription!;
  }

  Future<void> stopPositionStream() async {
    await _positionSubscription?.cancel();
    _positionSubscription = null;
  }
}
