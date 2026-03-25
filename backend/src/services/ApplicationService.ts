/**
 * Application Service
 * Composes domain services and cross-cutting infrastructure.
 */

import {
  IDriverRepository,
  IDriverStatusRepository,
  ILocationRepository,
  IRideRepository,
  IUserRepository,
} from '../repositories/IRepository';
import { EventPublisher } from '../events/EventPublisher';
import { JobScheduler } from '../jobs/JobScheduler';
import { TimeoutManager } from '../jobs/TimeoutManager';
import { RealtimeService } from '../realtime/RealtimeService';
import { Logger } from '../utils/Logger';
import { DriverService } from './DriverService';
import { MatchingAutomationService } from './MatchingAutomationService';
import { MatchingService } from './MatchingService';
import { RideService } from './RideService';
import { UserService } from './UserService';

export class ApplicationService {
  public userService: UserService;
  public driverService: DriverService;
  public rideService: RideService;
  public matchingService: MatchingService;
  public matchingAutomationService: MatchingAutomationService;
  public jobScheduler: JobScheduler;
  public timeoutManager: TimeoutManager;
  public realtimeService: RealtimeService;

  constructor(
    userRepository: IUserRepository,
    driverRepository: IDriverRepository,
    rideRepository: IRideRepository,
    locationRepository: ILocationRepository,
    driverStatusRepository: IDriverStatusRepository,
    eventPublisher: EventPublisher
  ) {
    Logger.info('ApplicationService', 'Initializing application services');

    this.realtimeService = new RealtimeService();
    this.jobScheduler = new JobScheduler(5, 60000);
    this.timeoutManager = new TimeoutManager(
      parseInt(process.env.TIMEOUT_CLEANUP_INTERVAL_MS || '60000')
    );

    this.userService = new UserService(userRepository);
    this.matchingService = new MatchingService(driverRepository, locationRepository);

    this.driverService = new DriverService(
      driverRepository,
      driverStatusRepository,
      locationRepository,
      rideRepository,
      eventPublisher
    );

    this.rideService = new RideService(
      rideRepository,
      userRepository,
      eventPublisher,
      this.driverService,
      this.matchingService
    );

    this.matchingAutomationService = new MatchingAutomationService(
      {
        eventPublisher,
        rideService: this.rideService,
        matchingService: this.matchingService,
      },
      {
        enabled: process.env.MATCHING_AUTOMATION_ENABLED !== 'false',
        backoffMs: [
          parseInt(process.env.MATCHING_BACKOFF_FIRST_MS || '2000'),
          parseInt(process.env.MATCHING_BACKOFF_SECOND_MS || '5000'),
          parseInt(process.env.MATCHING_BACKOFF_THIRD_MS || '10000'),
        ],
        maxAttempts: parseInt(process.env.MATCHING_MAX_ATTEMPTS || '4'),
        offerTimeoutMs: parseInt(process.env.MATCHING_DRIVER_OFFER_TIMEOUT_MS || '10000'),
        matchingTimeoutMs: parseInt(process.env.MATCHING_TIMEOUT_MS || '30000'),
        initialRadiusKm: parseInt(process.env.MATCHING_INITIAL_RADIUS_KM || '3'),
        expandRadiusKmPerAttempt: parseInt(process.env.MATCHING_EXPAND_RADIUS_KM || '2'),
        maxRadiusKm: parseInt(process.env.MATCHING_MAX_RADIUS_KM || '15'),
        candidateBatchSize: parseInt(process.env.MATCHING_CANDIDATE_BATCH_SIZE || '5'),
        maxLocationAgeMs: parseInt(process.env.MATCHING_MAX_LOCATION_AGE_MS || '30000'),
      }
    );

    this.rideService.setMatchingAutomationService(this.matchingAutomationService);

    Logger.info('ApplicationService', 'All services initialized successfully');
  }

  async destroy(): Promise<void> {
    Logger.info('ApplicationService', 'Destroying services');
    await this.jobScheduler.destroy();
    await this.timeoutManager.destroy();
  }
}
