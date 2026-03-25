/**
 * Ride Service - Timeout Extension
 * Extensão do RideService para suportar timeouts de driver accept e inatividade
 */

import { TimeoutManager } from '../jobs/TimeoutManager';
import { TimeoutType, TimeoutEventListener } from '../models/Timeout';
import { Logger } from '../utils/Logger';
import { EventType } from '../models/Events';
import {
  DriverAcceptTimeoutFactory,
  DriverAcceptTimeoutTrackerRepository,
} from '../jobs/DriverAcceptTimeout';
import {
  RideInactivityTimeoutFactory,
  RideActivityTrackerRepository,
  RideActivityStatus,
} from '../jobs/RideInactivityTimeout';

export interface RideTimeoutConfig {
  /** Driver accept timeout habilitado */
  driverAcceptTimeoutEnabled: boolean;
  
  /** Duração driver accept em segundos */
  driverAcceptTimeoutSeconds: number;
  
  /** Ride inactivity timeout habilitado */
  rideInactivityTimeoutEnabled: boolean;
  
  /** Duração inatividade em segundos */
  rideInactivityTimeoutSeconds: number;
  
  /** Máximo de extensões de driver accept */
  maxDriverAcceptExtensions: number;
  
  /** Máximo de extensões de inatividade */
  maxInactivityExtensions: number;
}

/**
 * Extensão de timeout para RideService
 */
export class RideTimeoutMixin {
  private driverAcceptTimeouts: Map<string, string> = new Map(); // (rideId, driverId) -> timeoutId
  private rideInactivityTimeouts: Map<string, string> = new Map(); // rideId -> timeoutId
  private rideTimeoutConfig: RideTimeoutConfig;
  
  // Repositórios de tracking
  private driverAcceptTrackers = new DriverAcceptTimeoutTrackerRepository();
  private rideActivityTrackers = new RideActivityTrackerRepository();

  constructor(
    private timeoutManager: TimeoutManager,
    private eventPublisher: any,
    private rideService: any,
    config?: Partial<RideTimeoutConfig>
  ) {
    this.rideTimeoutConfig = {
      driverAcceptTimeoutEnabled: true,
      driverAcceptTimeoutSeconds: 30,
      rideInactivityTimeoutEnabled: true,
      rideInactivityTimeoutSeconds: 300,
      maxDriverAcceptExtensions: 2,
      maxInactivityExtensions: 5,
      ...config,
    };

    Logger.info(
      'RideTimeoutMixin',
      'Initialized',
      { config: this.rideTimeoutConfig }
    );
  }

  /**
   * Inicia timeout para aceitação de driver
   */
  async startDriverAcceptTimeout(
    rideId: string,
    driverId: string
  ): Promise<string | null> {
    if (!this.rideTimeoutConfig.driverAcceptTimeoutEnabled) {
      return null;
    }

    const durationMs = this.rideTimeoutConfig.driverAcceptTimeoutSeconds * 1000;
    const key = `${rideId}-${driverId}`;

    // Verificar se já existe
    if (this.driverAcceptTimeouts.has(key)) {
      Logger.warn(
        'RideTimeoutMixin',
        'Driver accept timeout already exists',
        { rideId, driverId }
      );
      return this.driverAcceptTimeouts.get(key) || null;
    }

    try {
      // Criar listener
      const listener = DriverAcceptTimeoutFactory.createListener(rideId, driverId, {
        onDriverAcceptTimeout: async (rideId: string, driverId: string) => {
          // Callback quando timeout expira
          await this.rideService.handleDriverAcceptTimeout(rideId, driverId);
        },
        publishEvent: this.eventPublisher.publish.bind(this.eventPublisher),
      });

      // Iniciar timeout
      const result = await this.timeoutManager.start(
        TimeoutType.DRIVER_ACCEPT,
        rideId,
        durationMs,
        [listener]
      );

      if (result.success && result.timeoutId) {
        this.driverAcceptTimeouts.set(key, result.timeoutId);

        // Rastrear
        this.driverAcceptTrackers.track({
          rideId,
          driverId,
          timeoutId: result.timeoutId,
          startedAt: new Date(),
          expiresAt: new Date(Date.now() + durationMs),
          action: 'auto_reject',
        });

        Logger.info(
          'RideTimeoutMixin',
          'Driver accept timeout started',
          { rideId, driverId, timeoutId: result.timeoutId, durationMs }
        );

        return result.timeoutId;
      }

      return null;
    } catch (err) {
      Logger.error(
        'RideTimeoutMixin',
        'Error starting driver accept timeout',
        { rideId, driverId, error: err }
      );
      return null;
    }
  }

  /**
   * Cancela timeout de driver accept
   */
  async cancelDriverAcceptTimeout(
    rideId: string,
    driverId: string,
    reason: string = 'driver_accepted'
  ): Promise<boolean> {
    const key = `${rideId}-${driverId}`;
    const timeoutId = this.driverAcceptTimeouts.get(key);

    if (!timeoutId) {
      return false;
    }

    try {
      const result = await this.timeoutManager.cancel(timeoutId, reason);
      if (result.success) {
        this.driverAcceptTimeouts.delete(key);
        this.driverAcceptTrackers.untrack(timeoutId);
        
        Logger.info(
          'RideTimeoutMixin',
          'Driver accept timeout cancelled',
          { rideId, driverId, reason }
        );

        return true;
      }
    } catch (err) {
      Logger.error(
        'RideTimeoutMixin',
        'Error cancelling driver accept timeout',
        { rideId, driverId, error: err }
      );
    }

    return false;
  }

  /**
   * Estende timeout de driver accept
   */
  async extendDriverAcceptTimeout(
    rideId: string,
    driverId: string,
    additionalSeconds: number
  ): Promise<boolean> {
    const key = `${rideId}-${driverId}`;
    const timeoutId = this.driverAcceptTimeouts.get(key);

    if (!timeoutId) {
      return false;
    }

    try {
      const result = await this.timeoutManager.extend({
        timeoutId,
        additionalMs: additionalSeconds * 1000,
        reason: `Manual extension for driver ${driverId}`,
        maxExtensions: this.rideTimeoutConfig.maxDriverAcceptExtensions,
      });

      if (result.success) {
        Logger.info(
          'RideTimeoutMixin',
          'Driver accept timeout extended',
          { rideId, driverId, additionalSeconds }
        );
      }

      return result.success;
    } catch (err) {
      Logger.error(
        'RideTimeoutMixin',
        'Error extending driver accept timeout',
        { rideId, driverId, error: err }
      );
      return false;
    }
  }

  /**
   * Inicia timeout de inatividade da corrida
   */
  async startRideInactivityTimeout(rideId: string): Promise<string | null> {
    if (!this.rideTimeoutConfig.rideInactivityTimeoutEnabled) {
      return null;
    }

    // Verificar se já existe
    if (this.rideInactivityTimeouts.has(rideId)) {
      Logger.warn('RideTimeoutMixin', 'Ride inactivity timeout already exists', { rideId });
      return this.rideInactivityTimeouts.get(rideId) || null;
    }

    try {
      const durationMs = this.rideTimeoutConfig.rideInactivityTimeoutSeconds * 1000;

      // Criar listener
      const listener = RideInactivityTimeoutFactory.createListener(rideId, {
        onRideInactive: async (rideId: string, durationMs: number) => {
          // Callback quando timeout expira
          await this.rideService.handleRideInactivityTimeout(rideId, durationMs);
        },
        publishEvent: this.eventPublisher.publish.bind(this.eventPublisher),
      });

      // Iniciar timeout
      const result = await this.timeoutManager.start(
        TimeoutType.RIDE_INACTIVITY,
        rideId,
        durationMs,
        [listener]
      );

      if (result.success && result.timeoutId) {
        this.rideInactivityTimeouts.set(rideId, result.timeoutId);

        // Rastrear atividade
        this.rideActivityTrackers.track(rideId);

        Logger.info(
          'RideTimeoutMixin',
          'Ride inactivity timeout started',
          { rideId, timeoutId: result.timeoutId, durationMs }
        );

        return result.timeoutId;
      }

      return null;
    } catch (err) {
      Logger.error(
        'RideTimeoutMixin',
        'Error starting ride inactivity timeout',
        { rideId, error: err }
      );
      return null;
    }
  }

  /**
   * Cancela timeout de inatividade
   */
  async cancelRideInactivityTimeout(
    rideId: string,
    reason: string = 'ride_completed'
  ): Promise<boolean> {
    const timeoutId = this.rideInactivityTimeouts.get(rideId);

    if (!timeoutId) {
      return false;
    }

    try {
      const result = await this.timeoutManager.cancel(timeoutId, reason);
      if (result.success) {
        this.rideInactivityTimeouts.delete(rideId);
        this.rideActivityTrackers.remove(rideId);

        Logger.info(
          'RideTimeoutMixin',
          'Ride inactivity timeout cancelled',
          { rideId, reason }
        );

        return true;
      }
    } catch (err) {
      Logger.error(
        'RideTimeoutMixin',
        'Error cancelling ride inactivity timeout',
        { rideId, error: err }
      );
    }

    return false;
  }

  /**
   * Estende timeout de inatividade
   */
  async extendRideInactivityTimeout(
    rideId: string,
    additionalSeconds: number
  ): Promise<boolean> {
    const timeoutId = this.rideInactivityTimeouts.get(rideId);

    if (!timeoutId) {
      return false;
    }

    try {
      const result = await this.timeoutManager.extend({
        timeoutId,
        additionalMs: additionalSeconds * 1000,
        reason: `Manual extension`,
        maxExtensions: this.rideTimeoutConfig.maxInactivityExtensions,
      });

      if (result.success) {
        Logger.info(
          'RideTimeoutMixin',
          'Ride inactivity timeout extended',
          { rideId, additionalSeconds }
        );
      }

      return result.success;
    } catch (err) {
      Logger.error(
        'RideTimeoutMixin',
        'Error extending ride inactivity timeout',
        { rideId, error: err }
      );
      return false;
    }
  }

  /**
   * Atualiza atividade de ride
   */
  updateRideActivity(rideId: string): boolean {
    const tracker = this.rideActivityTrackers.updateActivity(rideId);
    if (tracker) {
      Logger.debug(
        'RideTimeoutMixin',
        'Ride activity updated',
        { rideId }
      );
      return true;
    }
    return false;
  }

  /**
   * Obtém status de atividade de ride
   */
  getRideActivityStatus(rideId: string) {
    return this.rideActivityTrackers.getStatus(rideId);
  }

  /**
   * Cancela todos os timeouts de um ride
   */
  async cancelAllRideTimeouts(rideId: string, reason: string = 'cleanup'): Promise<void> {
    // Cancelar driver accept timeouts
    const driverAcceptTrackers = this.driverAcceptTrackers.getByRide(rideId);
    for (const tracker of driverAcceptTrackers) {
      const key = `${tracker.rideId}-${tracker.driverId}`;
      this.driverAcceptTimeouts.delete(key);
    }

    // Cancelar ride inactivity timeout
    const rideInactivityId = this.rideInactivityTimeouts.get(rideId);
    if (rideInactivityId) {
      this.rideInactivityTimeouts.delete(rideId);
    }

    // Limpar rastreadores
    this.driverAcceptTrackers.removeByRide(rideId);
    this.rideActivityTrackers.remove(rideId);

    // Cancelar no TimeoutManager
    await this.timeoutManager.cancelRideTimeouts(rideId, reason);

    Logger.info(
      'RideTimeoutMixin',
      'All ride timeouts cancelled',
      { rideId, reason }
    );
  }

  /**
   * Limpa dados de timeout (ex: app shutdown)
   */
  cleanup(): void {
    this.driverAcceptTimeouts.clear();
    this.rideInactivityTimeouts.clear();
    this.driverAcceptTrackers.clear();
    this.rideActivityTrackers.clear();
  }
}
