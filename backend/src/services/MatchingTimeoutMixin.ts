/**
 * Matching Automation Service - Timeout Extension
 * Extensão do MatchingAutomationService para suportar timeouts
 */

import { TimeoutManager } from '../jobs/TimeoutManager';
import { TimeoutType, TimeoutEventListener } from '../models/Timeout';
import { Logger } from '../utils/Logger';
import { EventType } from '../models/Events';

export interface MatchingTimeoutConfig {
  /** Se timeout de matching está habilitado */
  enabled: boolean;
  
  /** Duração em segundos */
  durationSeconds: number;
  
  /** Permitir extensões */
  allowExtensions: boolean;
  
  /** Máximo de extensões */
  maxExtensions: number;
}

/**
 * Extensão de timeout para MatchingAutomationService
 * Deve ser mixada com MatchingAutomationService
 */
export class MatchingTimeoutMixin {
  private matchingTimeouts: Map<string, string> = new Map(); // rideId -> timeoutId
  private matchingTimeoutConfig: MatchingTimeoutConfig;

  constructor(
    private timeoutManager: TimeoutManager,
    private eventPublisher: any,
    config?: Partial<MatchingTimeoutConfig>
  ) {
    this.matchingTimeoutConfig = {
      enabled: true,
      durationSeconds: 60,
      allowExtensions: true,
      maxExtensions: 3,
      ...config,
    };

    Logger.info(
      'MatchingTimeoutMixin',
      'Initialized',
      { config: this.matchingTimeoutConfig }
    );
  }

  /**
   * Inicia timeout de matching
   */
  async startMatchingTimeout(
    rideId: string,
    passengerId: string
  ): Promise<string | null> {
    if (!this.matchingTimeoutConfig.enabled) {
      return null;
    }

    const durationMs = this.matchingTimeoutConfig.durationSeconds * 1000;

    // Criar listener
    const listener: TimeoutEventListener = {
      onStarted: async (state) => {
        Logger.info(
          'MatchingTimeoutMixin',
          'Matching timeout started',
          { rideId, timeoutId: state.timeoutId, durationMs: state.totalAllocatedMs }
        );
      },

      onExtended: async (state, previousMs) => {
        Logger.info(
          'MatchingTimeoutMixin',
          'Matching timeout extended',
          { rideId, timeoutId: state.timeoutId, addedMs: state.totalAllocatedMs - previousMs, totalMs: state.totalAllocatedMs }
        );
      },

      onExpired: async (result) => {
        Logger.warn(
          'MatchingTimeoutMixin',
          'Matching timeout EXPIRED',
          { rideId, timeoutId: result.timeoutId, durationMs: result.totalTimeUsedMs }
        );

        // Publicar evento
        await this.eventPublisher.publish({
          aggregateId: rideId,
          aggregateType: 'Ride',
          eventType: EventType.MATCHING_TIMEOUT,
          timestamp: new Date(),
          data: {
            passengerId,
            timeoutDurationMs: result.totalAllocatedMs,
            actualTimeMs: result.totalTimeUsedMs,
            reason: 'matching_timeout_exceeded',
          },
          metadata: {
            source: 'timeout_job',
          },
        }).catch((err: any) => {
          Logger.error(
            'MatchingTimeoutMixin',
            'Error publishing MATCHING_TIMEOUT event',
            { rideId, error: err.message }
          );
        });

        // Remover do mapa
        this.matchingTimeouts.delete(rideId);
      },

      onCancelled: async (timeoutId, reason) => {
        Logger.info(
          'MatchingTimeoutMixin',
          'Matching timeout cancelled',
          { rideId, timeoutId, reason }
        );
      },

      onCompleted: async (result) => {
        Logger.debug(
          'MatchingTimeoutMixin',
          'Matching timeout completed',
          { rideId, timeoutId: result.timeoutId, reason: result.reason }
        );
      },
    };

    // Iniciar timeout
    const result = await this.timeoutManager.start(
      TimeoutType.MATCHING,
      rideId,
      durationMs,
      [listener]
    );

    if (result.success) {
      this.matchingTimeouts.set(rideId, result.timeoutId);
      Logger.info(
        'MatchingTimeoutMixin',
        'Matching timeout started successfully',
        { rideId, timeoutId: result.timeoutId }
      );
      return result.timeoutId;
    } else {
      Logger.error(
        'MatchingTimeoutMixin',
        'Failed to start matching timeout',
        { rideId, error: result.error }
      );
      return null;
    }
  }

  /**
   * Cancela timeout de matching
   */
  async cancelMatchingTimeout(rideId: string, reason: string = 'matching_completed'): Promise<boolean> {
    const timeoutId = this.matchingTimeouts.get(rideId);
    if (!timeoutId) {
      return false;
    }

    const result = await this.timeoutManager.cancel(timeoutId, reason);
    if (result.success) {
      this.matchingTimeouts.delete(rideId);
      Logger.info(
        'MatchingTimeoutMixin',
        'Matching timeout cancelled',
        { rideId, timeoutId, reason }
      );
      return true;
    }

    return false;
  }

  /**
   * Estende timeout de matching
   */
  async extendMatchingTimeout(
    rideId: string,
    additionalSeconds: number
  ): Promise<boolean> {
    if (!this.matchingTimeoutConfig.allowExtensions) {
      return false;
    }

    const timeoutId = this.matchingTimeouts.get(rideId);
    if (!timeoutId) {
      return false;
    }

    const result = await this.timeoutManager.extend({
      timeoutId,
      additionalMs: additionalSeconds * 1000,
      reason: `Manual extension by ${additionalSeconds}s`,
      maxExtensions: this.matchingTimeoutConfig.maxExtensions,
    });

    return result.success;
  }

  /**
   * Completa timeout de matching com sucesso
   */
  async completeMatchingTimeout(rideId: string, reason: string = 'match_found'): Promise<boolean> {
    const timeoutId = this.matchingTimeouts.get(rideId);
    if (!timeoutId) {
      return false;
    }

    const result = await this.timeoutManager.complete(timeoutId, reason);
    if (result.success) {
      this.matchingTimeouts.delete(rideId);
      return true;
    }

    return false;
  }

  /**
   * Obtém status do timeout de matching
   */
  getMatchingTimeoutStatus(rideId: string) {
    const timeoutId = this.matchingTimeouts.get(rideId);
    if (!timeoutId) {
      return null;
    }

    return this.timeoutManager.getStatus(timeoutId);
  }

  /**
   * Remove todos os timeouts de matching de um ride
   */
  async removeMatchingTimeouts(rideId: string): Promise<void> {
    this.matchingTimeouts.delete(rideId);
  }

  /**
   * Limpa todos os dados de timeout
   */
  cleanup(): void {
    this.matchingTimeouts.clear();
  }
}
