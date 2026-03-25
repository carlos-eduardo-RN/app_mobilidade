/**
 * Matching Job
 * Background job que executa tentativas de matching automático
 */

import { IBackgroundJob, JobContext, JobResult } from './interfaces';
import { Logger } from '../utils/Logger';

export interface MatchingJobDependencies {
  rideId: string;
  passengerId: string;
  onMatch: (driverId: string) => Promise<void>;
  onFailed: (reason: string) => Promise<void>;
  findBestDriver: (rideId: string, radiusKm: number) => Promise<string | null>;
  getRideById: (rideId: string) => Promise<any>;
}

export class MatchingJob implements IBackgroundJob {
  private id: string;

  constructor(
    id: string,
    private deps: MatchingJobDependencies,
    private currentRadiusKm: number = 3,
    private maxRadiusKm: number = 15,
    private expandRadiusKmPerAttempt: number = 1
  ) {
    this.id = id;
  }

  getId(): string {
    return this.id;
  }

  async execute(context: JobContext): Promise<JobResult> {
    const { rideId, passengerId, onMatch, onFailed, findBestDriver } = this.deps;

    try {
      Logger.info('MatchingJob', 'MatchingJob executing', {
        jobId: this.id,
        rideId,
        attempt: context.attempt,
        radiusKm: this.currentRadiusKm,
      });

      // Encontrar melhor motorista com raio atual
      const driverId = await findBestDriver(rideId, this.currentRadiusKm);

      if (driverId) {
        Logger.info('MatchingJob', 'MatchingJob: Driver found', {
          jobId: this.id,
          rideId,
          driverId,
          radiusKm: this.currentRadiusKm,
        });

        await onMatch(driverId);

        return {
          success: true,
          data: { driverId, radiusKm: this.currentRadiusKm },
        };
      }

      // Nenhum motorista encontrado nesta tentativa
      const nextRadiusKm = Math.min(
        this.currentRadiusKm + this.expandRadiusKmPerAttempt,
        this.maxRadiusKm
      );

      const reachedMaxRadius = nextRadiusKm >= this.maxRadiusKm;

      Logger.info('MatchingJob', 'MatchingJob: No driver found', {
        jobId: this.id,
        rideId,
        attempt: context.attempt,
        currentRadius: this.currentRadiusKm,
        nextRadius: nextRadiusKm,
        reachedMaxRadius,
      });

      if (reachedMaxRadius && context.attempt >= 4) {
        // Falha permanente após atingir raio máximo e número máximo de tentativas
        await onFailed('No drivers available in maximum radius after all attempts');

        return {
          success: false,
          error: 'No drivers available',
          shouldRetry: false,
        };
      }

      // Atualizar raio para próxima tentativa
      this.currentRadiusKm = nextRadiusKm;

      // Retry com delay progressivo
      const delayMs = 15000 * Math.pow(1.5, context.attempt - 1); // 15s, 22.5s, 33.75s, 50.6s

      return {
        success: false,
        error: 'No drivers found in radius',
        shouldRetry: true,
        nextRetryIn: Math.min(delayMs, 60000), // máx 60s
      };
    } catch (error: any) {
      Logger.error('MatchingJob', 'MatchingJob error', {
        jobId: this.id,
        rideId,
        error: error.message,
      });

      return {
        success: false,
        error: error.message,
        shouldRetry: context.retryable,
      };
    }
  }

  async onSuccess?(result: JobResult, context: JobContext): Promise<void> {
    Logger.info('MatchingJob', 'MatchingJob succeeded', {
      jobId: this.id,
      attemptCount: context.attempt,
      result: result.data,
    });
  }

  async onFailed?(error: Error, context: JobContext): Promise<void> {
    Logger.error('MatchingJob', 'MatchingJob failed permanently', {
      jobId: this.id,
      error: error.message,
      attemptCount: context.attempt,
    });
  }
}
