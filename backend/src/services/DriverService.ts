import { v4 as uuidv4 } from 'uuid';
import { DriverStatus, DriverStatusType } from '../models/DriverStatus';
import { ConflictError, NotFoundError } from '../models/Errors';
import { ErrorCode } from '../models/Errors';
import { EventType } from '../models/Events';
import { Location } from '../models/Location';
import { RideStatus } from '../models/Ride';
import {
  IDriverRepository,
  IDriverStatusRepository,
  ILocationRepository,
  IRideRepository,
} from '../repositories/IRepository';
import { DriverValidator } from '../validators/Validators';
import { EventPublisher } from '../events/EventPublisher';
import { Logger } from '../utils/Logger';

export class DriverService {
  constructor(
    private driverRepository: IDriverRepository,
    private driverStatusRepository: IDriverStatusRepository,
    private locationRepository: ILocationRepository,
    private rideRepository: IRideRepository,
    private eventPublisher: EventPublisher
  ) {}

  async setDriverOnline(driverId: string): Promise<DriverStatus> {
    Logger.debug('DriverService', 'Setting driver online', { driverId });

    await this.ensureDriverExists(driverId);
    const currentStatus = await this.driverStatusRepository.findByDriverId(driverId);
    const current = currentStatus?.status || DriverStatusType.OFFLINE;

    DriverValidator.validateStatusTransition(current, DriverStatusType.ONLINE);
    const updated = await this.driverStatusRepository.setStatus(driverId, DriverStatusType.ONLINE);

    await this.eventPublisher.publish({
      id: uuidv4(),
      type: EventType.DRIVER_CAME_ONLINE,
      aggregateId: driverId,
      aggregateType: 'driver',
      timestamp: new Date(),
      data: { driverId },
    });

    Logger.info('DriverService', 'Driver is now online', { driverId });
    return updated;
  }

  async setDriverOffline(driverId: string): Promise<DriverStatus> {
    Logger.debug('DriverService', 'Setting driver offline', { driverId });

    await this.ensureDriverExists(driverId);
    const currentStatus = await this.driverStatusRepository.findByDriverId(driverId);
    const current = currentStatus?.status || DriverStatusType.OFFLINE;

    DriverValidator.validateStatusTransition(current, DriverStatusType.OFFLINE);
    const updated = await this.driverStatusRepository.setStatus(driverId, DriverStatusType.OFFLINE);

    await this.eventPublisher.publish({
      id: uuidv4(),
      type: EventType.DRIVER_WENT_OFFLINE,
      aggregateId: driverId,
      aggregateType: 'driver',
      timestamp: new Date(),
      data: { driverId },
    });

    Logger.info('DriverService', 'Driver is now offline', { driverId });
    return updated;
  }

  async getDriverStatus(driverId: string): Promise<DriverStatus> {
    Logger.debug('DriverService', 'Getting driver status', { driverId });

    await this.ensureDriverExists(driverId);
    const status = await this.driverStatusRepository.findByDriverId(driverId);
    if (!status) {
      return this.driverStatusRepository.setStatus(driverId, DriverStatusType.OFFLINE);
    }

    return status;
  }

  async updateDriverLocation(driverId: string, location: Location): Promise<void> {
    Logger.debug('DriverService', 'Updating driver location', { driverId });

    await this.ensureDriverExists(driverId);
    await this.locationRepository.saveDriverLocation(driverId, location);

    const rides = await this.rideRepository.findByDriverId(driverId);
    const activeStatuses = [RideStatus.DRIVER_ASSIGNED, RideStatus.IN_PROGRESS];
    const activeRide = rides.find((ride) => activeStatuses.includes(ride.status));

    if (activeRide) {
      await this.rideRepository.update(activeRide.id, {
        driverLocation: location,
      });
    }

    await this.eventPublisher.publish({
      id: uuidv4(),
      type: EventType.DRIVER_LOCATION_UPDATED,
      aggregateId: driverId,
      aggregateType: 'driver',
      timestamp: new Date(),
      data: {
        driverId,
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy,
        timestamp: location.timestamp.toISOString(),
        rideId: activeRide?.id ?? null,
      },
    });

    Logger.info('DriverService', 'Driver location updated', { driverId });
  }

  async getDriverLocation(driverId: string): Promise<Location | null> {
    return this.locationRepository.getLatestDriverLocation(driverId);
  }

  async isDriverAvailable(driverId: string): Promise<boolean> {
    const status = await this.getDriverStatus(driverId);
    return status.status === DriverStatusType.ONLINE && !status.currentRideId;
  }

  async markDriverBusy(driverId: string, rideId: string): Promise<void> {
    const driver = await this.ensureDriverExists(driverId);

    if (driver.currentRideId && driver.currentRideId !== rideId) {
      throw new ConflictError(
        ErrorCode.DRIVER_ALREADY_BUSY,
        `Driver ${driverId} is already assigned to another ride`,
        { driverId, currentRideId: driver.currentRideId, rideId }
      );
    }

    if (driver.status !== DriverStatusType.ONLINE && driver.currentRideId !== rideId) {
      throw new ConflictError(
        ErrorCode.DRIVER_OFFLINE,
        `Driver ${driverId} is not available to accept rides`,
        { driverId, status: driver.status, rideId }
      );
    }

    await this.driverRepository.update(driverId, {
      status: DriverStatusType.BUSY,
      currentRideId: rideId,
    });

    Logger.info('DriverService', 'Driver marked as busy', {
      driverId,
      rideId,
    });
  }

  async releaseDriverFromRide(driverId: string): Promise<void> {
    const driver = await this.ensureDriverExists(driverId);
    const nextStatus =
      driver.status === DriverStatusType.OFFLINE ? DriverStatusType.OFFLINE : DriverStatusType.ONLINE;

    await this.driverRepository.update(driverId, {
      currentRideId: null,
      status: nextStatus,
    });

    Logger.info('DriverService', 'Driver released from active ride', {
      driverId,
      nextStatus,
    });
  }

  private async ensureDriverExists(driverId: string): Promise<any> {
    const driver = await this.driverRepository.findById(driverId);
    if (!driver) {
      throw new NotFoundError(ErrorCode.DRIVER_NOT_FOUND, `Driver ${driverId} not found`);
    }

    return driver;
  }
}
