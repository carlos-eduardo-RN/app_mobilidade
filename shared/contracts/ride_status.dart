enum RideStatus {
  requested,
  accepted,
  driverArrived,
  inProgress,
  completed,
  cancelled,
}

String rideStatusToWire(RideStatus status) {
  switch (status) {
    case RideStatus.requested:
      return 'requested';
    case RideStatus.accepted:
      return 'accepted';
    case RideStatus.driverArrived:
      return 'driver_arrived';
    case RideStatus.inProgress:
      return 'in_progress';
    case RideStatus.completed:
      return 'completed';
    case RideStatus.cancelled:
      return 'cancelled';
  }
}

RideStatus rideStatusFromWire(String value) {
  switch (value) {
    case 'requested':
    case 'created':
    case 'searching':
    case 'searching_driver':
      return RideStatus.requested;
    case 'accepted':
    case 'driver_assigned':
      return RideStatus.accepted;
    case 'driver_arrived':
      return RideStatus.driverArrived;
    case 'in_progress':
      return RideStatus.inProgress;
    case 'completed':
    case 'finished':
      return RideStatus.completed;
    case 'cancelled':
    case 'cancelled_by_passenger':
    case 'cancelled_by_driver':
    case 'cancelled_by_admin':
    case 'cancelled_timeout':
      return RideStatus.cancelled;
    default:
      throw ArgumentError('Unknown ride status: $value');
  }
}
