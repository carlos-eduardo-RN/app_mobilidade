/**
 * RideInactivityTimeout Job
 * Detecta quando uma corrida fica inativa por muito tempo (5 minutos)
 * e realiza cleanup automático
 */

import { Logger } from '../utils/Logger';
import { TimeoutType, TimeoutEventListener, TimeoutResult, TimeoutState } from '../models/Timeout';
import { EventType, DomainEvent } from '../models/Events';

interface RideInactivityTimeoutDependencies {
  /** Função para cancelar ride por inatividade */
  onRideInactive: (rideId: string, durationMs: number) => Promise<void>;
  
  /** Função para publicar eventos */
  publishEvent: (event: DomainEvent) => Promise<void>;
}

/**
 * Factory para criar listeners de RideInactivityTimeout
 */
export class RideInactivityTimeoutFactory {
  static createListener(
    rideId: string,
    deps: RideInactivityTimeoutDependencies
  ): TimeoutEventListener {
    return {
      onStarted: async (state: TimeoutState) => {
        Logger.info(
          'RideInactivityTimeout',
          'Timeout started',
          { rideId, timeRemainingMs: state.timeRemainingMs }
        );
      },

      onExtended: async (state: TimeoutState, previousMs: number) => {
        const added = state.totalAllocatedMs - previousMs;
        Logger.info(
          'RideInactivityTimeout',
          'Timeout extended',
          { rideId, addedMs: added, addedSeconds: added / 1000, totalMs: state.totalAllocatedMs }
        );
      },

      onCancelled: async (timeoutId: string, reason: string) => {
        Logger.info(
          'RideInactivityTimeout',
          'Timeout cancelled',
          { rideId, timeoutId, reason }
        );
      },

      onExpired: async (result: TimeoutResult) => {
        try {
          Logger.warn(
            'RideInactivityTimeout',
            'Timeout EXPIRED',
            { rideId, inactiveDurationMs: result.totalTimeUsedMs }
          );

          // Executar ação de timeout
          await deps.onRideInactive(rideId, result.totalTimeUsedMs);

          // Publicar evento
          const event: DomainEvent = {
            id: `evt-${Date.now()}-${Math.random()}`,
            type: EventType.RIDE_INACTIVITY_TIMEOUT,
            aggregateId: rideId,
            aggregateType: 'ride',
            timestamp: new Date(),
            data: {
              rideId,
              inactiveDurationMs: result.totalTimeUsedMs,
              allocatedTimeMs: result.totalAllocatedMs,
              extensionCount: result.extensionCount,
              reason: 'ride_inactive_too_long',
            },
            metadata: {
              source: 'timeout_job',
            },
          };

          await deps.publishEvent(event);

          Logger.info(
            'RideInactivityTimeout',
            'Timeout action completed',
            { rideId }
          );
        } catch (err) {
          Logger.error(
            'RideInactivityTimeout',
            'Error handling timeout',
            { rideId, error: err }
          );
        }
      },

      onCompleted: async (result: TimeoutResult) => {
        Logger.debug(
          'RideInactivityTimeout',
          'Timeout completed',
          { rideId, reason: result.reason }
        );
      },
    };
  }
}

/**
 * Configurações para diferentes cenários de inatividade
 */
export const RIDE_INACTIVITY_TIMEOUT_SCENARIOS = {
  /**
   * Timeout padrão (5 minutos)
   */
  standard: {
    type: TimeoutType.RIDE_INACTIVITY,
    durationMs: 300_000,
    maxExtensions: 5,
    description: 'Timeout padrão de inatividade (5 minutos)',
  },

  /**
   * Timeout reduzido para cidade pequena (3 minutos)
   */
  smallCity: {
    type: TimeoutType.RIDE_INACTIVITY,
    durationMs: 180_000,
    maxExtensions: 3,
    description: 'Timeout reduzido para cidades pequenas (3 minutos)',
  },

  /**
   * Timeout estendido para área remota (10 minutos)
   */
  remoteArea: {
    type: TimeoutType.RIDE_INACTIVITY,
    durationMs: 600_000,
    maxExtensions: 8,
    description: 'Timeout estendido para áreas remotas (10 minutos)',
  },

  /**
   * Timeout para corrida com passageiro esperando (2 minutos)
   */
  passengerWaiting: {
    type: TimeoutType.RIDE_INACTIVITY,
    durationMs: 120_000,
    maxExtensions: 2,
    description: 'Timeout curto quando passageiro está esperando (2 minutos)',
  },

  /**
   * Timeout para corrida em progresso (30 minutos)
   */
  inProgress: {
    type: TimeoutType.RIDE_INACTIVITY,
    durationMs: 1_800_000,
    maxExtensions: 10,
    description: 'Timeout longo para corrida em progresso (30 minutos)',
  },
};

/**
 * Ações possíveis ao detectar inatividade
 */
export const RIDE_INACTIVITY_TIMEOUT_ACTIONS = {
  /**
   * Cancelar corrida automaticamente
   */
  AUTO_CANCEL: 'auto_cancel',

  /**
   * Notificar passageiro para confirmar
   */
  NOTIFY_PASSENGER: 'notify_passenger',

  /**
   * Reatribuir motorista
   */
  REATRIBUTE: 'reatribute',

  /**
   * Pausar corrida e notificar
   */
  PAUSE_AND_NOTIFY: 'pause_and_notify',

  /**
   * Apenas registrar para análise
   */
  MONITORING_ONLY: 'monitoring_only',
};

/**
 * Estados de atividade de um ride
 */
export enum RideActivityStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  PAUSED = 'paused',
}

/**
 * Rastreador de atividade de ride
 */
export interface RideActivityTracker {
  rideId: string;
  lastActivityAt: Date;
  status: RideActivityStatus;
  inactiveForMs: number;
  timeoutId?: string;
}

/**
 * Repositório para tracking de atividade de rides
 */
export class RideActivityTrackerRepository {
  private trackers = new Map<string, RideActivityTracker>();

  track(rideId: string): RideActivityTracker {
    const now = new Date();
    const tracker: RideActivityTracker = {
      rideId,
      lastActivityAt: now,
      status: RideActivityStatus.ACTIVE,
      inactiveForMs: 0,
    };

    this.trackers.set(rideId, tracker);
    return tracker;
  }

  updateActivity(rideId: string): RideActivityTracker | null {
    const tracker = this.trackers.get(rideId);
    if (!tracker) {
      return null;
    }

    tracker.lastActivityAt = new Date();
    tracker.inactiveForMs = 0;
    return tracker;
  }

  getStatus(rideId: string): RideActivityTracker | null {
    const tracker = this.trackers.get(rideId);
    if (!tracker) {
      return null;
    }

    // Atualizar tempo inativo
    const now = new Date();
    tracker.inactiveForMs = now.getTime() - tracker.lastActivityAt.getTime();

    return tracker;
  }

  markAsInactive(rideId: string): RideActivityTracker | null {
    const tracker = this.trackers.get(rideId);
    if (!tracker) {
      return null;
    }

    tracker.status = RideActivityStatus.INACTIVE;
    return tracker;
  }

  markAsPaused(rideId: string): RideActivityTracker | null {
    const tracker = this.trackers.get(rideId);
    if (!tracker) {
      return null;
    }

    tracker.status = RideActivityStatus.PAUSED;
    return tracker;
  }

  remove(rideId: string): boolean {
    return this.trackers.delete(rideId);
  }

  getAll(): RideActivityTracker[] {
    return Array.from(this.trackers.values());
  }

  clear(): void {
    this.trackers.clear();
  }
}

/**
 * Estratégia de limpeza de rides inativos
 */
export class InactiveRideCleanupStrategy {
  /**
   * Calcula o próximo intervalo de verificação
   */
  static calculateNextCheckInterval(
    currentInactiveDurationMs: number,
    thresholdMs: number = 300_000
  ): number {
    // Se ainda tem tempo, retornar o tempo restante + 10s buffer
    if (currentInactiveDurationMs < thresholdMs) {
      return (thresholdMs - currentInactiveDurationMs) + 10_000;
    }

    // Se passou, retornar imediatamente
    return 0;
  }

  /**
   * Determina a ação apropriada baseada no contexto
   */
  static determineAction(
    tracker: RideActivityTracker,
    rideState: string
  ): string {
    // Se ride está em progresso, não cancelar
    if (rideState === 'in_progress') {
      return RIDE_INACTIVITY_TIMEOUT_ACTIONS.NOTIFY_PASSENGER;
    }

    // Se está esperando por driver, cancelar
    if (rideState === 'driver_assigned') {
      return RIDE_INACTIVITY_TIMEOUT_ACTIONS.AUTO_CANCEL;
    }

    // Se está em matching, voltar para automação
    if (rideState === 'searching') {
      return RIDE_INACTIVITY_TIMEOUT_ACTIONS.REATRIBUTE;
    }

    // Padrão: notificar
    return RIDE_INACTIVITY_TIMEOUT_ACTIONS.NOTIFY_PASSENGER;
  }
}
