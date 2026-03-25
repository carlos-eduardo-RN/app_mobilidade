/**
 * TimeoutManager
 * Gerencia todos os timeouts do sistema com precisão e observabilidade
 */

import { v4 as uuid } from 'uuid';
import { Logger } from '../utils/Logger';
import {
  TimeoutType,
  TimeoutStatus,
  TimeoutConfig,
  TimeoutState,
  TimeoutResult,
  TimeoutExtensionParams,
  TimeoutOperationResult,
  TimeoutEventListener,
  DEFAULT_TIMEOUT_CONFIGS,
  MAX_EXTENSIONS,
  EXTENSION_DURATION_MS,
} from '../models/Timeout';

interface StoredTimeout {
  config: TimeoutConfig;
  state: TimeoutState;
  timer: NodeJS.Timeout | null;
  listeners: TimeoutEventListener[];
}

export class TimeoutManager {
  private timeouts = new Map<string, StoredTimeout>();
  private rideTimeouts = new Map<string, Set<string>>();
  private cleanupInterval: NodeJS.Timeout | null = null;
  private maxConcurrentTimeouts = 1000;

  constructor(cleanupIntervalMs: number = 60_000) {
    this.initCleanupInterval(cleanupIntervalMs);
    Logger.info('TimeoutManager', 'TimeoutManager initialized');
  }

  /**
   * Inicia um novo timeout
   */
  async start(
    type: TimeoutType,
    rideId: string,
    durationMs?: number,
    listeners?: TimeoutEventListener[]
  ): Promise<TimeoutOperationResult> {
    try {
      // Validar limite de timeouts concorrentes
      if (this.timeouts.size >= this.maxConcurrentTimeouts) {
        Logger.warn('TimeoutManager', `Max concurrent timeouts reached: ${this.maxConcurrentTimeouts}`);
        return {
          success: false,
          timeoutId: '',
          error: 'Max concurrent timeouts exceeded',
        };
      }

      const timeoutId = uuid();
      const duration = durationMs || DEFAULT_TIMEOUT_CONFIGS[type];

      const now = new Date();
      const config: TimeoutConfig = {
        timeoutId,
        type,
        rideId,
        durationMs: duration,
        createdAt: now,
        extensions: [],
      };

      const state: TimeoutState = {
        timeoutId,
        type,
        rideId,
        status: TimeoutStatus.PENDING,
        totalAllocatedMs: duration,
        timeUsedMs: 0,
        timeRemainingMs: duration,
        expiresAt: new Date(now.getTime() + duration),
        createdAt: now,
        lastActivityAt: now,
        extensionAttempts: 0,
      };

      const stored: StoredTimeout = {
        config,
        state,
        timer: null,
        listeners: listeners || [],
      };

      // Agendar expiração
      stored.timer = setTimeout(
        () => this.expire(timeoutId),
        duration
      );

      // Atualizar estado
      state.status = TimeoutStatus.ACTIVE;
      this.timeouts.set(timeoutId, stored);

      // Rastrear timeouts por ride
      if (!this.rideTimeouts.has(rideId)) {
        this.rideTimeouts.set(rideId, new Set());
      }
      this.rideTimeouts.get(rideId)!.add(timeoutId);

      // Notificar listeners
      for (const listener of stored.listeners) {
        if (listener.onStarted) {
          try {
            await listener.onStarted(state);
          } catch (err) {
            Logger.error('TimeoutManager', `Error in onStarted listener: ${err}`);
          }
        }
      }

      Logger.info('TimeoutManager', `Timeout started: ${timeoutId} (${type}, ${duration}ms, ride: ${rideId})`);

      return {
        success: true,
        timeoutId,
        state,
      };
    } catch (err) {
      Logger.error('TimeoutManager', `Error starting timeout: ${err}`);
      return {
        success: false,
        timeoutId: '',
        error: String(err),
      };
    }
  }

  /**
   * Cancela um timeout
   */
  async cancel(timeoutId: string, reason: string = 'cancelled'): Promise<TimeoutOperationResult> {
    try {
      const stored = this.timeouts.get(timeoutId);
      if (!stored) {
        return {
          success: false,
          timeoutId,
          error: 'Timeout not found',
        };
      }

      const { state, timer, listeners, config } = stored;

      // Limpar timer
      if (timer) {
        clearTimeout(timer);
      }

      // Atualizar estado
      state.status = TimeoutStatus.CANCELLED;
      state.lastActivityAt = new Date();

      // Chamar callback de cancelamento se configurado
      if (config.onCancel) {
        try {
          await config.onCancel();
        } catch (err) {
          Logger.error('TimeoutManager', `Error in onCancel callback: ${err}`);
        }
      }

      // Notificar listeners
      for (const listener of listeners) {
        if (listener.onCancelled) {
          try {
            await listener.onCancelled(timeoutId, reason);
          } catch (err) {
            Logger.error('TimeoutManager', `Error in onCancelled listener: ${err}`);
          }
        }
      }

      // Remover
      this.timeouts.delete(timeoutId);
      this.rideTimeouts.get(config.rideId)?.delete(timeoutId);

      Logger.info('TimeoutManager', `Timeout cancelled: ${timeoutId} (reason: ${reason})`);

      return {
        success: true,
        timeoutId,
        state,
      };
    } catch (err) {
      Logger.error('TimeoutManager', `Error cancelling timeout: ${err}`);
      return {
        success: false,
        timeoutId,
        error: String(err),
      };
    }
  }

  /**
   * Estende um timeout existente
   */
  async extend(
    params: TimeoutExtensionParams
  ): Promise<TimeoutOperationResult> {
    try {
      const stored = this.timeouts.get(params.timeoutId);
      if (!stored) {
        return {
          success: false,
          timeoutId: params.timeoutId,
          error: 'Timeout not found',
        };
      }

      const { state, config, timer, listeners } = stored;

      // Verificar se pode estender
      const maxExt = MAX_EXTENSIONS[state.type];
      if (state.extensionAttempts >= maxExt) {
        return {
          success: false,
          timeoutId: params.timeoutId,
          error: `Max extensions reached (${maxExt})`,
        };
      }

      // Limpar timer anterior
      if (timer) {
        clearTimeout(timer);
      }

      // Registrar extensão
      const previousMs = state.totalAllocatedMs;
      state.totalAllocatedMs += params.additionalMs;
      state.extensionAttempts += 1;
      config.extensions.push(params.additionalMs);

      // Recalcular expiração
      const now = new Date();
      state.expiresAt = new Date(now.getTime() + state.totalAllocatedMs - state.timeUsedMs);
      state.lastActivityAt = now;

      if (state.status === TimeoutStatus.ACTIVE) {
        state.status = TimeoutStatus.EXTENDED;
      }

      // Reagendar timer
      stored.timer = setTimeout(
        () => this.expire(params.timeoutId),
        state.totalAllocatedMs - state.timeUsedMs
      );

      // Notificar listeners
      for (const listener of listeners) {
        if (listener.onExtended) {
          try {
            await listener.onExtended(state, previousMs);
          } catch (err) {
            Logger.error('TimeoutManager', `Error in onExtended listener: ${err}`);
          }
        }
      }

      Logger.info(
        'TimeoutManager',
        `Timeout extended: ${params.timeoutId} (+${params.additionalMs}ms, reason: ${params.reason})`
      );

      return {
        success: true,
        timeoutId: params.timeoutId,
        state,
      };
    } catch (err) {
      Logger.error('TimeoutManager', `Error extending timeout: ${err}`);
      return {
        success: false,
        timeoutId: params.timeoutId,
        error: String(err),
      };
    }
  }

  /**
   * Completa um timeout com sucesso (não expira)
   */
  async complete(timeoutId: string, reason: string = 'completed'): Promise<TimeoutOperationResult> {
    try {
      const stored = this.timeouts.get(timeoutId);
      if (!stored) {
        return {
          success: false,
          timeoutId,
          error: 'Timeout not found',
        };
      }

      const { state, timer, listeners, config } = stored;

      // Limpar timer
      if (timer) {
        clearTimeout(timer);
      }

      // Criar resultado
      const result: TimeoutResult = {
        timeoutId,
        type: state.type,
        rideId: state.rideId,
        expired: false,
        finalStatus: TimeoutStatus.COMPLETED,
        totalTimeUsedMs: Date.now() - state.createdAt.getTime(),
        totalAllocatedMs: state.totalAllocatedMs,
        extensionCount: state.extensionAttempts,
        reason,
        completedAt: new Date(),
      };

      // Notificar listeners
      for (const listener of listeners) {
        if (listener.onCompleted) {
          try {
            await listener.onCompleted(result);
          } catch (err) {
            Logger.error('TimeoutManager', `Error in onCompleted listener: ${err}`);
          }
        }
      }

      // Remover
      this.timeouts.delete(timeoutId);
      this.rideTimeouts.get(config.rideId)?.delete(timeoutId);

      Logger.info('TimeoutManager', `Timeout completed: ${timeoutId} (reason: ${reason})`);

      return {
        success: true,
        timeoutId,
        state,
      };
    } catch (err) {
      Logger.error('TimeoutManager', `Error completing timeout: ${err}`);
      return {
        success: false,
        timeoutId,
        error: String(err),
      };
    }
  }

  /**
   * Obtém o estado atual de um timeout
   */
  getStatus(timeoutId: string): TimeoutState | null {
    const stored = this.timeouts.get(timeoutId);
    if (!stored) {
      return null;
    }

    const state = stored.state;
    const now = new Date();
    const msElapsed = now.getTime() - state.createdAt.getTime();

    // Atualizar métricas
    state.timeUsedMs = msElapsed;
    state.timeRemainingMs = Math.max(0, state.totalAllocatedMs - msElapsed);

    return state;
  }

  /**
   * Obtém todos os timeouts de um ride
   */
  getRideTimeouts(rideId: string): TimeoutState[] {
    const timeoutIds = this.rideTimeouts.get(rideId);
    if (!timeoutIds) {
      return [];
    }

    return Array.from(timeoutIds)
      .map(id => this.getStatus(id))
      .filter((state): state is TimeoutState => state !== null);
  }

  /**
   * Cancela todos os timeouts de um ride
   */
  async cancelRideTimeouts(rideId: string, reason: string = 'ride_cleanup'): Promise<void> {
    const timeoutIds = this.rideTimeouts.get(rideId);
    if (!timeoutIds) {
      return;
    }

    const ids = Array.from(timeoutIds);
    for (const id of ids) {
      await this.cancel(id, reason);
    }

    this.rideTimeouts.delete(rideId);
  }

  /**
   * Expira um timeout (chamado internamente pelo timer)
   */
  private async expire(timeoutId: string): Promise<void> {
    try {
      const stored = this.timeouts.get(timeoutId);
      if (!stored) {
        return;
      }

      const { state, listeners, config } = stored;

      state.status = TimeoutStatus.EXPIRED;
      state.lastActivityAt = new Date();
      state.expireReason = 'timeout_exceeded';

      // Criar resultado
      const result: TimeoutResult = {
        timeoutId,
        type: state.type,
        rideId: state.rideId,
        expired: true,
        finalStatus: TimeoutStatus.EXPIRED,
        totalTimeUsedMs: Date.now() - state.createdAt.getTime(),
        totalAllocatedMs: state.totalAllocatedMs,
        extensionCount: state.extensionAttempts,
        reason: 'timeout_exceeded',
        completedAt: new Date(),
      };

      // Chamar callback de expiração se configurado
      if (config.onExpire) {
        try {
          await config.onExpire();
        } catch (err) {
          Logger.error('TimeoutManager', `Error in onExpire callback: ${err}`);
        }
      }

      // Notificar listeners
      for (const listener of listeners) {
        if (listener.onExpired) {
          try {
            await listener.onExpired(result);
          } catch (err) {
            Logger.error('TimeoutManager', `Error in onExpired listener: ${err}`);
          }
        }
      }

      // Remover
      this.timeouts.delete(timeoutId);
      this.rideTimeouts.get(config.rideId)?.delete(timeoutId);

      Logger.warn('TimeoutManager', `Timeout expired: ${timeoutId} (${state.type}, ride: ${state.rideId})`);
    } catch (err) {
      Logger.error('TimeoutManager', `Error expiring timeout: ${err}`);
    }
  }

  /**
   * Inicializa limpeza periódica
   */
  private initCleanupInterval(intervalMs: number): void {
    this.cleanupInterval = setInterval(async () => {
      try {
        const expiredIds: string[] = [];

        for (const [id, stored] of this.timeouts.entries()) {
          const { state } = stored;

          // Se status é EXPIRED e já foi processado, remover
          if (state.status === TimeoutStatus.EXPIRED) {
            expiredIds.push(id);
          }

          // Se completado, remover
          if (state.status === TimeoutStatus.COMPLETED) {
            expiredIds.push(id);
          }

          // Se cancelado, remover
          if (state.status === TimeoutStatus.CANCELLED) {
            expiredIds.push(id);
          }
        }

        for (const id of expiredIds) {
          const stored = this.timeouts.get(id);
          if (stored) {
            this.timeouts.delete(id);
            this.rideTimeouts.get(stored.config.rideId)?.delete(id);
          }
        }

        if (expiredIds.length > 0) {
          Logger.debug('TimeoutManager', `Cleanup interval: removed ${expiredIds.length} expired timeouts`);
        }
      } catch (err) {
        Logger.error('TimeoutManager', `Error in cleanup interval: ${err}`);
      }
    }, intervalMs);
  }

  /**
   * Adiciona listener a um timeout existente
   */
  addListener(timeoutId: string, listener: TimeoutEventListener): boolean {
    const stored = this.timeouts.get(timeoutId);
    if (!stored) {
      return false;
    }

    stored.listeners.push(listener);
    return true;
  }

  /**
   * Obtém estatísticas
   */
  getStats() {
    return {
      totalTimeouts: this.timeouts.size,
      rideCount: this.rideTimeouts.size,
      timeoutsByStatus: {
        pending: Array.from(this.timeouts.values()).filter(t => t.state.status === TimeoutStatus.PENDING).length,
        active: Array.from(this.timeouts.values()).filter(t => t.state.status === TimeoutStatus.ACTIVE).length,
        extended: Array.from(this.timeouts.values()).filter(t => t.state.status === TimeoutStatus.EXTENDED).length,
      },
    };
  }

  /**
   * Limpa todos os recursos
   */
  async destroy(): Promise<void> {
    try {
      // Limpar todos os timeouts
      for (const [id, stored] of this.timeouts.entries()) {
        if (stored.timer) {
          clearTimeout(stored.timer);
        }
      }

      this.timeouts.clear();
      this.rideTimeouts.clear();

      // Limpar interval de cleanup
      if (this.cleanupInterval) {
        clearInterval(this.cleanupInterval);
      }

      Logger.info('TimeoutManager', 'TimeoutManager destroyed');
    } catch (err) {
      Logger.error('TimeoutManager', `Error destroying TimeoutManager: ${err}`);
    }
  }
}
