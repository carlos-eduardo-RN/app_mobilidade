import 'package:flutter/foundation.dart';

enum DriverStatus {
  offline,
  online,
  waitingRide,
  incomingRide,
  drivingToPassenger,
  inRide,
}

class DriverStateController extends ChangeNotifier {
  // Central state to drive the visible screen for the driver.
  DriverStateController({DriverStatus? initialStatus})
      : status = initialStatus ?? DriverStatus.offline;

  DriverStatus status;

  void goOnline() => _setStatus(DriverStatus.online);

  void goOffline() => _setStatus(DriverStatus.offline);

  void setWaitingRide() => _setStatus(DriverStatus.waitingRide);

  void receiveRide() => _setStatus(DriverStatus.incomingRide);

  void startDrivingToPassenger() =>
      _setStatus(DriverStatus.drivingToPassenger);

  void startRide() => _setStatus(DriverStatus.inRide);

  void _setStatus(DriverStatus nextStatus) {
    if (status == nextStatus) return;
    status = nextStatus;
    notifyListeners();
  }
}
