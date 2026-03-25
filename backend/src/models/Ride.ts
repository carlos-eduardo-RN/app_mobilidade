import { Location } from './Location';

/**
 * Ride Domain - source of truth for the ride lifecycle.
 *
 * Valid transitions:
 * requested -> searching -> driver_assigned -> in_progress -> completed
 * requested/searching/driver_assigned/in_progress -> cancelled
 */
export enum RideStatus {
  REQUESTED = 'requested',
  SEARCHING = 'searching',
  DRIVER_ASSIGNED = 'driver_assigned',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export interface RideLocation {
  latitude: number;
  longitude: number;
  address?: string;
}

export interface RideEstimate {
  estimatedDurationSeconds: number;
  estimatedDistanceMeters: number;
  estimatedPrice: number;
}

export interface Ride {
  id: string;
  passengerId: string;
  driverId?: string;
  status: RideStatus;
  version?: number;

  pickupLocation: RideLocation;
  dropoffLocation: RideLocation;
  estimate?: RideEstimate;
  driverLocation?: Location;

  createdAt: Date;
  startedAt?: Date;
  finishedAt?: Date;
  cancelledAt?: Date;

  lastStatusUpdate: Date;
  statusHistory: RideStatusChange[];

  cancelReason?: string;
  notes?: string;
}

export interface RideStatusChange {
  status: RideStatus;
  timestamp: Date;
  reason?: string;
  changedBy?: string;
}

export interface CreateRideDTO {
  passengerId: string;
  pickupLocation: RideLocation;
  dropoffLocation: RideLocation;
}

export interface AcceptRideDTO {
  driverId: string;
  rideId: string;
}

export interface StartRideDTO {
  rideId: string;
  driverId: string;
  passengerPickupConfirmed?: boolean;
}

export interface FinishRideDTO {
  rideId: string;
  driverId: string;
  finalLocation: RideLocation;
  actualDurationSeconds?: number;
  actualDistanceMeters?: number;
  actualPrice?: number;
}

export interface CancelRideDTO {
  rideId: string;
  cancelledBy: 'passenger' | 'driver' | 'system';
  reason?: string;
}
