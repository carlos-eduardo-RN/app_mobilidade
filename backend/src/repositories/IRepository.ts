/**
 * Repository Interfaces
 * Persistence contracts without storage coupling.
 */

import { DriverStatus, DriverStatusType } from '../models/DriverStatus';
import { Location } from '../models/Location';
import { Ride, RideStatus, RideStatusChange } from '../models/Ride';

export interface IRepository<T> {
  save(entity: T): Promise<T>;
  findById(id: string): Promise<T | null>;
  findAll(): Promise<T[]>;
  delete(id: string): Promise<boolean>;
  update(id: string, entity: Partial<T>): Promise<T>;
}

export interface IUserRepository extends IRepository<any> {
  findByEmail(email: string): Promise<any | null>;
  findByPhone(phone: string): Promise<any | null>;
  findByRole(role: string): Promise<any[]>;
}

export interface IDriverRepository extends IRepository<any> {
  findActiveDrivers(): Promise<any[]>;
  findDriversByStatus(status: string): Promise<any[]>;
  findDriversInRadius(
    latitude: number,
    longitude: number,
    radiusKm: number
  ): Promise<any[]>;
}

export interface RideUpdateWhereConditions {
  id?: string;
  passengerId?: string;
  driverId?: string;
  status?: RideStatus;
  statusNotIn?: RideStatus[];
}

export interface RideUpdateWhereData {
  driverId?: string | null;
  status?: RideStatus;
  startedAt?: Date;
  finishedAt?: Date;
  cancelledAt?: Date | null;
  lastStatusUpdate?: Date;
  cancelReason?: string | null;
  notes?: string | null;
}

export interface IRideRepository extends IRepository<Ride> {
  findByPassengerId(passengerId: string): Promise<Ride[]>;
  findByDriverId(driverId: string): Promise<Ride[]>;
  findActiveRides(): Promise<Ride[]>;
  findByStatus(status: RideStatus): Promise<Ride[]>;
  updateWhere(
    conditions: RideUpdateWhereConditions,
    updates: RideUpdateWhereData
  ): Promise<number>;
  appendStatusHistory(
    rideId: string,
    statusChange: RideStatusChange
  ): Promise<void>;
}

export interface ILocationRepository extends IRepository<Location> {
  saveDriverLocation(driverId: string, location: Location): Promise<void>;
  getLatestDriverLocation(driverId: string): Promise<Location | null>;
  savePassengerLocation(passengerId: string, location: Location): Promise<void>;
  getLatestPassengerLocation(passengerId: string): Promise<Location | null>;
}

export interface IDriverStatusRepository extends IRepository<DriverStatus> {
  findByDriverId(driverId: string): Promise<DriverStatus | null>;
  setStatus(driverId: string, status: DriverStatusType): Promise<DriverStatus>;
}
