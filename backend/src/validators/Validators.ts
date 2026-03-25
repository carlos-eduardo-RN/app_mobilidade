/**
 * Domain validators.
 */

import { DriverStatusType } from '../models/DriverStatus';
import { ValidationError } from '../models/Errors';
import { RideStatus } from '../models/Ride';

export class LocationValidator {
  static validateCoordinates(latitude: number, longitude: number): boolean {
    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      throw new ValidationError('Latitude and longitude must be numbers');
    }

    if (latitude < -90 || latitude > 90) {
      throw new ValidationError('Latitude must be between -90 and 90');
    }

    if (longitude < -180 || longitude > 180) {
      throw new ValidationError('Longitude must be between -180 and 180');
    }

    return true;
  }

  static validateDistance(distanceKm: number): boolean {
    if (distanceKm < 0 || distanceKm > 500) {
      throw new ValidationError('Distance must be between 0 and 500 km');
    }
    return true;
  }
}

export class RideValidator {
  static validateStateTransition(currentStatus: RideStatus, newStatus: RideStatus): boolean {
    const validTransitions: Record<RideStatus, RideStatus[]> = {
      [RideStatus.REQUESTED]: [RideStatus.SEARCHING, RideStatus.CANCELLED],
      [RideStatus.SEARCHING]: [RideStatus.DRIVER_ASSIGNED, RideStatus.CANCELLED],
      [RideStatus.DRIVER_ASSIGNED]: [RideStatus.IN_PROGRESS, RideStatus.CANCELLED],
      [RideStatus.IN_PROGRESS]: [RideStatus.COMPLETED, RideStatus.CANCELLED],
      [RideStatus.COMPLETED]: [],
      [RideStatus.CANCELLED]: [],
    };

    const allowedTransitions = validTransitions[currentStatus] || [];
    return allowedTransitions.includes(newStatus);
  }

  static isFinalStatus(status: RideStatus): boolean {
    return [RideStatus.COMPLETED, RideStatus.CANCELLED].includes(status);
  }

  static validateRideData(
    pickupLat: number,
    pickupLng: number,
    dropoffLat: number,
    dropoffLng: number
  ): boolean {
    LocationValidator.validateCoordinates(pickupLat, pickupLng);
    LocationValidator.validateCoordinates(dropoffLat, dropoffLng);

    if (pickupLat === dropoffLat && pickupLng === dropoffLng) {
      throw new ValidationError('Pickup and dropoff locations cannot be the same');
    }

    return true;
  }
}

export class DriverValidator {
  static validateStatusTransition(currentStatus: DriverStatusType, newStatus: DriverStatusType): boolean {
    const validTransitions: Record<DriverStatusType, DriverStatusType[]> = {
      [DriverStatusType.OFFLINE]: [DriverStatusType.ONLINE],
      [DriverStatusType.ONLINE]: [
        DriverStatusType.BUSY,
        DriverStatusType.ON_BREAK,
        DriverStatusType.OFFLINE,
      ],
      [DriverStatusType.BUSY]: [DriverStatusType.ONLINE, DriverStatusType.OFFLINE],
      [DriverStatusType.ON_BREAK]: [DriverStatusType.ONLINE, DriverStatusType.OFFLINE],
    };

    if (!validTransitions[currentStatus]?.includes(newStatus)) {
      throw new ValidationError(
        `Cannot transition driver status from ${currentStatus} to ${newStatus}`,
        { currentStatus, newStatus }
      );
    }

    return true;
  }

  static isAvailable(status: DriverStatusType): boolean {
    return status === DriverStatusType.ONLINE;
  }
}

export class UserValidator {
  static validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new ValidationError('Invalid email format');
    }
    return true;
  }

  static validatePhone(phone: string): boolean {
    const phoneRegex = /^[\d\s+\-()]*$/;
    if (!phoneRegex.test(phone) || phone.length < 10) {
      throw new ValidationError('Invalid phone format');
    }
    return true;
  }

  static validateName(name: string): boolean {
    if (name.length < 3 || name.length > 150) {
      throw new ValidationError('Name must be between 3 and 150 characters');
    }
    return true;
  }
}
