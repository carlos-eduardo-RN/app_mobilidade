/**
 * Background Jobs Interfaces
 * Define contrato para jobs executados assincronamente
 */

export interface JobContext {
  jobId: string;
  startedAt: Date;
  attempt: number;
  retryable: boolean;
  metadata?: Record<string, any>;
}

export interface JobResult {
  success: boolean;
  data?: any;
  error?: string;
  nextRetryIn?: number; // milliseconds
  shouldRetry?: boolean;
}

export interface IBackgroundJob {
  /**
   * Identificador único do job
   */
  getId(): string;

  /**
   * Executa o job com contexto fornecido
   */
  execute(context: JobContext): Promise<JobResult>;

  /**
   * Handler chamado se o job falhar permanentemente
   */
  onFailed?(error: Error, context: JobContext): Promise<void>;

  /**
   * Handler chamado se o job for bem-sucedido
   */
  onSuccess?(result: JobResult, context: JobContext): Promise<void>;
}

export interface IJobScheduler {
  /**
   * Agenda um job para ser executado
   */
  schedule(
    job: IBackgroundJob,
    delayMs: number,
    options?: ScheduleOptions
  ): string; // retorna jobId

  /**
   * Cancela um job agendado
   */
  cancel(jobId: string): boolean;

  /**
   * Obtém status de um job
   */
  getStatus(jobId: string): JobStatus | null;

  /**
   * Obtém todos os jobs pendentes
   */
  getPendingJobs(): JobStatus[];

  /**
   * Limpa jobs finalizados
   */
  cleanup(): void;

  /**
   * Pausa todos os jobs
   */
  pause(): void;

  /**
   * Resume todos os jobs
   */
  resume(): void;

  /**
   * Destrói o scheduler e limpa recursos
   */
  destroy(): Promise<void>;
}

export enum JobStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
  RETRYING = 'RETRYING',
}

export interface ScheduleOptions {
  maxRetries?: number;
  retryDelayMs?: number;
  backoffMultiplier?: number;
  timeout?: number;
  tags?: string[];
}

export interface ScheduledJob {
  jobId: string;
  job: IBackgroundJob;
  scheduledFor: Date;
  status: JobStatus;
  attempt: number;
  maxRetries: number;
  retryDelayMs: number;
  backoffMultiplier: number;
  timeout?: number;
  tags?: string[];
  createdAt: Date;
  executedAt?: Date;
  completedAt?: Date;
  failedAt?: Date;
  error?: string;
  result?: JobResult;
}
