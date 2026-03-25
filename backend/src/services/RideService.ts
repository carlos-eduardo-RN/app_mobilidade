import { v4 as uuidv4 } from 'uuid';
import { EventPublisher } from '../events/EventPublisher';
import { EventType } from '../models/Events';
import { DistanceCalculator } from '../utils/DistanceCalculator';
import { Logger } from '../utils/Logger';
import { DriverService } from './DriverService';
import { MatchingService } from './MatchingService';
import { IUserRepository, IRideRepository } from '../repositories/IRepository';
import {
  ApplicationError,
  ConflictError,
  NotFoundError,
} from '../models/Errors';
import { ErrorCode } from '../models/Errors';
import {
  AcceptRideDTO,
  CancelRideDTO,
  CreateRideDTO,
  FinishRideDTO,
  Ride,
  RideStatus,
  RideStatusChange,
  StartRideDTO,
} from '../models/Ride';
import { RideValidator } from '../validators/Validators';

export interface LiveRideData {
  rideId: string;
  status: RideStatus;
  passengerId: string;
  driverId?: string;
  pickupLocation: {
    latitude: number;
    longitude: number;
  };
  dropoffLocation: {
    latitude: number;
    longitude: number;
  };
  driverLocation?: {
    latitude: number;
    longitude: number;
    timestamp: Date;
    accuracy?: number;
  };
  distanceToPassengerMeters?: number;
  etaToPassengerSeconds?: number;
  lastUpdate: Date;
}

export interface RideActionResult {
  changed: boolean;
  ride: Ride;
}

export interface MatchingAutomationCoordinator {
  startAutomation(
    rideId: string,
    passengerId: string,
    initialRadiusKm?: number
  ): Promise<void>;
  handleDriverAccepted(rideId: string, driverId: string): Promise<void>;
  cancelAutomation(rideId: string, reason: string): void;
  getOfferedDriverId(rideId: string): string | undefined;
}

export class RideService {
  private matchingAutomationService?: MatchingAutomationCoordinator;

  constructor(
    private rideRepository: IRideRepository,
    private userRepository: IUserRepository,
    private eventPublisher: EventPublisher,
    private driverService: DriverService,
    private matchingService: MatchingService
  ) {}

  setMatchingAutomationService(
    matchingAutomationService: MatchingAutomationCoordinator
  ): void {
    this.matchingAutomationService = matchingAutomationService;
  }

  async createRide(dto: CreateRideDTO): Promise<Ride> {
    const pickupLocation = dto?.pickupLocation;
    const dropoffLocation = dto?.dropoffLocation;

    if (
      !pickupLocation ||
      pickupLocation.latitude == null ||
      pickupLocation.longitude == null ||
      !dropoffLocation ||
      dropoffLocation.latitude == null ||
      dropoffLocation.longitude == null
    ) {
      throw new ApplicationError(
        ErrorCode.INVALID_LOCATION,
        'Pickup and destination coordinates are required',
        400
      );
    }

    const passenger = await this.userRepository.findById(dto.passengerId);
    if (!passenger) {
      throw new NotFoundError(
        ErrorCode.USER_NOT_FOUND,
        `Passenger ${dto.passengerId} not found`
      );
    }

    RideValidator.validateRideData(
      pickupLocation.latitude,
      pickupLocation.longitude,
      dropoffLocation.latitude,
      dropoffLocation.longitude
    );

    const now = new Date();
    const ride: Ride = {
      id: uuidv4(),
      passengerId: dto.passengerId,
      status: RideStatus.REQUESTED,
      pickupLocation,
      dropoffLocation,
      createdAt: now,
      lastStatusUpdate: now,
      statusHistory: [
        {
          status: RideStatus.REQUESTED,
          timestamp: now,
          changedBy: 'system',
        },
      ],
    };

    const saved = await this.rideRepository.save(ride);

    await this.publishRideEvent(EventType.RIDE_CREATED, saved, {
      rideId: saved.id,
      passengerId: saved.passengerId,
      status: saved.status,
    });

    return saved;
  }

  async getRideById(rideId: string): Promise<Ride> {
    const ride = await this.rideRepository.findById(rideId);
    if (!ride) {
      throw new NotFoundError(ErrorCode.RIDE_NOT_FOUND, `Ride ${rideId} not found`);
    }
    return ride;
  }

  async startSearchingDriver(rideId: string): Promise<RideActionResult> {
    const ride = await this.getRideById(rideId);

    if (ride.status === RideStatus.SEARCHING || ride.status === RideStatus.DRIVER_ASSIGNED) {
      return { changed: false, ride };
    }

    if (ride.status !== RideStatus.REQUESTED) {
      throw new ConflictError(
        ErrorCode.INVALID_RIDE_STATE,
        `Ride ${rideId} cannot enter matching from status ${ride.status}`,
        { rideId, currentStatus: ride.status }
      );
    }

    const now = new Date();
    const affected = await this.rideRepository.updateWhere(
      { id: rideId, status: RideStatus.REQUESTED },
      {
        status: RideStatus.SEARCHING,
        lastStatusUpdate: now,
      }
    );

    if (affected === 0) {
      return { changed: false, ride: await this.getRideById(rideId) };
    }

    await this.appendStatus(
      rideId,
      RideStatus.SEARCHING,
      'system',
      'Matching started'
    );

    const updatedRide = await this.getRideById(rideId);

    try {
      await this.requireMatchingAutomation().startAutomation(
        updatedRide.id,
        updatedRide.passengerId
      );
    } catch (error) {
      Logger.error('RideService', 'Failed to start matching automation', {
        rideId,
        error: error instanceof Error ? error.message : String(error),
      });

      await this.rideRepository.updateWhere(
        { id: rideId, status: RideStatus.SEARCHING },
        {
          status: RideStatus.REQUESTED,
          lastStatusUpdate: new Date(),
        }
      );
      await this.appendStatus(
        rideId,
        RideStatus.REQUESTED,
        'system',
        'Matching start failed and was rolled back'
      );

      throw new ApplicationError(
        ErrorCode.INTERNAL_ERROR,
        'Unable to start ride matching right now.',
        500,
        { rideId }
      );
    }

    await this.publishRideEvent(EventType.RIDE_MATCHING_STARTED, updatedRide, {
      rideId,
      passengerId: updatedRide.passengerId,
      status: updatedRide.status,
    });

    return { changed: true, ride: updatedRide };
  }

  async findBestDriverForRide(rideId: string, radiusKm: number): Promise<string | null> {
    const ride = await this.getRideById(rideId);
    const bestDriver = await this.matchingService.findBestDriver({
      passengerLatitude: ride.pickupLocation.latitude,
      passengerLongitude: ride.pickupLocation.longitude,
      maxRadiusKm: radiusKm,
    });

    return bestDriver ? bestDriver.matchedDriverId : null;
  }

  async assignDriverToRide(rideId: string, driverId: string): Promise<RideActionResult> {
    Logger.info('RideService', 'Assigning driver to ride', { 
      rideId, 
      driverId,
      timestamp: new Date().toISOString(),
    });

    // First check: get current ride state
    const ride = await this.getRideById(rideId);

    // Idempotency: if driver already assigned, return success
    if (ride.status === RideStatus.DRIVER_ASSIGNED && ride.driverId === driverId) {
      Logger.info('RideService', 'Driver assignment is idempotent - already assigned', {
        rideId,
        driverId,
        status: ride.status,
      });
      return { changed: false, ride };
    }

    // Safety check: cannot reassign to a different driver
    if (ride.driverId && ride.driverId !== driverId) {
      Logger.warn('RideService', 'Ride already assigned to another driver', {
        rideId,
        requestedDriverId: driverId,
        currentDriverId: ride.driverId,
      });
      throw new ConflictError(
        ErrorCode.RIDE_ALREADY_ASSIGNED,
        `Ride ${rideId} is already assigned to driver ${ride.driverId}`,
        { 
          rideId, 
          currentDriverId: ride.driverId, 
          driverId,
          currentStatus: ride.status,
        }
      );
    }

    // State validation: ride must be in SEARCHING state
    if (ride.status !== RideStatus.SEARCHING) {
      Logger.warn('RideService', 'Ride not in SEARCHING state for driver assignment', {
        rideId,
        driverId,
        currentStatus: ride.status,
      });
      throw new ConflictError(
        ErrorCode.INVALID_RIDE_STATE,
        `Ride ${rideId} is not accepting driver assignment (current status: ${ride.status})`,
        { 
          rideId, 
          currentStatus: ride.status, 
          driverId,
          expectedStatus: RideStatus.SEARCHING,
        }
      );
    }

    // Driver availability check
    const isDriverAvailable = await this.driverService.isDriverAvailable(driverId);
    if (!isDriverAvailable) {
      Logger.warn('RideService', 'Driver is not available for ride assignment', {
        rideId,
        driverId,
      });
      throw new ConflictError(
        ErrorCode.DRIVER_ALREADY_BUSY,
        `Driver ${driverId} is not available for ride ${rideId}`,
        { rideId, driverId }
      );
    }

    // CRITICAL: Atomic update with WHERE condition
    // Only update if ride is still in SEARCHING status
    const now = new Date();
    const affectedRows = await this.rideRepository.updateWhere(
      { 
        id: rideId, 
        status: RideStatus.SEARCHING 
      },
      {
        driverId,
        status: RideStatus.DRIVER_ASSIGNED,
        lastStatusUpdate: now,
      }
    );

    // Race condition check: verify if update succeeded
    if (affectedRows === 0) {
      // Update failed - check why
      const latestRide = await this.getRideById(rideId);

      Logger.warn('RideService', 'Driver assignment update failed (race condition detected)', {
        rideId,
        driverId,
        currentStatus: latestRide.status,
        currentDriverId: latestRide.driverId,
      });

      // Ride was already assigned to this driver (idempotent)
      if (latestRide.status === RideStatus.DRIVER_ASSIGNED) {
        if (latestRide.driverId === driverId) {
          Logger.info('RideService', 'Assignment became idempotent after race condition', {
            rideId,
            driverId,
            status: latestRide.status,
          });
          return { changed: false, ride: latestRide };
        }

        // Ride was assigned to a different driver
        throw new ConflictError(
          ErrorCode.RIDE_ALREADY_ASSIGNED,
          `Ride ${rideId} was assigned to another driver (${latestRide.driverId})`,
          {
            rideId,
            driverId,
            currentDriverId: latestRide.driverId,
            currentStatus: latestRide.status,
          }
        );
      }

      // Ride is in some other state (e.g., cancelled)
      throw new ConflictError(
        ErrorCode.INVALID_RIDE_STATE,
        `Ride ${rideId} cannot be assigned because it is now ${latestRide.status}`,
        {
          rideId,
          driverId,
          currentStatus: latestRide.status,
          currentDriverId: latestRide.driverId,
        }
      );
    }

    // Atomic update succeeded - now mark driver as busy
    try {
      await this.driverService.markDriverBusy(driverId, rideId);
      Logger.debug('RideService', 'Driver marked as busy after ride assignment', {
        rideId,
        driverId,
      });
    } catch (error) {
      Logger.error('RideService', 'Failed to mark driver busy after ride assignment', {
        rideId,
        driverId,
        error: error instanceof Error ? error.message : String(error),
      });

      // Rollback the ride assignment
      await this.rideRepository.updateWhere(
        {
          id: rideId,
          driverId,
          status: RideStatus.DRIVER_ASSIGNED,
        },
        {
          driverId: null,
          status: RideStatus.SEARCHING,
          lastStatusUpdate: new Date(),
        }
      );

      throw new ApplicationError(
        ErrorCode.INTERNAL_ERROR,
        'Driver could not be marked as busy. The ride assignment was rolled back.',
        500,
        { rideId, driverId }
      );
    }

    // Update status history
    await this.appendStatus(
      rideId,
      RideStatus.DRIVER_ASSIGNED,
      'driver',
      'Driver accepted ride'
    );

    // Get updated ride and publish event
    const updatedRide = await this.getRideById(rideId);
    await this.publishRideEvent(EventType.DRIVER_ACCEPTED, updatedRide, {
      rideId,
      driverId,
      passengerId: updatedRide.passengerId,
      status: updatedRide.status,
    });

    Logger.info('RideService', 'Driver successfully assigned to ride', {
      rideId,
      driverId,
      status: updatedRide.status,
      version: updatedRide.version,
    });

    return { changed: true, ride: updatedRide };
  }

  async acceptRide(dto: AcceptRideDTO): Promise<RideActionResult> {
    const { rideId, driverId } = dto;
    
    Logger.info('RideService', 'Driver acceptance requested', { 
      rideId, 
      driverId,
      timestamp: new Date().toISOString(),
    });

    // First validation: check ride exists and get current state
    const ride = await this.getRideById(rideId);

    // Idempotency: if driver already accepted this ride, return success
    if (ride.status === RideStatus.DRIVER_ASSIGNED && ride.driverId === driverId) {
      Logger.info('RideService', 'Driver acceptance is idempotent - already assigned', {
        rideId,
        driverId,
        status: ride.status,
      });
      return { changed: false, ride };
    }

    // State validation: ride must be in SEARCHING state
    if (ride.status !== RideStatus.SEARCHING) {
      Logger.warn('RideService', 'Ride not in SEARCHING state for acceptance', {
        rideId,
        driverId,
        currentStatus: ride.status,
      });
      throw new ConflictError(
        ErrorCode.INVALID_RIDE_STATE,
        `Ride ${rideId} is not waiting for driver acceptance (current status: ${ride.status})`,
        { 
          rideId, 
          currentStatus: ride.status, 
          driverId,
          expectedStatus: RideStatus.SEARCHING,
        }
      );
    }

    // Offer validation: driver must have active offer for this ride
    const offeredDriverId = this.requireMatchingAutomation().getOfferedDriverId(rideId);
    if (!offeredDriverId || offeredDriverId !== driverId) {
      Logger.warn('RideService', 'Driver does not have active offer', {
        rideId,
        driverId,
        offeredDriverId,
      });
      throw new ConflictError(
        ErrorCode.INVALID_RIDE_STATE,
        `Driver ${driverId} does not have an active offer for ride ${rideId}`,
        { 
          rideId, 
          driverId, 
          offeredDriverId,
        }
      );
    }

    // Delegate to matching service to handle the acceptance
    // This will ensure atomicity with race condition protection
    try {
      await this.requireMatchingAutomation().handleDriverAccepted(rideId, driverId);
      
      // If we reach here, assignment was successful
      const updatedRide = await this.getRideById(rideId);
      
      Logger.info('RideService', 'Driver acceptance completed successfully', {
        rideId,
        driverId,
        status: updatedRide.status,
        version: updatedRide.version,
        elapsedMs: Date.now(),
      });

      return { changed: true, ride: updatedRide };
    } catch (error) {
      // After failure, check the current state of the ride
      Logger.error('RideService', 'Driver acceptance failed during finalization', {
        rideId,
        driverId,
        error: error instanceof Error ? error.message : String(error),
      });

      if (error instanceof ApplicationError) {
        throw error;
      }

      // Check if ride was assigned to another driver by concurrent process
      const latestRide = await this.getRideById(rideId);
      
      if (latestRide.status === RideStatus.DRIVER_ASSIGNED && latestRide.driverId !== driverId) {
        Logger.warn('RideService', 'Ride was assigned to another driver during our acceptance', {
          rideId,
          attemptedDriverId: driverId,
          actualDriverId: latestRide.driverId,
          status: latestRide.status,
        });
        
        throw new ConflictError(
          ErrorCode.RIDE_ALREADY_ASSIGNED,
          `Ride ${rideId} was accepted by another driver (${latestRide.driverId})`,
          {
            rideId,
            driverId,
            currentDriverId: latestRide.driverId,
            currentStatus: latestRide.status,
          }
        );
      }

      // If we get here, something else went wrong
      throw new ConflictError(
        ErrorCode.INVALID_RIDE_STATE,
        `Ride ${rideId} could not be accepted by driver ${driverId}`,
        { 
          rideId, 
          driverId,
          currentStatus: latestRide.status,
        }
      );
    }
  }

  async startRide(dto: StartRideDTO): Promise<RideActionResult> {
    const { rideId, driverId } = dto;
    Logger.info('RideService', 'Start ride requested', { 
      rideId, 
      driverId,
      timestamp: new Date().toISOString(),
    });

    const existingRide = await this.getRideById(rideId);

    // Idempotency: if already started by same driver, return success
    if (existingRide.status === RideStatus.IN_PROGRESS && existingRide.driverId === driverId) {
      Logger.info('RideService', 'Ride start is idempotent - already in progress', {
        rideId,
        driverId,
        status: existingRide.status,
      });
      return { changed: false, ride: existingRide };
    }

    // Driver assignment validation
    if (existingRide.driverId && existingRide.driverId !== driverId) {
      Logger.warn('RideService', 'Ride assigned to another driver', {
        rideId,
        requestedDriverId: driverId,
        assignedDriverId: existingRide.driverId,
      });
      throw new ConflictError(
        ErrorCode.INVALID_RIDE_STATE,
        `Ride ${rideId} is assigned to another driver (${existingRide.driverId})`,
        {
          rideId,
          driverId,
          currentDriverId: existingRide.driverId,
          currentStatus: existingRide.status,
        }
      );
    }

    // State validation: ride must be in DRIVER_ASSIGNED state
    if (existingRide.status !== RideStatus.DRIVER_ASSIGNED) {
      Logger.warn('RideService', 'Ride not in DRIVER_ASSIGNED state for start', {
        rideId,
        driverId,
        currentStatus: existingRide.status,
        expectedStatus: RideStatus.DRIVER_ASSIGNED,
      });
      throw new ConflictError(
        ErrorCode.INVALID_RIDE_STATE,
        `Ride ${rideId} cannot be started from status ${existingRide.status}`,
        {
          rideId,
          driverId,
          currentStatus: existingRide.status,
          expectedStatus: RideStatus.DRIVER_ASSIGNED,
        }
      );
    }

    // CRITICAL: Atomic update with WHERE conditions
    const now = new Date();
    const affected = await this.rideRepository.updateWhere(
      { 
        id: rideId, 
        driverId, 
        status: RideStatus.DRIVER_ASSIGNED 
      },
      {
        status: RideStatus.IN_PROGRESS,
        startedAt: now,
        lastStatusUpdate: now,
      }
    );

    // Race condition check
    if (affected === 0) {
      const latestRide = await this.getRideById(rideId);

      // Idempotency: already started by same driver
      if (latestRide.status === RideStatus.IN_PROGRESS && latestRide.driverId === driverId) {
        Logger.info('RideService', 'Ride start became idempotent after race condition', {
          rideId,
          driverId,
          status: latestRide.status,
        });
        return { changed: false, ride: latestRide };
      }

      // Different driver assigned
      if (latestRide.driverId && latestRide.driverId !== driverId) {
        Logger.warn('RideService', 'Ride assigned to different driver during start', {
          rideId,
          requestedDriverId: driverId,
          assignedDriverId: latestRide.driverId,
          status: latestRide.status,
        });
      }

      throw new ConflictError(
        ErrorCode.INVALID_RIDE_STATE,
        `Ride ${rideId} cannot be started because it is now ${latestRide.status}`,
        {
          rideId,
          driverId,
          currentStatus: latestRide.status,
          currentDriverId: latestRide.driverId,
        }
      );
    }

    // Update status history
    await this.appendStatus(rideId, RideStatus.IN_PROGRESS, 'driver', 'Ride started');

    // Get updated ride and publish event
    const ride = await this.getRideById(rideId);
    await this.publishRideEvent(EventType.RIDE_STARTED, ride, {
      rideId,
      driverId,
      passengerId: ride.passengerId,
      status: ride.status,
    });

    Logger.info('RideService', 'Ride started successfully', {
      rideId,
      driverId,
      status: ride.status,
      version: ride.version,
      startedAt: ride.startedAt?.toISOString(),
    });

    return { changed: true, ride };
  }

  async finishRide(dto: FinishRideDTO): Promise<RideActionResult> {
    const { rideId, driverId } = dto;
    Logger.info('RideService', 'Finish ride requested', { 
      rideId, 
      driverId,
      timestamp: new Date().toISOString(),
    });

    const existingRide = await this.getRideById(rideId);

    // Idempotency: if already completed by same driver, return success
    if (existingRide.status === RideStatus.COMPLETED && existingRide.driverId === driverId) {
      Logger.info('RideService', 'Ride finish is idempotent - already completed', {
        rideId,
        driverId,
        status: existingRide.status,
      });
      return { changed: false, ride: existingRide };
    }

    // Driver assignment validation
    if (existingRide.driverId && existingRide.driverId !== driverId) {
      Logger.warn('RideService', 'Ride assigned to another driver', {
        rideId,
        requestedDriverId: driverId,
        assignedDriverId: existingRide.driverId,
      });
      throw new ConflictError(
        ErrorCode.INVALID_RIDE_STATE,
        `Ride ${rideId} is assigned to another driver (${existingRide.driverId})`,
        {
          rideId,
          driverId,
          currentDriverId: existingRide.driverId,
          currentStatus: existingRide.status,
        }
      );
    }

    // State validation: ride must be in IN_PROGRESS state
    if (existingRide.status !== RideStatus.IN_PROGRESS) {
      Logger.warn('RideService', 'Ride not in IN_PROGRESS state for finish', {
        rideId,
        driverId,
        currentStatus: existingRide.status,
        expectedStatus: RideStatus.IN_PROGRESS,
      });
      throw new ConflictError(
        ErrorCode.INVALID_RIDE_STATE,
        `Ride ${rideId} cannot be finished from status ${existingRide.status}`,
        {
          rideId,
          driverId,
          currentStatus: existingRide.status,
          expectedStatus: RideStatus.IN_PROGRESS,
        }
      );
    }

    // CRITICAL: Atomic update with WHERE conditions
    const now = new Date();
    const affected = await this.rideRepository.updateWhere(
      { 
        id: rideId, 
        driverId, 
        status: RideStatus.IN_PROGRESS 
      },
      {
        status: RideStatus.COMPLETED,
        finishedAt: now,
        lastStatusUpdate: now,
      }
    );

    // Race condition check
    if (affected === 0) {
      const latestRide = await this.getRideById(rideId);

      // Idempotency: already completed by same driver
      if (latestRide.status === RideStatus.COMPLETED && latestRide.driverId === driverId) {
        Logger.info('RideService', 'Ride finish became idempotent after race condition', {
          rideId,
          driverId,
          status: latestRide.status,
        });
        return { changed: false, ride: latestRide };
      }

      // Different driver assigned
      if (latestRide.driverId && latestRide.driverId !== driverId) {
        Logger.warn('RideService', 'Ride assigned to different driver during finish', {
          rideId,
          requestedDriverId: driverId,
          assignedDriverId: latestRide.driverId,
          status: latestRide.status,
        });
      }

      throw new ConflictError(
        ErrorCode.INVALID_RIDE_STATE,
        `Ride ${rideId} cannot be finished because it is now ${latestRide.status}`,
        {
          rideId,
          driverId,
          currentStatus: latestRide.status,
          currentDriverId: latestRide.driverId,
        }
      );
    }

    // Update status history
    await this.appendStatus(rideId, RideStatus.COMPLETED, 'driver', 'Ride finished');

    // Release driver from ride
    try {
      await this.driverService.releaseDriverFromRide(driverId);
      Logger.debug('RideService', 'Driver released from ride', { rideId, driverId });
    } catch (error) {
      Logger.error('RideService', 'Failed to release driver from ride', {
        rideId,
        driverId,
        error: error instanceof Error ? error.message : String(error),
      });
      // Continue with ride completion even if driver release fails
    }

    // Get updated ride and publish event
    const ride = await this.getRideById(rideId);
    await this.publishRideEvent(EventType.RIDE_COMPLETED, ride, {
      rideId,
      driverId,
      passengerId: ride.passengerId,
      status: ride.status,
    });

    Logger.info('RideService', 'Ride finished successfully', {
      rideId,
      driverId,
      status: ride.status,
      version: ride.version,
      finishedAt: ride.finishedAt?.toISOString(),
      durationSeconds: ride.startedAt ? Math.round((now.getTime() - ride.startedAt.getTime()) / 1000) : undefined,
    });

    return { changed: true, ride };
  }

  async cancelRide(dto: CancelRideDTO): Promise<RideActionResult> {
    const { rideId, cancelledBy, reason } = dto;
    return this.cancelRideSafely(rideId, reason ?? '', { cancelledBy });
  }

  async cancelRideSafely(
    rideId: string,
    reason: string,
    options: {
      cancelledBy?: CancelRideDTO['cancelledBy'];
      driverId?: string | null;
    } = {}
  ): Promise<RideActionResult> {
    const cancelledBy = options.cancelledBy ?? 'system';
    const normalizedReason = reason.trim();

    Logger.info('RideService', 'Cancel ride requested', {
      rideId,
      cancelledBy,
      reason: normalizedReason || null,
      timestamp: new Date().toISOString(),
    });

    try {
      // Get current ride state
      const ride = await this.getRideById(rideId);
      const offeredDriverId = this.matchingAutomationService?.getOfferedDriverId(rideId);
      const userId =
        cancelledBy === 'passenger'
          ? ride.passengerId
          : cancelledBy === 'driver'
            ? ride.driverId
            : undefined;

      Logger.debug('RideService', 'Cancel ride current state loaded', {
        rideId,
        userId,
        cancelledBy,
        currentStatus: ride.status,
        version: ride.version,
      });

      // State validation: cannot cancel completed rides
      if (ride.status === RideStatus.COMPLETED) {
        Logger.warn('RideService', 'Cannot cancel completed ride', {
          rideId,
          userId,
          cancelledBy,
          status: ride.status,
        });
        throw new ConflictError(
          ErrorCode.INVALID_RIDE_STATE,
          `Ride ${rideId} is already completed and cannot be cancelled`,
          { rideId, userId, currentStatus: ride.status }
        );
      }

      // Idempotency: if already cancelled, return success
      if (ride.status === RideStatus.CANCELLED) {
        this.matchingAutomationService?.cancelAutomation(rideId, 'ride_already_cancelled');

        Logger.info('RideService', 'Ride cancellation is idempotent - already cancelled', {
          rideId,
          userId,
          cancelledBy,
          status: ride.status,
          version: ride.version,
        });

        return { changed: false, ride };
      }

      // CRITICAL: Atomic update with WHERE condition (protection against double cancellation)
      const now = new Date();
      const cancelReason = normalizedReason || ride.cancelReason || null;
      const affected = await this.rideRepository.updateWhere(
        {
          id: rideId,
          statusNotIn: [RideStatus.COMPLETED, RideStatus.CANCELLED],
        },
        {
          status: RideStatus.CANCELLED,
          cancelledAt: now,
          cancelReason,
          lastStatusUpdate: now,
        }
      );

      // Race condition check
      if (affected === 0) {
        const latestRide = await this.getRideById(rideId);

        // Already cancelled (idempotent)
        if (latestRide.status === RideStatus.CANCELLED) {
          this.matchingAutomationService?.cancelAutomation(rideId, 'ride_already_cancelled');

          Logger.info('RideService', 'Ride cancellation became idempotent after race condition', {
            rideId,
            userId,
            cancelledBy,
            status: latestRide.status,
            version: latestRide.version,
          });

          return { changed: false, ride: latestRide };
        }

        // Already completed
        if (latestRide.status === RideStatus.COMPLETED) {
          Logger.warn('RideService', 'Ride was completed during cancellation', {
            rideId,
            userId,
            cancelledBy,
            status: latestRide.status,
          });
          throw new ConflictError(
            ErrorCode.INVALID_RIDE_STATE,
            `Ride ${rideId} is already completed`,
            { rideId, userId, currentStatus: latestRide.status }
          );
        }

        throw new ConflictError(
          ErrorCode.INVALID_RIDE_STATE,
          `Ride ${rideId} could not be cancelled because its state changed`,
          {
            rideId,
            userId,
            currentStatus: latestRide.status,
            currentDriverId: latestRide.driverId,
          }
        );
      }

      // Update status history
      await this.appendStatus(rideId, RideStatus.CANCELLED, cancelledBy, cancelReason ?? undefined);

      // Release driver if assigned
      if (ride.driverId) {
        try {
          await this.driverService.releaseDriverFromRide(ride.driverId);
          Logger.debug('RideService', 'Driver released due to ride cancellation', {
            rideId,
            driverId: ride.driverId,
          });
        } catch (error) {
          Logger.error('RideService', 'Failed to release driver during cancellation', {
            rideId,
            driverId: ride.driverId,
            error: error instanceof Error ? error.message : String(error),
          });
          // Continue with cancellation even if driver release fails
        }
      }

      // Cancel matching automation
      this.matchingAutomationService?.cancelAutomation(rideId, 'ride_cancelled');

      // Get updated ride and publish event
      const cancelledRide = await this.getRideById(rideId);
      await this.publishRideEvent(EventType.RIDE_CANCELLED, cancelledRide, {
        rideId,
        passengerId: ride.passengerId,
        driverId: ride.driverId ?? offeredDriverId ?? options.driverId ?? null,
        cancelledBy,
        reason: cancelReason,
        cancelReason,
        status: cancelledRide.status,
      });

      Logger.info('RideService', 'Ride cancelled successfully', {
        rideId,
        userId,
        cancelledBy,
        reason: normalizedReason || null,
        status: cancelledRide.status,
        version: cancelledRide.version,
        cancelledAt: now.toISOString(),
      });

      return { changed: true, ride: cancelledRide };
    } catch (error) {
      Logger.error('RideService', 'Cancel ride failed', {
        rideId,
        cancelledBy,
        reason: normalizedReason || null,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });

      if (error instanceof ApplicationError) {
        throw error;
      }

      throw new ApplicationError(
        ErrorCode.INTERNAL_ERROR,
        'Unable to cancel ride right now. Please try again.',
        500,
        { rideId, cancelledBy }
      );
    }
  }

  async listRidesByPassenger(passengerId: string): Promise<Ride[]> {
    return this.rideRepository.findByPassengerId(passengerId);
  }

  async listRidesByDriver(driverId: string): Promise<Ride[]> {
    return this.rideRepository.findByDriverId(driverId);
  }

  async listActiveRides(): Promise<Ride[]> {
    return this.rideRepository.findActiveRides();
  }

  async getLiveRideDataForDriver(rideId: string): Promise<LiveRideData | null> {
    return this.getLiveRideData(rideId);
  }

  async getLiveRideData(rideId: string): Promise<LiveRideData | null> {
    const ride = await this.getRideById(rideId);
    const distanceToPassengerMeters =
      ride.driverLocation != null
        ? DistanceCalculator.calculateDistanceMeters(
            ride.driverLocation.latitude,
            ride.driverLocation.longitude,
            ride.pickupLocation.latitude,
            ride.pickupLocation.longitude
          )
        : undefined;

    const etaToPassengerSeconds =
      distanceToPassengerMeters != null
        ? DistanceCalculator.estimateETA(distanceToPassengerMeters / 1000)
        : undefined;

    return {
      rideId: ride.id,
      status: ride.status,
      passengerId: ride.passengerId,
      driverId: ride.driverId,
      pickupLocation: ride.pickupLocation,
      dropoffLocation: ride.dropoffLocation,
      driverLocation: ride.driverLocation,
      distanceToPassengerMeters,
      etaToPassengerSeconds,
      lastUpdate: ride.lastStatusUpdate || ride.createdAt,
    };
  }

  async appendStatus(
    rideId: string,
    status: RideStatus,
    changedBy: string,
    reason?: string
  ): Promise<void> {
    const statusChange: RideStatusChange = {
      status,
      timestamp: new Date(),
      changedBy,
      reason,
    };

    await this.rideRepository.appendStatusHistory(rideId, statusChange);
  }

  private async publishRideEvent(
    type: EventType,
    ride: Ride,
    data: Record<string, unknown>
  ): Promise<void> {
    await this.eventPublisher.publish({
      id: uuidv4(),
      type,
      aggregateId: ride.id,
      aggregateType: 'ride',
      timestamp: new Date(),
      data,
    });
  }

  private requireMatchingAutomation(): MatchingAutomationCoordinator {
    if (!this.matchingAutomationService) {
      throw new ApplicationError(
        ErrorCode.INTERNAL_ERROR,
        'Matching automation service is not configured.',
        500
      );
    }

    return this.matchingAutomationService;
  }
}
