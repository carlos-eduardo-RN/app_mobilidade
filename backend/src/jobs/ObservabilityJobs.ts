/**
 * Observability Jobs
 * Background jobs for tracing, health checks, and log aggregation
 */

import { JobContext } from './interfaces';
import { TracingService } from '../services/TracingService';
import { HealthCheckManager } from '../services/HealthCheckManager';
import { LogAggregator } from '../services/LogAggregator';
import { PerformanceProfiler } from '../services/PerformanceProfiler';
import { Logger } from '../utils/Logger';

/**
 * Trace Export Job
 * Exporta traces para sistema externo (Jaeger, Zipkin, etc.)
 */
export class TraceExportJob {
  name = 'TraceExportJob';
  schedule = 60000; // 1 minute
  retries = 2;

  async execute(context: JobContext): Promise<void> {
    const tracingService = (context.metadata?.tracingService) as TracingService | undefined;

    if (!tracingService) {
      Logger.warn('TraceExportJob', 'TracingService not available in context');
      return { exported: 0 };
    }

    try {
      // Export traces
      const traces = tracingService.exportTraces();

      // In production, send to Jaeger/Zipkin
      // await sendToJaeger(traces);

      Logger.info('TraceExportJob', 'Traces exported', { count: traces.length });

      // Clear completed spans after export
      tracingService.clearCompletedSpans();

      return {
        exported: traces.length,
        timestamp: new Date(),
      };
    } catch (error) {
      Logger.error('TraceExportJob', 'Trace export failed', { error });
      throw error;
    }
  }

  shouldRetry(attempt: number, error: Error): boolean {
    return attempt < this.retries;
  }
}

/**
 * Health Check Job
 * Executa health checks periódicos
 */
export class HealthCheckJob implements Job {
  name = 'HealthCheckJob';
  schedule = 30000; // 30 seconds
  retries = 1;

  async execute(context: JobContext): Promise<any> {
    const healthCheckManager = context.healthCheckManager as HealthCheckManager;

    if (!healthCheckManager) {
      Logger.warn('HealthCheckJob', 'HealthCheckManager not available in context');
      return { healthy: true };
    }

    try {
      // Run all health checks
      const overall = await healthCheckManager.getOverallHealth();

      Logger.info('HealthCheckJob', 'Health check completed', {
        status: overall.status,
        components: overall.components.length,
      });

      // Alert if unhealthy
      if (overall.status === 'unhealthy') {
        const unhealthyComponents = overall.components.filter(
          (c) => c.status === 'unhealthy',
        );

        Logger.error('HealthCheckJob', 'System unhealthy', {
          unhealthyComponents: unhealthyComponents.map((c) => c.component),
        });

        // In production, trigger alerts
        // await alertManager.triggerAlert('SYSTEM_UNHEALTHY', unhealthyComponents);
      }

      return {
        status: overall.status,
        components: overall.components.length,
        unhealthy: overall.components.filter((c) => c.status === 'unhealthy').length,
        timestamp: new Date(),
      };
    } catch (error) {
      Logger.error('HealthCheckJob', 'Health check failed', { error });
      throw error;
    }
  }

  shouldRetry(attempt: number, error: Error): boolean {
    return attempt < this.retries;
  }
}

/**
 * Log Aggregation Job
 * Agrega e analisa logs periodicamente
 */
export class LogAggregationJob {
  name = 'LogAggregationJob';
  schedule = 600000; // 10 minutes
  retries = 2;

  async execute(context: JobContext): Promise<void> {
    const logAggregator = (context.metadata?.logAggregator) as LogAggregator | undefined;

    if (!logAggregator) {
      Logger.warn('LogAggregationJob', 'LogAggregator not available in context');
      return { analyzed: false };
    }

    try {
      // Analyze patterns
      const patterns = logAggregator.analyzePatterns();

      Logger.info('LogAggregationJob', 'Log patterns analyzed', { count: patterns.length });

      // Detect anomalies
      const anomalies = logAggregator.detectAnomalies();

      if (anomalies.length > 0) {
        Logger.warn('LogAggregationJob', 'Log anomalies detected', {
          count: anomalies.length,
          critical: anomalies.filter((a) => a.severity === 'critical').length,
        });

        // In production, trigger alerts for critical anomalies
        const criticalAnomalies = anomalies.filter((a) => a.severity === 'critical');
        if (criticalAnomalies.length > 0) {
          // await alertManager.triggerAlert('LOG_ANOMALY', criticalAnomalies);
        }
      }

      // Get statistics
      const stats = logAggregator.getStatistics();

      // Get top errors
      const topErrors = logAggregator.getTopErrors(5);

      return {
        patterns: patterns.length,
        anomalies: anomalies.length,
        totalLogs: stats.totalLogs,
        errorRate: stats.errorRate,
        topErrors: topErrors.length,
        timestamp: new Date(),
      };
    } catch (error) {
      Logger.error('LogAggregationJob', 'Log aggregation failed', { error });
      throw error;
    }
  }

  shouldRetry(attempt: number, error: Error): boolean {
    return attempt < this.retries;
  }
}

/**
 * Profile Analysis Job
 * Analisa performance profiles e identifica bottlenecks
 */
export class ProfileAnalysisJob implements Job {
  name = 'ProfileAnalysisJob';
  schedule = 600000; // 10 minutes
  retries = 2;

  async execute(context: JobContext): Promise<any> {
    const profiler = context.performanceProfiler as PerformanceProfiler;

    if (!profiler) {
      Logger.warn('ProfileAnalysisJob', 'PerformanceProfiler not available in context');
      return { analyzed: false };
    }

    try {
      // Get bottlenecks
      const bottlenecks = profiler.getBottlenecks();

      Logger.info('ProfileAnalysisJob', 'Performance bottlenecks analyzed', {
        count: bottlenecks.length,
      });

      // Alert on critical bottlenecks
      const criticalBottlenecks = bottlenecks.filter((b) => b.severity === 'critical');

      if (criticalBottlenecks.length > 0) {
        Logger.warn('ProfileAnalysisJob', 'Critical bottlenecks detected', {
          count: criticalBottlenecks.length,
          operations: criticalBottlenecks.map((b) => b.operation),
        });

        // In production, trigger alerts
        // await alertManager.triggerAlert('PERFORMANCE_BOTTLENECK', criticalBottlenecks);
      }

      // Detect slow operations
      const slowOps = profiler.detectSlowOperations();

      if (slowOps.length > 0) {
        Logger.warn('ProfileAnalysisJob', 'Slow operations detected', {
          count: slowOps.length,
          operations: slowOps.slice(0, 5).map((op) => ({
            operation: op.operation,
            duration: op.duration,
          })),
        });
      }

      // Get operation stats
      const opStats = profiler.getOperationStats();

      // Get database stats
      const dbStats = profiler.getDatabaseStats();

      // Get external call stats
      const extStats = profiler.getExternalCallStats();

      return {
        bottlenecks: bottlenecks.length,
        criticalBottlenecks: criticalBottlenecks.length,
        slowOperations: slowOps.length,
        operations: opStats.length,
        dbQueries: dbStats.totalQueries,
        dbSlowQueries: dbStats.slowQueries,
        externalCalls: extStats.totalCalls,
        externalSlowCalls: extStats.slowCalls,
        timestamp: new Date(),
      };
    } catch (error) {
      Logger.error('ProfileAnalysisJob', 'Profile analysis failed', { error });
      throw error;
    }
  }

  shouldRetry(attempt: number, error: Error): boolean {
    return attempt < this.retries;
  }
}

/**
 * Observability Summary Job
 * Gera resumo completo de observabilidade
 */
export class ObservabilitySummaryJob implements Job {
  name = 'ObservabilitySummaryJob';
  schedule = 1800000; // 30 minutes
  retries = 1;

  async execute(context: JobContext): Promise<any> {
    try {
      const tracingService = context.tracingService as TracingService;
      const healthCheckManager = context.healthCheckManager as HealthCheckManager;
      const logAggregator = context.logAggregator as LogAggregator;
      const profiler = context.performanceProfiler as PerformanceProfiler;

      // Gather all observability data
      const summary: any = {
        timestamp: new Date(),
      };

      // Tracing stats
      if (tracingService) {
        summary.tracing = tracingService.getStats();
      }

      // Health status
      if (healthCheckManager) {
        summary.health = healthCheckManager.getHealthSummary();
      }

      // Log statistics
      if (logAggregator) {
        summary.logs = logAggregator.getStatistics();
        summary.topErrors = logAggregator.getTopErrors(10);
      }

      // Performance stats
      if (profiler) {
        summary.performance = {
          bottlenecks: profiler.getBottlenecks().length,
          slowOperations: profiler.detectSlowOperations().length,
          database: profiler.getDatabaseStats(),
          externalCalls: profiler.getExternalCallStats(),
        };
      }

      Logger.info('ObservabilitySummaryJob', 'Observability summary generated', {
        tracesExported: summary.tracing?.tracesExported || 0,
        healthStatus: summary.health?.healthy || 0,
        totalLogs: summary.logs?.totalLogs || 0,
        bottlenecks: summary.performance?.bottlenecks || 0,
      });

      // In production, save to database or send to monitoring dashboard
      // await database.observabilitySummary.create(summary);

      return summary;
    } catch (error) {
      Logger.error('ObservabilitySummaryJob', 'Observability summary failed', { error });
      throw error;
    }
  }

  shouldRetry(attempt: number, error: Error): boolean {
    return attempt < this.retries;
  }
}
