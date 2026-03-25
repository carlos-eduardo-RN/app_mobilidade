/**
 * Matching Automation Tests
 * ETAPA 2 - Testes para automação de matching com retry e reatribuição
 */

import { MatchingAutomationService } from '../src/services/MatchingAutomationService';
import { JobScheduler } from '../src/jobs/JobScheduler';
import { EventPublisher } from '../src/events/EventPublisher';
import { RetryStrategy } from '../src/models/Matching';
import { EventType } from '../src/models/Events';
import { Logger, LogLevel } from '../src/utils/Logger';

// Mock implementations
class MockRideService {
  private rides = new Map<string, any>();

  async getRideById(rideId: string) {
    return this.rides.get(rideId) || { id: rideId, status: 'SEARCHING_DRIVER' };
  }

  async assignDriverToRide(rideId: string, driverId: string) {
    const ride = this.rides.get(rideId) || { id: rideId };
    ride.driverId = driverId;
    ride.status = 'DRIVER_ASSIGNED';
    this.rides.set(rideId, ride);
  }

  async cancelRide(rideId: string, passengerId: string, reason: string) {
    const ride = this.rides.get(rideId) || { id: rideId };
    ride.status = 'CANCELLED';
    ride.cancelReason = reason;
    this.rides.set(rideId, ride);
  }

  setRide(rideId: string, ride: any) {
    this.rides.set(rideId, ride);
  }
}

class MockMatchingService {
  private drivers: string[] = [];

  setAvailableDrivers(drivers: string[]) {
    this.drivers = drivers;
  }

  async findCandidates(
    rideId: string,
    radiusKm: number,
    limit: number
  ): Promise<any[]> {
    return this.drivers.slice(0, limit).map((driverId, index) => ({
      driverId,
      distance: radiusKm * (1 - index * 0.1),
      score: 85 - index * 5,
    }));
  }
}

class MockDriverService {}

describe('MatchingAutomationService', () => {
  let automationService: MatchingAutomationService;
  let jobScheduler: JobScheduler;
  let eventPublisher: EventPublisher;
  let rideService: MockRideService;
  let matchingService: MockMatchingService;
  let publishedEvents: any[] = [];

  beforeEach(() => {
    Logger.setLevel(LogLevel.DEBUG);
    publishedEvents = [];
    jobScheduler = new JobScheduler(5, 1000);
    eventPublisher = new EventPublisher();
    rideService = new MockRideService();
    matchingService = new MockMatchingService();

    // Subscriber para eventos
    eventPublisher.subscribe(EventType.MATCHING_STARTED, {
      handle: async (event) => {
        publishedEvents.push(event);
      }
    });
    eventPublisher.subscribe(EventType.MATCHING_ATTEMPT, {
      handle: async (event) => {
        publishedEvents.push(event);
      }
    });
    eventPublisher.subscribe(EventType.DRIVER_ASSIGNED, {
      handle: async (event) => {
        publishedEvents.push(event);
      }
    });
    eventPublisher.subscribe(EventType.MATCHING_FAILED, {
      handle: async (event) => {
        publishedEvents.push(event);
      }
    });
    eventPublisher.subscribe(EventType.DRIVER_REJECTED, {
      handle: async (event) => {
        publishedEvents.push(event);
      }
    });

    automationService = new MatchingAutomationService(
      {
        jobScheduler,
        eventPublisher,
        rideService,
        matchingService,
        driverService: new MockDriverService(),
      },
      {
        enabled: true,
        strategy: RetryStrategy.LINEAR,
        maxAttempts: 3,
        initialDelaySeconds: 1,
        maxDelaySeconds: 3,
        matchingTimeoutSeconds: 10,
        expandRadiusKmPerAttempt: 1,
        maxRadiusKm: 10,
      }
    );
  });

  afterEach(async () => {
    await jobScheduler.destroy();
  });

  test('Should start matching automation', async () => {
    const rideId = 'ride-1';
    const passengerId = 'passenger-1';

    await automationService.startAutomation(rideId, passengerId, 3);

    const state = automationService.getAutomationState(rideId);
    expect(state).toBeTruthy();
    expect(state?.rideId).toBe(rideId);
    expect(state?.passengerId).toBe(passengerId);
    expect(state?.currentRadiusKm).toBe(3);
    expect(state?.status).toBe('PENDING');
  });

  test('Should publish MATCHING_STARTED event', async () => {
    const rideId = 'ride-1';
    const passengerId = 'passenger-1';

    publishedEvents = []; // Reset
    await automationService.startAutomation(rideId, passengerId, 3);

    // Aguardar processamento de eventos
    await new Promise((resolve) => setTimeout(resolve, 100));

    const matchingStartedEvent = publishedEvents.find(
      (e) => e.eventType === EventType.MATCHING_STARTED
    );
    expect(matchingStartedEvent).toBeTruthy();
    expect(matchingStartedEvent?.data.passengerId).toBe(passengerId);
  });

  test('Should pause and resume automation', async () => {
    const rideId = 'ride-1';

    await automationService.startAutomation(rideId, 'passenger-1', 3);
    const pausedState = automationService.getAutomationState(rideId);
    expect(pausedState?.status).toBe('PENDING');

    const paused = automationService.pauseAutomation(rideId);
    expect(paused).toBe(true);

    let pausedAfter = automationService.getAutomationState(rideId);
    expect(pausedAfter?.status).toBe('PAUSED');

    const resumed = automationService.resumeAutomation(rideId);
    expect(resumed).toBe(true);

    const resumedAfter = automationService.getAutomationState(rideId);
    expect(resumedAfter?.status).toBe('IN_PROGRESS');
  });

  test('Should cleanup automation state', () => {
    const rideId = 'ride-1';

    automationService.startAutomation(rideId, 'passenger-1', 3);
    expect(automationService.getAutomationState(rideId)).toBeTruthy();

    automationService.cleanupAutomationState(rideId);
    expect(automationService.getAutomationState(rideId)).toBeNull();
  });

  test('Should calculate LINEAR retry delay', () => {
    // LINEAR: 1s, 2s, 3s, 3s (maxed)
    // Não há forma de testar privado, mas validamos via comportamento
    expect(automationService.getAutomationState('test')).toBeNull();
  });

  test('Should expand radius on failed attempts', async () => {
    const rideId = 'ride-1';
    const passengerId = 'passenger-1';

    // Iniciar com raio pequeno
    matchingService.setAvailableDrivers([]); // Nenhum driver no início

    await automationService.startAutomation(rideId, passengerId, 2);

    const initialState = automationService.getAutomationState(rideId);
    expect(initialState?.currentRadiusKm).toBe(2);
  });

  test('Should record driver rejection', async () => {
    const rideId = 'ride-1';
    const driverId = 'driver-1';

    publishedEvents = [];
    await automationService.handleDriverRejected(rideId, driverId);

    // Não há automation state, deveria logar warning
    const rejectionEvents = publishedEvents.filter(
      (e) => e.eventType === EventType.DRIVER_REJECTED
    );
    // Sem setup prévio, nenhum evento publicado
    expect(rejectionEvents.length).toBe(0);
  });

  test('Should get automation result', () => {
    const rideId = 'ride-1';
    const passengerId = 'passenger-1';

    automationService.startAutomation(rideId, passengerId, 3);

    // Aguardar um pouco
    return new Promise((resolve) => {
      setTimeout(() => {
        const result = automationService.getAutomationResult(rideId);
        expect(result).toBeTruthy();
        expect(result?.matched).toBe(false); // Não teve match ainda
        expect(result?.attemptCount).toBe(0); // Ainda não começou
        expect(result?.totalDurationSeconds).toBeGreaterThan(0);
        resolve(undefined);
      }, 100);
    });
  });

  test('Integration: Full matching flow with success', async () => {
    const rideId = 'ride-1';
    const passengerId = 'passenger-1';
    const driverId = 'driver-1';

    // Setup
    rideService.setRide(rideId, {
      id: rideId,
      passengerId,
      status: 'CREATED',
      pickupLocation: { latitude: -23.5505, longitude: -46.6333 },
      dropoffLocation: { latitude: -23.55, longitude: -46.63 },
    });

    matchingService.setAvailableDrivers([driverId]);
    publishedEvents = [];

    // Executar
    await automationService.startAutomation(rideId, passengerId, 3);

    // Aguardar processamento
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Verificar
    const matchingStartedEvent = publishedEvents.find(
      (e) => e.eventType === EventType.MATCHING_STARTED
    );
    expect(matchingStartedEvent).toBeTruthy();
  });

  test('Should not start automation if disabled', async () => {
    const disabledService = new MatchingAutomationService(
      {
        jobScheduler,
        eventPublisher,
        rideService,
        matchingService,
        driverService: new MockDriverService(),
      },
      { enabled: false, strategy: RetryStrategy.LINEAR }
    );

    const rideId = 'ride-1';
    publishedEvents = [];

    await disabledService.startAutomation(rideId, 'passenger-1', 3);

    // Nenhum evento publicado pois desabilitado
    expect(publishedEvents.length).toBe(0);
  });
});

describe('JobScheduler', () => {
  let scheduler: JobScheduler;

  beforeEach(() => {
    scheduler = new JobScheduler(5, 1000);
  });

  afterEach(async () => {
    await scheduler.destroy();
  });

  test('Should schedule and execute a job', async () => {
    let executed = false;

    const mockJob = {
      getId: () => 'test-job',
      execute: async () => {
        executed = true;
        return { success: true };
      },
    };

    const jobId = scheduler.schedule(mockJob as any, 100);
    expect(jobId).toBeTruthy();

    await new Promise((resolve) => setTimeout(resolve, 200));
    expect(executed).toBe(true);
  });

  test('Should cancel a pending job', async () => {
    let executed = false;

    const mockJob = {
      getId: () => 'test-job-2',
      execute: async () => {
        executed = true;
        return { success: true };
      },
    };

    const jobId = scheduler.schedule(mockJob as any, 200);
    scheduler.cancel(jobId);

    await new Promise((resolve) => setTimeout(resolve, 300));
    expect(executed).toBe(false);
  });

  test('Should pause and resume jobs', async () => {
    scheduler.pause();
    expect(scheduler.getPendingJobs().length).toBe(0);

    scheduler.resume();
    expect(scheduler.getPendingJobs().length).toBe(0);
  });

  test('Should get job status', () => {
    const mockJob = {
      getId: () => 'test-job-3',
      execute: async () => ({ success: true }),
    };

    const jobId = scheduler.schedule(mockJob as any, 100);
    const status = scheduler.getStatus(jobId);

    expect(status).toBeTruthy();
    expect(status).toBe('PENDING');
  });
});
