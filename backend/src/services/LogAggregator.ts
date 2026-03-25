/**
 * Log Aggregator
 * Centralize, index and analyze logs
 */

import { Logger } from '../utils/Logger';
import {
  LogEntry,
  LogQueryFilter,
  LogPattern,
  LogAnomaly,
} from '../models/Observability2';
import { v4 as uuidv4 } from 'uuid';

export class LogAggregator {
  private logs: LogEntry[] = [];
  private patterns: Map<string, LogPattern> = new Map();
  private anomalies: LogAnomaly[] = [];

  // Indexing for fast search
  private correlationIdIndex: Map<string, LogEntry[]> = new Map();
  private traceIdIndex: Map<string, LogEntry[]> = new Map();
  private serviceIndex: Map<string, LogEntry[]> = new Map();

  constructor() {}

  /**
   * Aggregate a log entry
   */
  aggregate(log: LogEntry): void {
    this.logs.push(log);

    // Index by correlation ID
    if (!this.correlationIdIndex.has(log.correlationId)) {
      this.correlationIdIndex.set(log.correlationId, []);
    }
    this.correlationIdIndex.get(log.correlationId)?.push(log);

    // Index by trace ID
    if (log.traceId) {
      if (!this.traceIdIndex.has(log.traceId)) {
        this.traceIdIndex.set(log.traceId, []);
      }
      this.traceIdIndex.get(log.traceId)?.push(log);
    }

    // Index by service
    if (!this.serviceIndex.has(log.service)) {
      this.serviceIndex.set(log.service, []);
    }
    this.serviceIndex.get(log.service)?.push(log);

    // Maintain max size
    if (this.logs.length > 100000) {
      this.pruneOldLogs();
    }

    // Detect patterns
    this.detectPattern(log);
  }

  /**
   * Aggregate multiple logs
   */
  aggregateMany(logs: LogEntry[]): void {
    for (const log of logs) {
      this.aggregate(log);
    }
  }

  /**
   * Search logs
   */
  search(query: string, filters?: LogQueryFilter): LogEntry[] {
    let results = [...this.logs];

    // Apply filters
    if (filters) {
      if (filters.startTime) {
        results = results.filter((log) => log.timestamp >= filters.startTime!);
      }

      if (filters.endTime) {
        results = results.filter((log) => log.timestamp <= filters.endTime!);
      }

      if (filters.correlationId) {
        results = this.correlationIdIndex.get(filters.correlationId) || [];
      }

      if (filters.traceId) {
        results = this.traceIdIndex.get(filters.traceId) || [];
      }

      if (filters.level && filters.level.length > 0) {
        results = results.filter((log) => filters.level!.includes(log.level));
      }

      if (filters.service && filters.service.length > 0) {
        results = results.filter((log) => filters.service!.includes(log.service));
      }

      if (filters.operation && filters.operation.length > 0) {
        results = results.filter((log) => filters.operation!.includes(log.operation));
      }

      if (filters.userId) {
        results = results.filter(
          (log) => log.metadata?.userId === filters.userId,
        );
      }
    }

    // Text search in message
    if (query) {
      const lowerQuery = query.toLowerCase();
      results = results.filter((log) =>
        log.message.toLowerCase().includes(lowerQuery),
      );
    }

    // Apply limit and offset
    const offset = filters?.offset || 0;
    const limit = filters?.limit || 100;

    return results.slice(offset, offset + limit);
  }

  /**
   * Get logs by correlation ID
   */
  getByCorrelationId(correlationId: string): LogEntry[] {
    return this.correlationIdIndex.get(correlationId) || [];
  }

  /**
   * Get logs by trace ID
   */
  getByTraceId(traceId: string): LogEntry[] {
    return this.traceIdIndex.get(traceId) || [];
  }

  /**
   * Get logs by service
   */
  getByService(service: string): LogEntry[] {
    return this.serviceIndex.get(service) || [];
  }

  /**
   * Analyze patterns
   */
  analyzePatterns(): LogPattern[] {
    return Array.from(this.patterns.values()).sort((a, b) => b.count - a.count);
  }

  /**
   * Detect anomalies
   */
  detectAnomalies(): LogAnomaly[] {
    const anomalies: LogAnomaly[] = [];

    // Error rate anomaly
    const errorLogs = this.logs.filter((log) => log.level === 'ERROR');
    const errorRate = (errorLogs.length / this.logs.length) * 100;

    if (errorRate > 5) {
      // More than 5% errors
      anomalies.push({
        id: uuidv4(),
        timestamp: new Date(),
        type: 'spike',
        metric: 'error_rate',
        expected: 2,
        actual: errorRate,
        deviation: errorRate - 2,
        severity: errorRate > 10 ? 'critical' : 'high',
      });
    }

    // Log volume anomaly (spike detection)
    const recentLogs = this.getRecentLogs(5 * 60 * 1000); // Last 5 minutes
    const recentRate = recentLogs.length / 5; // Logs per minute

    const historicalRate = this.logs.length / ((Date.now() - this.logs[0]?.timestamp.getTime()) / 60000 || 1);

    if (recentRate > historicalRate * 2) {
      // 2x increase
      anomalies.push({
        id: uuidv4(),
        timestamp: new Date(),
        type: 'spike',
        metric: 'log_volume',
        expected: historicalRate,
        actual: recentRate,
        deviation: recentRate - historicalRate,
        severity: recentRate > historicalRate * 5 ? 'critical' : 'high',
      });
    }

    // Drop detection
    if (recentRate < historicalRate * 0.5 && historicalRate > 1) {
      // 50% decrease
      anomalies.push({
        id: uuidv4(),
        timestamp: new Date(),
        type: 'drop',
        metric: 'log_volume',
        expected: historicalRate,
        actual: recentRate,
        deviation: historicalRate - recentRate,
        severity: recentRate < historicalRate * 0.2 ? 'critical' : 'medium',
      });
    }

    this.anomalies = anomalies;
    return anomalies;
  }

  /**
   * Get log statistics
   */
  getStatistics(): {
    totalLogs: number;
    byLevel: Record<string, number>;
    byService: Record<string, number>;
    byOperation: Record<string, number>;
    errorRate: number;
    avgDuration: number;
    timeRange: { start: Date; end: Date } | null;
  } {
    if (this.logs.length === 0) {
      return {
        totalLogs: 0,
        byLevel: {},
        byService: {},
        byOperation: {},
        errorRate: 0,
        avgDuration: 0,
        timeRange: null,
      };
    }

    const byLevel: Record<string, number> = {};
    const byService: Record<string, number> = {};
    const byOperation: Record<string, number> = {};
    let totalDuration = 0;
    let durationCount = 0;

    for (const log of this.logs) {
      byLevel[log.level] = (byLevel[log.level] || 0) + 1;
      byService[log.service] = (byService[log.service] || 0) + 1;
      byOperation[log.operation] = (byOperation[log.operation] || 0) + 1;

      if (log.duration !== undefined) {
        totalDuration += log.duration;
        durationCount++;
      }
    }

    const errorLogs = this.logs.filter((log) => log.level === 'ERROR').length;
    const errorRate = (errorLogs / this.logs.length) * 100;

    return {
      totalLogs: this.logs.length,
      byLevel,
      byService,
      byOperation,
      errorRate,
      avgDuration: durationCount > 0 ? totalDuration / durationCount : 0,
      timeRange: {
        start: this.logs[0].timestamp,
        end: this.logs[this.logs.length - 1].timestamp,
      },
    };
  }

  /**
   * Export to Elasticsearch format
   */
  exportToElastic(logs?: LogEntry[]): any[] {
    const logsToExport = logs || this.logs;

    return logsToExport.map((log) => ({
      '@timestamp': log.timestamp.toISOString(),
      level: log.level.toLowerCase(),
      correlation_id: log.correlationId,
      trace_id: log.traceId,
      span_id: log.spanId,
      service: {
        name: log.service,
      },
      message: log.message,
      operation: log.operation,
      duration: log.duration,
      metadata: log.metadata,
    }));
  }

  /**
   * Export to Splunk format
   */
  exportToSplunk(logs?: LogEntry[]): string {
    const logsToExport = logs || this.logs;

    return logsToExport
      .map((log) => {
        const event = {
          time: log.timestamp.getTime() / 1000,
          host: 'vou-de-moto',
          source: log.service,
          sourcetype: 'app:log',
          event: {
            level: log.level,
            correlationId: log.correlationId,
            traceId: log.traceId,
            message: log.message,
            operation: log.operation,
            duration: log.duration,
            ...log.metadata,
          },
        };
        return JSON.stringify(event);
      })
      .join('\n');
  }

  /**
   * Get top errors
   */
  getTopErrors(limit: number = 10): Array<{
    message: string;
    count: number;
    lastSeen: Date;
    service: string;
  }> {
    const errorMap: Map<
      string,
      { message: string; count: number; lastSeen: Date; service: string }
    > = new Map();

    const errors = this.logs.filter((log) => log.level === 'ERROR');

    for (const error of errors) {
      const key = `${error.service}:${error.message}`;
      const existing = errorMap.get(key);

      if (existing) {
        existing.count++;
        existing.lastSeen = error.timestamp;
      } else {
        errorMap.set(key, {
          message: error.message,
          count: 1,
          lastSeen: error.timestamp,
          service: error.service,
        });
      }
    }

    return Array.from(errorMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  /**
   * Get slow operations
   */
  getSlowOperations(threshold: number = 1000): LogEntry[] {
    return this.logs
      .filter((log) => log.duration !== undefined && log.duration > threshold)
      .sort((a, b) => (b.duration || 0) - (a.duration || 0));
  }

  /**
   * Clear old logs
   */
  clear(): void {
    this.logs = [];
    this.patterns.clear();
    this.anomalies = [];
    this.correlationIdIndex.clear();
    this.traceIdIndex.clear();
    this.serviceIndex.clear();
    Logger.info('LogAggregator', 'Logs cleared');
  }

  /**
   * Export all data
   */
  export(): string {
    return JSON.stringify(
      {
        logs: this.logs,
        patterns: this.analyzePatterns(),
        anomalies: this.anomalies,
        statistics: this.getStatistics(),
        topErrors: this.getTopErrors(),
        exportedAt: new Date(),
      },
      null,
      2,
    );
  }

  // Private helper methods

  private detectPattern(log: LogEntry): void {
    // Simple pattern detection based on operation
    const patternKey = `${log.service}:${log.operation}`;
    const existing = this.patterns.get(patternKey);

    if (existing) {
      existing.count++;
      existing.lastSeen = log.timestamp;
      existing.examples.push(log.message);

      // Keep only last 5 examples
      if (existing.examples.length > 5) {
        existing.examples = existing.examples.slice(-5);
      }
    } else {
      this.patterns.set(patternKey, {
        pattern: patternKey,
        count: 1,
        firstSeen: log.timestamp,
        lastSeen: log.timestamp,
        severity: log.level === 'ERROR' ? 'error' : log.level === 'WARN' ? 'warning' : 'info',
        examples: [log.message],
      });
    }
  }

  private pruneOldLogs(): void {
    // Keep only recent 50k logs
    const toRemove = this.logs.slice(0, 50000);
    this.logs = this.logs.slice(50000);

    // Update indices
    for (const log of toRemove) {
      // Remove from correlation ID index
      const corrLogs = this.correlationIdIndex.get(log.correlationId);
      if (corrLogs) {
        const idx = corrLogs.indexOf(log);
        if (idx !== -1) corrLogs.splice(idx, 1);
      }

      // Remove from trace ID index
      if (log.traceId) {
        const traceLogs = this.traceIdIndex.get(log.traceId);
        if (traceLogs) {
          const idx = traceLogs.indexOf(log);
          if (idx !== -1) traceLogs.splice(idx, 1);
        }
      }

      // Remove from service index
      const serviceLogs = this.serviceIndex.get(log.service);
      if (serviceLogs) {
        const idx = serviceLogs.indexOf(log);
        if (idx !== -1) serviceLogs.splice(idx, 1);
      }
    }

    Logger.info('LogAggregator', 'Old logs pruned', { removed: toRemove.length, remaining: this.logs.length });
  }

  private getRecentLogs(milliseconds: number): LogEntry[] {
    const threshold = new Date(Date.now() - milliseconds);
    return this.logs.filter((log) => log.timestamp >= threshold);
  }
}
