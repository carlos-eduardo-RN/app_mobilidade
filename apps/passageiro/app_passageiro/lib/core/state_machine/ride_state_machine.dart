import 'package:app_passageiro/core/enums/ride_status.dart';

class RideStateMachine {
  static final Map<RideStatus, Set<RideStatus>> _transitions = {
    RideStatus.idle: {
      RideStatus.selectingDestination,
      RideStatus.searchingDriver,
    },
    RideStatus.selectingDestination: {
      RideStatus.searchingDriver,
      RideStatus.idle,
    },
    RideStatus.searchingDriver: {
      RideStatus.driverAssigned,
      RideStatus.driverArriving,
      RideStatus.rideStarted,
      RideStatus.rideInProgress,
      RideStatus.rideCompleted,
      RideStatus.rideCancelled,
      RideStatus.idle,
    },
    RideStatus.driverAssigned: {
      RideStatus.driverArriving,
      RideStatus.rideStarted,
      RideStatus.rideInProgress,
      RideStatus.rideCompleted,
      RideStatus.rideCancelled,
    },
    RideStatus.driverArriving: {
      RideStatus.rideStarted,
      RideStatus.rideInProgress,
      RideStatus.rideCompleted,
      RideStatus.rideCancelled,
    },
    RideStatus.rideStarted: {
      RideStatus.rideInProgress,
      RideStatus.rideCompleted,
      RideStatus.rideCancelled,
    },
    RideStatus.rideInProgress: {
      RideStatus.rideCompleted,
      RideStatus.rideCancelled,
    },
    RideStatus.rideCompleted: {
      RideStatus.idle,
    },
    RideStatus.rideCancelled: {
      RideStatus.idle,
    },
  };

  bool canTransition(RideStatus from, RideStatus to) {
    return _transitions[from]?.contains(to) ?? false;
  }
}
