/**
 * Performance Profiler
 * CPU, Memory, Database and Performance Analysis
 */

import { Logger } from '../utils/Logger';
import {
  ProfileSession,
  ProfileReport,
  Bottleneck,
  SlowOperation,
  FlameGraphNode,
  DatabaseQueryLog,
  ExternalCallLog,
} from '../models/Observability2';
import { v4 as uuidv4 } from 'uuid';

export class PerformanceProfiler {
  private activeSessions: Map<string, ProfileSession> = new Map();
  private completedReports: ProfileReport[] = [];
  private databaseQueries: DatabaseQueryLog[] = [];
  private externalCalls: ExternalCallLog[] = [];
  private slowOperations: SlowOperation[] = [];
  private slowOperationThreshold: number;

  // Performance tracking
  private operationStartTimes: Map<string, number> = new Map();
  private operationMetrics: Map<
    string,
    {
      count: number;
      totalDuration: number;
      minDuration: number;
      maxDuration: number;
    }
  > = new Map();

  constructor(slowOperationThreshold: number = 1000) {
    this.slowOperationThreshold = slowOperationThreshold;
  }

  /**
   * Iniciar profile session
   */
  startProfile(operation: string, correlationId: string): ProfileSession {
    const session: ProfileSession = {
      id: uuidv4(),
      operation,
      startTime: new Date(),
      correlationId,
    };

    this.activeSessions.set(session.id, session);
    this.operationStartTimes.set(session.id, performance.now());

    Logger.debug('PerformanceProfiler', 'Profile session started', {
      sessionId: session.id,
      operation,
    });

    return session;
  }

  /**
   * Finalizar profile session
   */
  endProfile(session: ProfileSession): ProfileReport {
    const activeSession = this.activeSessions.get(session.id);
    if (!activeSession) {
      Logger.warn('PerformanceProfiler', 'Profile session not found', { sessionId: session.id });
      return this.createEmptyReport(session);
    }

    const endTime = new Date();
    const startPerfTime = this.operationStartTimes.get(session.id) || performance.now();
    const duration = performance.now() - startPerfTime;

    // Get memory usage
    const memoryUsage = this.getMemoryUsage();

    // Get CPU usage (approximation)
    const cpuUsage = this.getCPUUsage();

    // Get database queries for this session
    const dbQueries = this.databaseQueries.filter(
      (q) => q.correlationId === session.correlationId,
    );

    // Get external calls for this session
    const extCalls = this.externalCalls.filter(
      (c) => c.correlationId === session.correlationId,
    );

    // Identify bottlenecks
    const bottlenecks = this.identifyBottlenecks(duration, dbQueries, extCalls);

    const report: ProfileReport = {
      sessionId: session.id,
      operation: session.operation,
      startTime: session.startTime,
      endTime,
      duration,
      cpuUsage,
      memoryUsage,
      databaseQueries: dbQueries.length,
      externalCalls: extCalls.length,
      bottlenecks,
      metadata: {
        correlationId: session.correlationId,
        dbQueryTime: dbQueries.reduce((sum, q) => sum + q.duration, 0),
        externalCallTime: extCalls.reduce((sum, c) => sum + c.duration, 0),
      },
    };

    // Check if slow operation
    if (duration > this.slowOperationThreshold) {
      this.recordSlowOperation(session, duration);
    }

    // Update operation metrics
    this.updateOperationMetrics(session.operation, duration);

    // Store report
    this.completedReports.push(report);
    if (this.completedReports.length > 1000) {
      this.completedReports = this.completedReports.slice(-500);
    }

    // Cleanup
    this.activeSessions.delete(session.id);
    this.operationStartTimes.delete(session.id);

    Logger.info('PerformanceProfiler', 'Profile session completed', {
      sessionId: session.id,
      duration,
      bottlenecks: bottlenecks.length,
    });

    return report;
  }

  /**
   * Track database query
   */
  trackDatabaseQuery(
    correlationId: string,
    query: string,
    duration: number,
    options?: {
      database?: string;
      rowsAffected?: number;
    },
  ): DatabaseQueryLog {
    const log: DatabaseQueryLog = {
      id: uuidv4(),
      timestamp: new Date(),
      correlationId,
      query: this.sanitizeQuery(query),
      duration,
      rowsAffected: options?.rowsAffected,
      database: options?.database || 'default',
      operation: this.detectQueryOperation(query),
    };

    this.databaseQueries.push(log);

    // Maintain limit
    if (this.databaseQueries.length > 10000) {
      this.databaseQueries = this.databaseQueries.slice(-5000);
    }

    // Log slow queries
    if (duration > 100) {
      Logger.warn('PerformanceProfiler', 'Slow database query detected', {
        correlationId,
        duration,
        operation: log.operation,
      });
    }

    return log;
  }

  /**
   * Track external call
   */
  trackExternalCall(
    correlationId: string,
    service: string,
    method: string,
    url: string,
    duration: number,
    options?: {
      statusCode?: number;
      error?: string;
    },
  ): ExternalCallLog {
    const log: ExternalCallLog = {
      id: uuidv4(),
      timestamp: new Date(),
      correlationId,
      service,
      method,
      url,
      duration,
      statusCode: options?.statusCode,
      error: options?.error,
    };

    this.externalCalls.push(log);

    // Maintain limit
    if (this.externalCalls.length > 10000) {
      this.externalCalls = this.externalCalls.slice(-5000);
    }

    // Log slow calls
    if (duration > 500) {
      Logger.warn('PerformanceProfiler', 'Slow external call detected', {
        correlationId,
        service,
        duration,
      });
    }

    return log;
  }

  /**
   * Detect slow operations
   */
  detectSlowOperations(threshold?: number): SlowOperation[] {
    const effectiveThreshold = threshold || this.slowOperationThreshold;
    return this.slowOperations.filter((op) => op.duration > effectiveThreshold);
  }

  /**
   * Get bottlenecks across all operations
   */
  getBottlenecks(): Bottleneck[] {
    const allBottlenecks: Bottleneck[] = [];

    for (const report of this.completedReports) {
      allBottlenecks.push(...report.bottlenecks);
    }

    // Aggregate by operation
    const bottleneckMap: Map<string, Bottleneck> = new Map();

    for (const bottleneck of allBottlenecks) {
      const key = `${bottleneck.operation}_${bottleneck.type}`;
      const existing = bottleneckMap.get(key);

      if (existing) {
        existing.duration += bottleneck.duration;
        existing.percentage = (existing.percentage + bottleneck.percentage) / 2;
      } else {
        bottleneckMap.set(key, { ...bottleneck });
      }
    }

    return Array.from(bottleneckMap.values()).sort((a, b) => b.duration - a.duration);
  }

  /**
   * Generate flame graph
   */
  generateFlameGraph(): FlameGraphNode {
    const root: FlameGraphNode = {
      name: 'root',
      value: 0,
      children: [],
    };

    // Group operations by name
    const operationGroups: Map<string, number> = new Map();

    for (const report of this.completedReports) {
      const existing = operationGroups.get(report.operation) || 0;
      operationGroups.set(report.operation, existing + report.duration);
    }

    // Build flame graph
    for (const [operation, totalDuration] of operationGroups.entries()) {
      root.children.push({
        name: operation,
        value: totalDuration,
        children: [],
      });
      root.value += totalDuration;
    }

    // Sort by value
    root.children.sort((a, b) => b.value - a.value);

    return root;
  }

  /**
   * Get operation statistics
   */
  getOperationStats(operation?: string): Array<{
    operation: string;
    count: number;
    avgDuration: number;
    minDuration: number;
    maxDuration: number;
    totalDuration: number;
  }> {
    const stats: Array<{
      operation: string;
      count: number;
      avgDuration: number;
      minDuration: number;
      maxDuration: number;
      totalDuration: number;
    }> = [];

    for (const [op, metrics] of this.operationMetrics.entries()) {
      if (operation && op !== operation) continue;

      stats.push({
        operation: op,
        count: metrics.count,
        avgDuration: metrics.totalDuration / metrics.count,
        minDuration: metrics.minDuration,
        maxDuration: metrics.maxDuration,
        totalDuration: metrics.totalDuration,
      });
    }

    return stats.sort((a, b) => b.avgDuration - a.avgDuration);
  }

  /**
   * Get database query statistics
   */
  getDatabaseStats(): {
    totalQueries: number;
    avgDuration: number;
    slowQueries: number;
    byOperation: Record<string, number>;
  } {
    if (this.databaseQueries.length === 0) {
      return {
        totalQueries: 0,
        avgDuration: 0,
        slowQueries: 0,
        byOperation: {},
      };
    }

    const totalDuration = this.databaseQueries.reduce((sum, q) => sum + q.duration, 0);
    const slowQueries = this.databaseQueries.filter((q) => q.duration > 100).length;

    const byOperation: Record<string, number> = {};
    for (const query of this.databaseQueries) {
      byOperation[query.operation] = (byOperation[query.operation] || 0) + 1;
    }

    return {
      totalQueries: this.databaseQueries.length,
      avgDuration: totalDuration / this.databaseQueries.length,
      slowQueries,
      byOperation,
    };
  }

  /**
   * Get external call statistics
   */
  getExternalCallStats(): {
    totalCalls: number;
    avgDuration: number;
    slowCalls: number;
    errorRate: number;
    byService: Record<string, number>;
  } {
    if (this.externalCalls.length === 0) {
      return {
        totalCalls: 0,
        avgDuration: 0,
        slowCalls: 0,
        errorRate: 0,
        byService: {},
      };
    }

    const totalDuration = this.externalCalls.reduce((sum, c) => sum + c.duration, 0);
    const slowCalls = this.externalCalls.filter((c) => c.duration > 500).length;
    const errorCalls = this.externalCalls.filter((c) => c.error).length;

    const byService: Record<string, number> = {};
    for (const call of this.externalCalls) {
      byService[call.service] = (byService[call.service] || 0) + 1;
    }

    return {
      totalCalls: this.externalCalls.length,
      avgDuration: totalDuration / this.externalCalls.length,
      slowCalls,
      errorRate: (errorCalls / this.externalCalls.length) * 100,
      byService,
    };
  }

  /**
   * Clear old data
   */
  clear(): void {
    this.completedReports = [];
    this.databaseQueries = [];
    this.externalCalls = [];
    this.slowOperations = [];
    this.operationMetrics.clear();
    Logger.info('PerformanceProfiler', 'Performance data cleared');
  }

  /**
   * Export report
   */
  export(): string {
    return JSON.stringify(
      {
        reports: this.completedReports,
        bottlenecks: this.getBottlenecks(),
        operationStats: this.getOperationStats(),
        databaseStats: this.getDatabaseStats(),
        externalCallStats: this.getExternalCallStats(),
        slowOperations: this.slowOperations,
        exportedAt: new Date(),
      },
      null,
      2,
    );
  }

  // Private helper methods

  private getMemoryUsage(): number {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const usage = process.memoryUsage();
      return usage.heapUsed / 1024 / 1024; // MB
    }
    return 0;
  }

  private getCPUUsage(): number {
    if (typeof process !== 'undefined' && process.cpuUsage) {
      const usage = process.cpuUsage();
      return (usage.user + usage.system) / 1000000; // Convert to seconds
    }
    return 0;
  }

  private identifyBottlenecks(
    totalDuration: number,
    dbQueries: DatabaseQueryLog[],
    extCalls: ExternalCallLog[],
  ): Bottleneck[] {
    const bottlenecks: Bottleneck[] = [];

    // Database bottleneck
    const dbTime = dbQueries.reduce((sum, q) => sum + q.duration, 0);
    if (dbTime > totalDuration * 0.3) {
      bottlenecks.push({
        operation: 'database',
        duration: dbTime,
        percentage: (dbTime / totalDuration) * 100,
        type: 'database',
        severity: this.calculateSeverity((dbTime / totalDuration) * 100),
      });
    }

    // External calls bottleneck
    const extTime = extCalls.reduce((sum, c) => sum + c.duration, 0);
    if (extTime > totalDuration * 0.3) {
      bottlenecks.push({
        operation: 'external_calls',
        duration: extTime,
        percentage: (extTime / totalDuration) * 100,
        type: 'network',
        severity: this.calculateSeverity((extTime / totalDuration) * 100),
      });
    }

    // CPU bottleneck (inferred)
    const accountedTime = dbTime + extTime;
    const cpuTime = totalDuration - accountedTime;
    if (cpuTime > totalDuration * 0.4) {
      bottlenecks.push({
        operation: 'cpu_processing',
        duration: cpuTime,
        percentage: (cpuTime / totalDuration) * 100,
        type: 'cpu',
        severity: this.calculateSeverity((cpuTime / totalDuration) * 100),
      });
    }

    return bottlenecks;
  }

  private calculateSeverity(percentage: number): 'low' | 'medium' | 'high' | 'critical' {
    if (percentage > 70) return 'critical';
    if (percentage > 50) return 'high';
    if (percentage > 30) return 'medium';
    return 'low';
  }

  private recordSlowOperation(session: ProfileSession, duration: number): void {
    const slowOp: SlowOperation = {
      id: uuidv4(),
      operation: session.operation,
      duration,
      threshold: this.slowOperationThreshold,
      timestamp: new Date(),
      correlationId: session.correlationId,
    };

    this.slowOperations.push(slowOp);

    // Maintain limit
    if (this.slowOperations.length > 1000) {
      this.slowOperations = this.slowOperations.slice(-500);
    }

    Logger.warn('PerformanceProfiler', 'Slow operation detected', {
      operation: session.operation,
      duration,
      threshold: this.slowOperationThreshold,
    });
  }

  private updateOperationMetrics(operation: string, duration: number): void {
    const existing = this.operationMetrics.get(operation);

    if (existing) {
      existing.count++;
      existing.totalDuration += duration;
      existing.minDuration = Math.min(existing.minDuration, duration);
      existing.maxDuration = Math.max(existing.maxDuration, duration);
    } else {
      this.operationMetrics.set(operation, {
        count: 1,
        totalDuration: duration,
        minDuration: duration,
        maxDuration: duration,
      });
    }
  }

  private sanitizeQuery(query: string): string {
    // Remove sensitive data from queries
    return query.replace(/('.*?'|".*?")/g, "'***'").substring(0, 200);
  }

  private detectQueryOperation(query: string): 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'OTHER' {
    const normalized = query.trim().toUpperCase();
    if (normalized.startsWith('SELECT')) return 'SELECT';
    if (normalized.startsWith('INSERT')) return 'INSERT';
    if (normalized.startsWith('UPDATE')) return 'UPDATE';
    if (normalized.startsWith('DELETE')) return 'DELETE';
    return 'OTHER';
  }

  private createEmptyReport(session: ProfileSession): ProfileReport {
    return {
      sessionId: session.id,
      operation: session.operation,
      startTime: session.startTime,
      endTime: new Date(),
      duration: 0,
      cpuUsage: 0,
      memoryUsage: 0,
      databaseQueries: 0,
      externalCalls: 0,
      bottlenecks: [],
      metadata: {},
    };
  }
}
