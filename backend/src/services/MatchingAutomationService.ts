import { v4 as uuidv4 } from 'uuid';
import { EventPublisher } from '../events/EventPublisher';
import { EventType } from '../models/Events';
import {
  AutomationConfig,
  MatchingAttempt,
  MatchingAutomationState,
} from '../models/Matching';
import { Ride, RideStatus } from '../models/Ride';
import { Logger } from '../utils/Logger';

interface MatchingAutomationRidePort {
  getRideById(rideId: string): Promise<Ride>;
  assignDriverToRide(rideId: string, driverId: string): Promise<unknown>;
  cancelRideSafely(rideId: string, reason: string): Promise<unknown>;
}

export interface MatchingAutomationServiceDeps {
  eventPublisher: EventPublisher;
  rideService: MatchingAutomationRidePort;
  matchingService: {
    findCandidates(
      criteria: {
        passengerLatitude: number;
        passengerLongitude: number;
        maxRadiusKm: number;
        excludedDriverIds?: string[];
        maxLocationAgeSeconds?: number;
      },
      limit?: number
    ): Promise<Array<{ driverId: string; distance: number; eta: number; score: number }>>;
  };
}

type MatchingSession = MatchingAutomationState & {
  retryTimer?: NodeJS.Timeout;
  offerTimer?: NodeJS.Timeout;
};

type TimeoutControl = {
  timeoutId: NodeJS.Timeout;
  createdAt: Date;
};

const DEFAULT_CONFIG: AutomationConfig = {
  enabled: true,
  backoffMs: [2000, 5000, 10000],
  maxAttempts: 4,
  offerTimeoutMs: 10000,
  matchingTimeoutMs: 30000,
  initialRadiusKm: 3,
  expandRadiusKmPerAttempt: 2,
  maxRadiusKm: 15,
  candidateBatchSize: 5,
  maxLocationAgeMs: 30000,
};

export class MatchingAutomationService {
  private sessions = new Map<string, MatchingSession>();
  private timeoutControls = new Map<string, TimeoutControl>();
  private config: AutomationConfig;

  constructor(
    private deps: MatchingAutomationServiceDeps,
    config?: Partial<AutomationConfig>
  ) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
    };

    Logger.info('MatchingAutomationService', 'Matching automation initialized', {
      config: this.config,
    });
  }

  async startAutomation(
    rideId: string,
    passengerId: string,
    initialRadiusKm?: number
  ): Promise<void> {
    if (!this.config.enabled) {
      Logger.warn('MatchingAutomationService', 'Matching automation is disabled', { rideId });
      return;
    }

    const existing = this.sessions.get(rideId);
    if (existing && ['SEARCHING', 'WAITING_DRIVER'].includes(existing.status)) {
      this.logBusiness('Matching already in progress', existing, {
        rideId,
        reused: true,
        attempt: existing.currentAttempt,
        elapsedMs: this.getElapsedMs(existing),
        status: existing.status,
      });
      return;
    }

    // Clean up any stale session before starting new one
    if (existing) {
      this.cleanupSession(rideId, 'restart_before_new_session');
    }

    const session: MatchingSession = {
      rideId,
      passengerId,
      currentAttempt: 0,
      currentRadiusKm: Math.min(
        initialRadiusKm ?? this.config.initialRadiusKm,
        this.config.maxRadiusKm
      ),
      offeredDriverIds: new Set<string>(),
      rejectedDriverIds: new Set<string>(),
      pendingCandidateIds: [],
      searchDeadline: new Date(Date.now() + this.config.matchingTimeoutMs),
      status: 'SEARCHING',
      createdAt: new Date(),
    };

    this.sessions.set(rideId, session);
    this.scheduleSearchTimeout(session);

    this.logBusiness('Matching automation started', session, {
      rideId,
      passengerId,
      initialRadiusKm: session.currentRadiusKm,
      matchingTimeoutMs: this.config.matchingTimeoutMs,
      maxRadiusKm: this.config.maxRadiusKm,
      maxAttempts: this.config.maxAttempts,
    });

    await this.deps.eventPublisher.publish({
      id: uuidv4(),
      type: EventType.MATCHING_STARTED,
      aggregateId: rideId,
      aggregateType: 'ride',
      timestamp: new Date(),
      data: {
        rideId,
        passengerId,
      },
    });

    try {
      await this.runAttempt(rideId, 'initial_dispatch');
    } catch (error) {
      Logger.error('MatchingAutomationService', 'Error during initial matching attempt', {
        rideId,
        error: error instanceof Error ? error.message : String(error),
      });
      this.cleanupSession(rideId, 'unexpected_start_error');
      throw error;
    }
  }

  getOfferedDriverId(rideId: string): string | undefined {
    return this.sessions.get(rideId)?.offeredDriverId;
  }

  cancelAutomation(rideId: string, reason: string): void {
    this.cleanupSession(rideId, reason);
  }

  async handleDriverAccepted(rideId: string, driverId: string): Promise<void> {
    const session = this.requireSession(rideId);

    // CRITICAL: Verify driver has active offer for this ride
    if (session.offeredDriverId !== driverId) {
      Logger.warn('MatchingAutomationService', 'Driver accepted without active offer', {
        rideId,
        driverId,
        offeredDriverId: session.offeredDriverId,
      });
      throw new Error(
        `Driver ${driverId} does not have an active offer for ride ${rideId}`
      );
    }

    // Prevent race conditions by marking session as matched immediately
    const previousStatus = session.status;
    session.status = 'MATCHED';

    // Clear all timers immediately
    this.clearOfferTimer(session);
    this.clearRetryTimer(session);
    this.clearSearchTimeout(rideId);

    this.logBusiness('Driver acceptance started', session, {
      rideId,
      driverId,
      attempt: session.currentAttempt,
      elapsedMs: this.getElapsedMs(session),
      previousStatus,
    });

    try {
      // This call must be atomic with race condition protection
      await this.deps.rideService.assignDriverToRide(rideId, driverId);

      this.logBusiness('Driver successfully assigned to ride', session, {
        rideId,
        driverId,
        attempt: session.currentAttempt,
        elapsedMs: this.getElapsedMs(session),
      });

      this.cleanupSession(rideId, 'driver_accepted_success');
    } catch (error) {
      // Check if the ride is still in a valid state
      const ride = await this.safeGetRide(rideId);
      
      if (ride && ride.status !== RideStatus.SEARCHING) {
        // Ride has been moved to another state (probably by another process)
        this.logBusiness('Ride closed during driver acceptance', session, {
          rideId,
          driverId,
          attempt: session.currentAttempt,
          elapsedMs: this.getElapsedMs(session),
          currentStatus: ride.status,
          error: error instanceof Error ? error.message : String(error),
        });

        this.cleanupSession(rideId, 'ride_closed_during_accept');
        throw error;
      }

      // Ride is still in SEARCHING state, so we can retry
      Logger.warn('MatchingAutomationService', 'Failed to finalize driver acceptance', {
        rideId,
        driverId,
        attempt: session.currentAttempt,
        elapsedMs: this.getElapsedMs(session),
        error: error instanceof Error ? error.message : String(error),
      });

      session.status = 'SEARCHING';
      session.offeredDriverId = undefined;
      session.rejectedDriverIds.add(driverId);

      this.scheduleNextAttempt(session, 'driver_accept_finalize_failed');
      throw error;
    }
  }

  async handleDriverRejected(
    rideId: string,
    driverId: string,
    reason: string = 'driver_rejected'
  ): Promise<void> {
    const session = this.sessions.get(rideId);
    if (!session) {
      Logger.warn('MatchingAutomationService', 'Driver rejected without active session', {
        rideId,
        driverId,
      });
      return;
    }

    if (session.offeredDriverId !== driverId) {
      Logger.warn('MatchingAutomationService', 'Ignoring rejection for stale offer', {
        rideId,
        driverId,
        offeredDriverId: session.offeredDriverId,
      });
      return;
    }

    session.rejectedDriverIds.add(driverId);
    session.offeredDriverId = undefined;
    session.status = 'SEARCHING';
    this.clearOfferTimer(session);

    await this.deps.eventPublisher.publish({
      id: uuidv4(),
      type: EventType.DRIVER_REJECTED,
      aggregateId: rideId,
      aggregateType: 'ride',
      timestamp: new Date(),
      data: {
        rideId,
        driverId,
        reason,
        attemptNumber: session.currentAttempt,
      },
    });

    this.logBusiness('Driver rejected offer', session, {
      rideId,
      driverId,
      attempt: session.currentAttempt,
      elapsedMs: this.getElapsedMs(session),
      reason,
    });

    if (session.pendingCandidateIds.length > 0) {
      await this.offerNextDriver(session);
      return;
    }

    this.scheduleNextAttempt(session, reason);
  }

  private async runAttempt(rideId: string, trigger: string): Promise<void> {
    const session = this.sessions.get(rideId);
    if (!session) {
      Logger.debug('MatchingAutomationService', 'Attempt scheduled for non-existent session', {
        rideId,
        trigger,
      });
      return;
    }

    // Check if overall deadline exceeded
    if (Date.now() >= session.searchDeadline.getTime()) {
      this.logBusiness('Overall search deadline exceeded', session, {
        rideId,
        attempt: session.currentAttempt,
        elapsedMs: this.getElapsedMs(session),
        trigger,
      });
      await this.handleSearchTimeout(rideId, 'overall_deadline_exceeded');
      return;
    }

    // Check if max attempts exceeded
    if (session.currentAttempt >= this.config.maxAttempts) {
      this.logBusiness('Maximum attempts exceeded', session, {
        rideId,
        attempt: session.currentAttempt,
        maxAttempts: this.config.maxAttempts,
        elapsedMs: this.getElapsedMs(session),
        trigger,
      });
      await this.handleSearchTimeout(rideId, 'max_attempts_exceeded');
      return;
    }

    session.currentAttempt += 1;
    session.lastAttemptAt = new Date();
    session.currentRadiusKm = Math.min(
      this.config.initialRadiusKm +
        (session.currentAttempt - 1) * this.config.expandRadiusKmPerAttempt,
      this.config.maxRadiusKm
    );
    session.status = 'SEARCHING';
    session.offeredDriverId = undefined;
    session.pendingCandidateIds = [];
    this.clearRetryTimer(session);

    const ride = await this.ensureRideStillSearchable(rideId);
    if (!ride) {
      this.logBusiness('Ride no longer in SEARCHING state', session, {
        rideId,
        attempt: session.currentAttempt,
        elapsedMs: this.getElapsedMs(session),
        trigger,
      });
      this.cleanupSession(rideId, 'ride_not_searching_at_attempt');
      return;
    }

    Logger.info('MatchingAutomationService', 'Starting matching attempt', {
      rideId,
      attempt: session.currentAttempt,
      elapsedMs: this.getElapsedMs(session),
      radiusKm: session.currentRadiusKm,
      trigger,
    });

    try {
      const candidates = await this.deps.matchingService.findCandidates(
        {
          passengerLatitude: ride.pickupLocation.latitude,
          passengerLongitude: ride.pickupLocation.longitude,
          maxRadiusKm: session.currentRadiusKm,
          excludedDriverIds: Array.from(
            new Set([...session.offeredDriverIds, ...session.rejectedDriverIds])
          ),
          maxLocationAgeSeconds: Math.round(this.config.maxLocationAgeMs / 1000),
        },
        this.config.candidateBatchSize
      );

      this.logBusiness('Candidates found in matching attempt', session, {
        rideId,
        attempt: session.currentAttempt,
        candidateCount: candidates.length,
        radiusKm: session.currentRadiusKm,
        elapsedMs: this.getElapsedMs(session),
        trigger,
      });

      await this.deps.eventPublisher.publish({
        id: uuidv4(),
        type: EventType.MATCHING_ATTEMPT,
        aggregateId: rideId,
        aggregateType: 'ride',
        timestamp: new Date(),
        data: {
          rideId,
          attemptNumber: session.currentAttempt,
          candidateCount: candidates.length,
          radiusKm: session.currentRadiusKm,
          trigger,
        },
      });

      if (candidates.length === 0) {
        this.logBusiness('No drivers available in this attempt', session, {
          rideId,
          attempt: session.currentAttempt,
          elapsedMs: this.getElapsedMs(session),
          radiusKm: session.currentRadiusKm,
          offeredCount: session.offeredDriverIds.size,
          rejectedCount: session.rejectedDriverIds.size,
        });

        this.scheduleNextAttempt(session, 'no_candidates_found');
        return;
      }

      session.pendingCandidateIds = candidates.map((candidate) => candidate.driverId);
      await this.offerNextDriver(session);
    } catch (error) {
      Logger.error('MatchingAutomationService', 'Error in matching attempt', {
        rideId,
        attempt: session.currentAttempt,
        elapsedMs: this.getElapsedMs(session),
        radiusKm: session.currentRadiusKm,
        trigger,
        error: error instanceof Error ? error.message : String(error),
      });

      if (session.currentAttempt >= this.config.maxAttempts) {
        await this.handleSearchTimeout(rideId, 'matching_attempt_error');
        return;
      }

      this.scheduleNextAttempt(session, 'attempt_error');
    }
  }

  private async offerNextDriver(session: MatchingSession): Promise<void> {
    const nextDriverId = session.pendingCandidateIds.shift();
    if (!nextDriverId) {
      this.logBusiness('No more candidates available', session, {
        rideId: session.rideId,
        attempt: session.currentAttempt,
        elapsedMs: this.getElapsedMs(session),
      });
      this.scheduleNextAttempt(session, 'candidate_pool_exhausted');
      return;
    }

    const ride = await this.ensureRideStillSearchable(session.rideId);
    if (!ride) {
      this.logBusiness('Ride no longer searchable during offer', session, {
        rideId: session.rideId,
        attempt: session.currentAttempt,
        elapsedMs: this.getElapsedMs(session),
      });
      this.cleanupSession(session.rideId, 'ride_not_searching_during_offer');
      return;
    }

    session.offeredDriverId = nextDriverId;
    session.offeredDriverIds.add(nextDriverId);
    session.status = 'WAITING_DRIVER';

    this.logBusiness('Driver selected for offer', session, {
      rideId: session.rideId,
      driverId: nextDriverId,
      attempt: session.currentAttempt,
      elapsedMs: this.getElapsedMs(session),
      remainingCandidates: session.pendingCandidateIds.length,
      totalOffered: session.offeredDriverIds.size,
      offerTimeoutMs: this.config.offerTimeoutMs,
    });

    await this.deps.eventPublisher.publish({
      id: uuidv4(),
      type: EventType.DRIVER_FOUND,
      aggregateId: session.rideId,
      aggregateType: 'ride',
      timestamp: new Date(),
      data: {
        rideId: session.rideId,
        driverId: nextDriverId,
        attemptNumber: session.currentAttempt,
        radiusKm: session.currentRadiusKm,
        offerExpiresInMs: this.config.offerTimeoutMs,
      },
    });

    // CRITICAL: Clear any existing offer timer before creating a new one
    this.clearOfferTimer(session);
    session.offerTimer = setTimeout(() => {
      this.handleOfferTimeout(session.rideId, nextDriverId).catch((error) => {
        this.logAsyncFailure('offer_timeout_handler', session.rideId, error);
      });
    }, this.config.offerTimeoutMs);
  }

  private scheduleNextAttempt(session: MatchingSession, reason: string): void {
    if (!this.sessions.has(session.rideId)) {
      return;
    }

    if (Date.now() >= session.searchDeadline.getTime()) {
      void this.handleSearchTimeout(session.rideId, 'no_drivers_available');
      return;
    }

    if (session.currentAttempt >= this.config.maxAttempts) {
      void this.handleSearchTimeout(session.rideId, 'no_drivers_available');
      return;
    }

    const delayMs = this.resolveBackoffMs(session.currentAttempt);
    const remainingMs = session.searchDeadline.getTime() - Date.now();
    const boundedDelayMs = Math.min(delayMs, Math.max(remainingMs, 0));

    if (boundedDelayMs <= 0) {
      void this.handleSearchTimeout(session.rideId, 'no_drivers_available');
      return;
    }

    session.status = 'SEARCHING';
    session.nextRetryAt = new Date(Date.now() + boundedDelayMs);
    this.clearRetryTimer(session);

    Logger.info('MatchingAutomationService', 'Matching retry scheduled', {
      rideId: session.rideId,
      attempt: session.currentAttempt + 1,
      elapsedMs: this.getElapsedMs(session),
      delayMs: boundedDelayMs,
      reason,
      nextRetryAt: session.nextRetryAt.toISOString(),
    });

    session.retryTimer = setTimeout(() => {
      this.runAttempt(session.rideId, reason).catch((error) => {
        this.logAsyncFailure('retry_attempt', session.rideId, error);
      });
    }, boundedDelayMs);
  }

  private scheduleSearchTimeout(session: MatchingSession): void {
    // CRITICAL: Clear any existing timeout for this ride to prevent duplicates
    this.clearSearchTimeout(session.rideId);

    const remainingMs = session.searchDeadline.getTime() - Date.now();

    if (remainingMs <= 0) {
      Logger.warn('MatchingAutomationService', 'Search timeout already exceeded', {
        rideId: session.rideId,
        deadlineAt: session.searchDeadline.toISOString(),
      });
      return;
    }

    const timeoutId = setTimeout(() => {
      this.handleSearchTimeout(session.rideId, 'search_timeout').catch((error) => {
        this.logAsyncFailure('search_timeout', session.rideId, error);
      });
    }, remainingMs);

    this.timeoutControls.set(session.rideId, {
      timeoutId,
      createdAt: new Date(),
    });

    Logger.debug('MatchingAutomationService', 'Search timeout scheduled', {
      rideId: session.rideId,
      timeoutMs: remainingMs,
      deadlineAt: session.searchDeadline.toISOString(),
    });
  }

  private async handleOfferTimeout(rideId: string, driverId: string): Promise<void> {
    const session = this.sessions.get(rideId);
    if (!session) {
      Logger.debug('MatchingAutomationService', 'Offer timeout for non-existent session', {
        rideId,
        driverId,
      });
      return;
    }

    // Safety: Only process if offer is still active for this driver
    if (session.offeredDriverId !== driverId) {
      Logger.debug('MatchingAutomationService', 'Offer timeout for stale driver offer', {
        rideId,
        driverId,
        currentOfferedDriverId: session.offeredDriverId,
      });
      return;
    }

    this.logBusiness('Driver offer timeout', session, {
      rideId,
      driverId,
      attempt: session.currentAttempt,
      elapsedMs: this.getElapsedMs(session),
      offerTimeoutMs: this.config.offerTimeoutMs,
    });

    await this.deps.eventPublisher.publish({
      id: uuidv4(),
      type: EventType.DRIVER_ACCEPT_TIMEOUT,
      aggregateId: rideId,
      aggregateType: 'ride',
      timestamp: new Date(),
      data: {
        rideId,
        driverId,
        attemptNumber: session.currentAttempt,
        reason: 'offer_timeout',
      },
    });

    // Reject this driver and move to next candidate
    await this.handleDriverRejected(rideId, driverId, 'driver_offer_timeout');
  }

  private async handleSearchTimeout(rideId: string, reason: string): Promise<void> {
    const session = this.sessions.get(rideId);
    if (!session) {
      Logger.debug('MatchingAutomationService', 'Search timeout for non-existent session', {
        rideId,
        reason,
      });
      return;
    }

    // CRITICAL: Prevent multiple timeouts from processing the same ride
    if (['TIMED_OUT', 'CANCELLED', 'MATCHED'].includes(session.status)) {
      Logger.debug('MatchingAutomationService', 'Search timeout already processed', {
        rideId,
        reason,
        status: session.status,
      });
      return;
    }

    // Atomically mark as timed out to prevent concurrent handlers
    const previousStatus = session.status;
    session.status = 'TIMED_OUT';

    // Clear all timers immediately
    this.clearRetryTimer(session);
    this.clearOfferTimer(session);
    this.clearSearchTimeout(rideId);

    this.logBusiness('Matching timeout reached', session, {
      rideId,
      attempt: session.currentAttempt,
      elapsedMs: this.getElapsedMs(session),
      driverId: session.offeredDriverId,
      reason,
      fromStatus: previousStatus,
    });

    await this.deps.eventPublisher.publish({
      id: uuidv4(),
      type: EventType.MATCHING_TIMEOUT,
      aggregateId: rideId,
      aggregateType: 'ride',
      timestamp: new Date(),
      data: {
        rideId,
        reason,
        attemptCount: session.currentAttempt,
        driverId: session.offeredDriverId,
      },
    });

    // Ensure ride is cancelled and session is fully cleaned up
    try {
      await this.deps.rideService.cancelRideSafely(rideId, reason);
    } catch (error) {
      Logger.error('MatchingAutomationService', 'Failed to cancel ride during timeout', {
        rideId,
        reason,
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      // CRITICAL: Always cleanup the session, even if cancellation fails
      this.cleanupSession(rideId, `timeout_completed_${reason}`);
    }
  }

  private async ensureRideStillSearchable(rideId: string): Promise<Ride | null> {
    const ride = await this.safeGetRide(rideId);
    if (!ride) {
      return null;
    }

    if (ride.status !== RideStatus.SEARCHING) {
      Logger.info('MatchingAutomationService', 'Ride is no longer searchable', {
        rideId,
        status: ride.status,
      });
      return null;
    }

    return ride;
  }

  private async safeGetRide(rideId: string): Promise<Ride | null> {
    try {
      return await this.deps.rideService.getRideById(rideId);
    } catch (error) {
      Logger.error('MatchingAutomationService', 'Failed to load ride during matching', {
        rideId,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  private requireSession(rideId: string): MatchingSession {
    const session = this.sessions.get(rideId);
    if (!session) {
      Logger.warn('MatchingAutomationService', 'No active matching session found', { rideId });
      throw new Error(`No active matching session for ride ${rideId}`);
    }

    return session;
  }

  private cleanupSession(rideId: string, reason: string): void {
    const session = this.sessions.get(rideId);
    if (!session) {
      Logger.debug('MatchingAutomationService', 'Cleanup called for non-existent session', {
        rideId,
        reason,
      });
      this.clearSearchTimeout(rideId);
      return;
    }

    try {
      // Clear ALL timers - critical for preventing memory leaks
      this.clearRetryTimer(session);
      this.clearOfferTimer(session);
      this.clearSearchTimeout(rideId);

      // Remove session from map
      this.sessions.delete(rideId);

      Logger.info('MatchingAutomationService', 'Matching session cleaned up', {
        rideId,
        reason,
        attempt: session.currentAttempt,
        elapsedMs: this.getElapsedMs(session),
        driverId: session.offeredDriverId,
        sessionDurationMs: this.getElapsedMs(session),
      });
    } catch (error) {
      Logger.error('MatchingAutomationService', 'Error during session cleanup', {
        rideId,
        reason,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private resolveBackoffMs(currentAttempt: number): number {
    const backoffIndex = Math.max(0, currentAttempt - 1);
    return (
      this.config.backoffMs[Math.min(backoffIndex, this.config.backoffMs.length - 1)] ??
      this.config.backoffMs[this.config.backoffMs.length - 1]
    );
  }

  private clearRetryTimer(session: MatchingSession): void {
    if (session.retryTimer) {
      clearTimeout(session.retryTimer);
      session.retryTimer = undefined;
    }
  }

  private clearOfferTimer(session: MatchingSession): void {
    if (session.offerTimer) {
      clearTimeout(session.offerTimer);
      session.offerTimer = undefined;
    }
  }

  private clearSearchTimeout(rideId: string): void {
    const timeoutControl = this.timeoutControls.get(rideId);
    if (!timeoutControl) {
      return;
    }

    clearTimeout(timeoutControl.timeoutId);
    this.timeoutControls.delete(rideId);
  }

  private getElapsedMs(session: MatchingSession): number {
    return Date.now() - session.createdAt.getTime();
  }

  private logBusiness(
    message: string,
    session: MatchingSession,
    metadata: Record<string, unknown>
  ): void {
    Logger.info('MatchingAutomationService', message, metadata);
  }

  private logAsyncFailure(operation: string, rideId: string, error: unknown): void {
    Logger.error('MatchingAutomationService', 'Async matching operation failed', {
      operation,
      rideId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
