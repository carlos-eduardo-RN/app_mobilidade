/**
 * Notification Queue
 * Bull-based job queue for async notification processing
 */

import Bull, { Queue, Job, JobOptions } from 'bull';
import { Notification, NotificationStatus } from '../models/Notification';
import { NotificationService } from './NotificationService';
import { Logger } from '../utils/Logger';

interface NotificationJob {
  notificationId: string;
  notification: Notification;
  retryCount: number;
}

export class NotificationQueue {
  private logger = new Logger('NotificationQueue');
  private queue: Queue<NotificationJob>;
  private notificationService: NotificationService;

  // Queue configuration
  private readonly QUEUE_NAME = 'notifications';
  private readonly REDIS_HOST = process.env.REDIS_HOST || 'localhost';
  private readonly REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379');
  private readonly REDIS_PASSWORD = process.env.REDIS_PASSWORD;

  constructor(notificationService: NotificationService) {
    this.notificationService = notificationService;
    
    // Initialize Bull queue
    this.queue = new Bull(this.QUEUE_NAME, {
      redis: {
        host: this.REDIS_HOST,
        port: this.REDIS_PORT,
        password: this.REDIS_PASSWORD,
      },
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000, // 5 seconds, doubles with each retry
        },
        removeOnComplete: true,
        removeOnFail: false, // Keep failed jobs for debugging
      },
    });

    // Setup queue processors
    this.setupProcessors();
    
    // Setup event listeners
    this.setupListeners();
  }

  /**
   * Add notification to queue
   */
  async enqueue(notification: Notification, options?: JobOptions): Promise<Job<NotificationJob>> {
    const job: NotificationJob = {
      notificationId: notification.id,
      notification,
      retryCount: 0,
    };

    const jobOptions: JobOptions = {
      ...options,
      jobId: notification.id,
      priority: this.getPriority(notification),
    };

    // Add delay for scheduled notifications
    if (notification.scheduledFor) {
      const delay = notification.scheduledFor.getTime() - Date.now();
      if (delay > 0) {
        jobOptions.delay = delay;
      }
    }

    const queuedJob = await this.queue.add(job, jobOptions);

    this.logger.info('Notification enqueued', {
      notificationId: notification.id,
      jobId: queuedJob.id,
      priority: jobOptions.priority,
      delay: jobOptions.delay,
    });

    return queuedJob;
  }

  /**
   * Add multiple notifications to queue
   */
  async enqueueBatch(notifications: Notification[]): Promise<Job<NotificationJob>[]> {
    const jobs = notifications.map(notification => ({
      data: {
        notificationId: notification.id,
        notification,
        retryCount: 0,
      },
      opts: {
        jobId: notification.id,
        priority: this.getPriority(notification),
      },
    }));

    const queuedJobs = await this.queue.addBulk(jobs);

    this.logger.info('Batch notifications enqueued', {
      count: notifications.length,
    });

    return queuedJobs;
  }

  /**
   * Setup queue processors
   */
  private setupProcessors(): void {
    // Process notifications
    this.queue.process(async (job: Job<NotificationJob>) => {
      const { notificationId, notification, retryCount } = job.data;

      this.logger.info('Processing notification', {
        notificationId,
        attempt: job.attemptsMade + 1,
        maxAttempts: job.opts.attempts,
      });

      try {
        // Check if notification expired
        if (notification.expiresAt && new Date() > notification.expiresAt) {
          this.logger.warn('Notification expired', { notificationId });
          throw new Error('Notification expired');
        }

        // Deliver notification
        await this.notificationService.deliver(notificationId);

        this.logger.info('Notification processed successfully', {
          notificationId,
        });

        return { success: true };
      } catch (error) {
        this.logger.error('Notification processing failed', {
          notificationId,
          attempt: job.attemptsMade + 1,
          error,
        });

        // Update job data for retry
        job.data.retryCount = retryCount + 1;

        throw error;
      }
    });
  }

  /**
   * Setup event listeners
   */
  private setupListeners(): void {
    // Job completed
    this.queue.on('completed', (job: Job<NotificationJob>, result: any) => {
      this.logger.info('Job completed', {
        jobId: job.id,
        notificationId: job.data.notificationId,
        result,
      });
    });

    // Job failed
    this.queue.on('failed', (job: Job<NotificationJob>, error: Error) => {
      this.logger.error('Job failed', {
        jobId: job.id,
        notificationId: job.data.notificationId,
        attempts: job.attemptsMade,
        error: error.message,
      });

      // Update notification status if all attempts exhausted
      if (job.attemptsMade >= (job.opts.attempts || 3)) {
        const notification = this.notificationService.getNotification(job.data.notificationId);
        if (notification) {
          notification.status = NotificationStatus.FAILED;
          notification.updatedAt = new Date();
        }
      }
    });

    // Job retry
    this.queue.on('retry', (job: Job<NotificationJob>, error: Error) => {
      this.logger.warn('Job retry', {
        jobId: job.id,
        notificationId: job.data.notificationId,
        attempt: job.attemptsMade,
        error: error.message,
      });
    });

    // Job stalled (taking too long)
    this.queue.on('stalled', (job: Job<NotificationJob>) => {
      this.logger.warn('Job stalled', {
        jobId: job.id,
        notificationId: job.data.notificationId,
      });
    });

    // Queue error
    this.queue.on('error', (error: Error) => {
      this.logger.error('Queue error', { error });
    });
  }

  /**
   * Get job priority based on notification priority
   */
  private getPriority(notification: Notification): number {
    // Bull uses lower numbers for higher priority
    switch (notification.priority) {
      case 'URGENT':
        return 1;
      case 'HIGH':
        return 2;
      case 'NORMAL':
        return 3;
      case 'LOW':
        return 4;
      default:
        return 3;
    }
  }

  /**
   * Get job by ID
   */
  async getJob(jobId: string): Promise<Job<NotificationJob> | null> {
    return this.queue.getJob(jobId);
  }

  /**
   * Remove job from queue
   */
  async removeJob(jobId: string): Promise<void> {
    const job = await this.getJob(jobId);
    if (job) {
      await job.remove();
      this.logger.info('Job removed', { jobId });
    }
  }

  /**
   * Retry failed job
   */
  async retryJob(jobId: string): Promise<void> {
    const job = await this.getJob(jobId);
    if (job && (await job.isFailed())) {
      await job.retry();
      this.logger.info('Job retried', { jobId });
    }
  }

  /**
   * Get queue statistics
   */
  async getStats(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
    paused: number;
  }> {
    const [waiting, active, completed, failed, delayed, paused] = await Promise.all([
      this.queue.getWaitingCount(),
      this.queue.getActiveCount(),
      this.queue.getCompletedCount(),
      this.queue.getFailedCount(),
      this.queue.getDelayedCount(),
      this.queue.getPausedCount(),
    ]);

    return {
      waiting,
      active,
      completed,
      failed,
      delayed,
      paused,
    };
  }

  /**
   * Get failed jobs
   */
  async getFailedJobs(start = 0, end = 10): Promise<Job<NotificationJob>[]> {
    return this.queue.getFailed(start, end);
  }

  /**
   * Get delayed jobs
   */
  async getDelayedJobs(start = 0, end = 10): Promise<Job<NotificationJob>[]> {
    return this.queue.getDelayed(start, end);
  }

  /**
   * Get active jobs
   */
  async getActiveJobs(start = 0, end = 10): Promise<Job<NotificationJob>[]> {
    return this.queue.getActive(start, end);
  }

  /**
   * Get waiting jobs
   */
  async getWaitingJobs(start = 0, end = 10): Promise<Job<NotificationJob>[]> {
    return this.queue.getWaiting(start, end);
  }

  /**
   * Clean old completed jobs
   */
  async cleanCompleted(olderThan: number = 24 * 3600 * 1000): Promise<Job<NotificationJob>[]> {
    return this.queue.clean(olderThan, 'completed');
  }

  /**
   * Clean old failed jobs
   */
  async cleanFailed(olderThan: number = 7 * 24 * 3600 * 1000): Promise<Job<NotificationJob>[]> {
    return this.queue.clean(olderThan, 'failed');
  }

  /**
   * Pause queue
   */
  async pause(): Promise<void> {
    await this.queue.pause();
    this.logger.info('Queue paused');
  }

  /**
   * Resume queue
   */
  async resume(): Promise<void> {
    await this.queue.resume();
    this.logger.info('Queue resumed');
  }

  /**
   * Empty queue (remove all jobs)
   */
  async empty(): Promise<void> {
    await this.queue.empty();
    this.logger.warn('Queue emptied');
  }

  /**
   * Close queue connection
   */
  async close(): Promise<void> {
    await this.queue.close();
    this.logger.info('Queue closed');
  }

  /**
   * Get queue instance (for advanced usage)
   */
  getQueue(): Queue<NotificationJob> {
    return this.queue;
  }

  /**
   * Schedule recurring notification cleanup job
   */
  async scheduleCleanup(cronExpression = '0 2 * * *'): Promise<void> {
    // Run daily at 2 AM
    await this.queue.add(
      {
        notificationId: 'cleanup',
        notification: {} as any,
        retryCount: 0,
      },
      {
        repeat: {
          cron: cronExpression,
        },
        jobId: 'cleanup-job',
      }
    );

    this.logger.info('Cleanup job scheduled', { cron: cronExpression });
  }

  /**
   * Get queue health status
   */
  async getHealth(): Promise<{
    isHealthy: boolean;
    stats: any;
    issues: string[];
  }> {
    const issues: string[] = [];
    const stats = await this.getStats();

    // Check for high failure rate
    const totalJobs = stats.completed + stats.failed;
    if (totalJobs > 0) {
      const failureRate = (stats.failed / totalJobs) * 100;
      if (failureRate > 10) {
        issues.push(`High failure rate: ${failureRate.toFixed(2)}%`);
      }
    }

    // Check for stalled jobs
    if (stats.active > 100) {
      issues.push(`Too many active jobs: ${stats.active}`);
    }

    // Check for delayed jobs accumulation
    if (stats.delayed > 1000) {
      issues.push(`Too many delayed jobs: ${stats.delayed}`);
    }

    return {
      isHealthy: issues.length === 0,
      stats,
      issues,
    };
  }
}
