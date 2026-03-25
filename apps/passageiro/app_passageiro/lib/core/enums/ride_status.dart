enum RideStatus {
  idle,
  selectingDestination,
  searchingDriver,
  driverAssigned,
  driverArriving,
  rideStarted,
  rideInProgress,
  rideCompleted,
  rideCancelled,
}

RideStatus rideStatusFromString(String? value) {
  if (value == null || value.isEmpty) return RideStatus.idle;

  switch (value) {
    case 'requested':
    case 'created':
    case 'searching':
    case 'searching_driver':
      return RideStatus.searchingDriver;
    case 'accepted':
    case 'driver_assigned':
      return RideStatus.driverAssigned;
    case 'driver_arrived':
    case 'driver_approaching':
      return RideStatus.driverArriving;
    case 'in_progress':
      return RideStatus.rideInProgress;
    case 'completed':
    case 'finished':
      return RideStatus.rideCompleted;
    case 'cancelled':
    case 'cancelled_by_passenger':
    case 'cancelled_by_driver':
    case 'cancelled_by_admin':
    case 'cancelled_timeout':
      return RideStatus.rideCancelled;
    default:
      return RideStatus.idle;
  }
}

String rideStatusToString(RideStatus status) => status.name;
