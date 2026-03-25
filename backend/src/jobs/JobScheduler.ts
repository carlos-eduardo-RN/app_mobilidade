/**
 * Job Scheduler Implementation
 * Gerencia execução de background jobs com retry logic
 */

import { v4 as uuid } from 'uuid';
import { Logger } from '../utils/Logger';
import {
  IBackgroundJob,
  IJobScheduler,
  JobContext,
  JobResult,
  JobStatus,
  ScheduleOptions,
  ScheduledJob,
} from './interfaces';

export class JobScheduler implements IJobScheduler {
  private jobs: Map<string, ScheduledJob> = new Map();
  private timers: Map<string, NodeJS.Timeout> = new Map();
  private paused: boolean = false;

  constructor(
    private maxConcurrentJobs: number = 5,
    private cleanupIntervalMs: number = 60000 // 1 minuto
  ) {
    this.startCleanupInterval();
  }

  schedule(
    job: IBackgroundJob,
    delayMs: number,
    options?: ScheduleOptions
  ): string {
    const jobId = uuid();

    const scheduledJob: ScheduledJob = {
      jobId,
      job,
      scheduledFor: new Date(Date.now() + delayMs),
      status: JobStatus.PENDING,
      attempt: 0,
      maxRetries: options?.maxRetries ?? 3,
      retryDelayMs: options?.retryDelayMs ?? 1000,
      backoffMultiplier: options?.backoffMultiplier ?? 2,
      timeout: options?.timeout,
      tags: options?.tags,
      createdAt: new Date(),
    };

    this.jobs.set(jobId, scheduledJob);

    const timer = setTimeout(() => {
      this.executeJob(jobId).catch((err) => {
        Logger.error('JobScheduler', 'Job execution error', { jobId, error: err.message });
      });
    }, delayMs);

    this.timers.set(jobId, timer);

    Logger.info('JobScheduler', 'Job scheduled', {
      jobId,
      delayMs,
      job: job.getId(),
    });

    return jobId;
  }

  cancel(jobId: string): boolean {
    const job = this.jobs.get(jobId);
    if (!job) return false;

    if (job.status === JobStatus.RUNNING) {
      // Não pode cancelar job em execução
      return false;
    }

    const timer = this.timers.get(jobId);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(jobId);
    }

    job.status = JobStatus.CANCELLED;
    Logger.info('JobScheduler', 'Job cancelled', { jobId });

    return true;
  }

  getStatus(jobId: string): JobStatus | null {
    const job = this.jobs.get(jobId);
    return job ? job.status : null;
  }

  /**
   * Obtém job completo (para uso interno)
   */
  getJob(jobId: string): ScheduledJob | null {
    return this.jobs.get(jobId) ?? null;
  }

  getPendingJobs(): JobStatus[] {
    return Array.from(this.jobs.values())
      .filter(
        (job) =>
          job.status === JobStatus.PENDING || job.status === JobStatus.RETRYING
      )
      .map(job => job.status);
  }

  cleanup(): void {
    const now = Date.now();
    const maxAgeMs = 24 * 60 * 60 * 1000; // 24 horas

    for (const [jobId, job] of this.jobs) {
      if (
        (job.status === JobStatus.COMPLETED ||
          job.status === JobStatus.FAILED ||
          job.status === JobStatus.CANCELLED) &&
        now - job.createdAt.getTime() > maxAgeMs
      ) {
        this.jobs.delete(jobId);
        this.timers.delete(jobId);
      }
    }

    Logger.debug('JobScheduler', 'Cleanup completed', {
      remainingJobs: this.jobs.size,
    });
  }

  pause(): void {
    this.paused = true;
    Logger.info('JobScheduler', 'Scheduler paused');
  }

  resume(): void {
    this.paused = false;
    Logger.info('JobScheduler', 'Scheduler resumed');

    // Re-schedule pending jobs
    for (const [jobId, job] of this.jobs) {
      if (
        (job.status === JobStatus.PENDING || job.status === JobStatus.RETRYING) &&
        !this.timers.has(jobId)
      ) {
        const delayMs = Math.max(
          0,
          job.scheduledFor.getTime() - Date.now()
        );
        const timer = setTimeout(() => {
          this.executeJob(jobId).catch((err) => {
            Logger.error('JobScheduler', 'Job execution error on resume', {
              jobId,
              error: err.message,
            });
          });
        }, delayMs);
        this.timers.set(jobId, timer);
      }
    }
  }

  async destroy(): Promise<void> {
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.timers.clear();
    this.jobs.clear();
    Logger.info('JobScheduler', 'Scheduler destroyed');
  }

  /**
   * Executa um job agendado
   */
  private async executeJob(jobId: string): Promise<void> {
    if (this.paused) {
      Logger.debug('JobScheduler', 'Job skipped (scheduler paused)', { jobId });
      return;
    }

    const job = this.jobs.get(jobId);
    if (!job) {
      Logger.warn('JobScheduler', 'Job not found', { jobId });
      return;
    }

    if (job.status !== JobStatus.PENDING && job.status !== JobStatus.RETRYING) {
      Logger.debug('JobScheduler', 'Job already processed', { jobId, status: job.status });
      return;
    }

    job.status = JobStatus.RUNNING;
    job.executedAt = new Date();
    job.attempt++;

    const jobContext: JobContext = {
      jobId,
      startedAt: new Date(),
      attempt: job.attempt,
      retryable: job.attempt <= job.maxRetries,
      metadata: {},
    };

    try {
      Logger.info('JobScheduler', 'Job execution started', {
        jobId,
        job: job.job.getId(),
        attempt: job.attempt,
      });

      const timeoutPromise = job.timeout
        ? new Promise<JobResult>((_, reject) =>
            setTimeout(
              () => reject(new Error('Job timeout')),
              job.timeout!
            )
          )
        : null;

      const executionPromise = job.job.execute(jobContext);

      const result = timeoutPromise
        ? await Promise.race([executionPromise, timeoutPromise])
        : await executionPromise;

      if (result.success) {
        job.status = JobStatus.COMPLETED;
        job.result = result;
        job.completedAt = new Date();

        Logger.info('JobScheduler', 'Job completed', {
          jobId,
          job: job.job.getId(),
          duration: job.completedAt.getTime() - job.executedAt!.getTime(),
        });

        if (job.job.onSuccess) {
          await job.job.onSuccess(result, jobContext);
        }
      } else {
        // Job falhou, decidir se retry
        const shouldRetry = result.shouldRetry !== false && job.attempt < job.maxRetries;

        if (shouldRetry) {
          job.status = JobStatus.RETRYING;
          const nextDelayMs =
            result.nextRetryIn ??
            job.retryDelayMs * Math.pow(job.backoffMultiplier, job.attempt - 1);

          Logger.info('JobScheduler', 'Job will be retried', {
            jobId,
            job: job.job.getId(),
            nextDelayMs,
            attempt: job.attempt,
          });

          this.schedule(job.job, nextDelayMs, {
            maxRetries: job.maxRetries - job.attempt,
            retryDelayMs: job.retryDelayMs,
            backoffMultiplier: job.backoffMultiplier,
            timeout: job.timeout,
            tags: job.tags,
          });
        } else {
          job.status = JobStatus.FAILED;
          job.error = result.error;
          job.failedAt = new Date();

          Logger.error('JobScheduler', 'Job permanently failed', {
            jobId,
            job: job.job.getId(),
            error: result.error,
            attempts: job.attempt,
          });

          if (job.job.onFailed) {
            await job.job.onFailed(
              new Error(result.error),
              jobContext
            );
          }
        }
      }
    } catch (error: any) {
      const err = error as Error;
      const shouldRetry = job.attempt < job.maxRetries;

      if (shouldRetry) {
        job.status = JobStatus.RETRYING;
        const nextDelayMs = job.retryDelayMs * Math.pow(job.backoffMultiplier, job.attempt - 1);

        Logger.warn('JobScheduler', 'Job execution error, will retry', {
          jobId,
          job: job.job.getId(),
          error: err.message,
          nextDelayMs,
          attempt: job.attempt,
        });

        this.schedule(job.job, nextDelayMs, {
          maxRetries: job.maxRetries - job.attempt,
          retryDelayMs: job.retryDelayMs,
          backoffMultiplier: job.backoffMultiplier,
          timeout: job.timeout,
          tags: job.tags,
        });
      } else {
        job.status = JobStatus.FAILED;
        job.error = err.message;
        job.failedAt = new Date();

        Logger.error('JobScheduler', 'Job permanently failed with error', {
          jobId,
          job: job.job.getId(),
          error: err.message,
          attempts: job.attempt,
        });

        if (job.job.onFailed) {
          await job.job.onFailed(err, jobContext);
        }
      }
    }

    this.timers.delete(jobId);
  }

  /**
   * Limpar jobs finalizados periodicamente
   */
  private startCleanupInterval(): void {
    setInterval(() => {
      this.cleanup();
    }, this.cleanupIntervalMs);
  }
}
