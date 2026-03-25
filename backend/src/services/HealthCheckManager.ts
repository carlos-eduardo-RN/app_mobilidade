/**
 * Health Check Manager
 * System health monitoring and checks
 */

import { Logger } from '../utils/Logger';
import { HealthStatus, HealthStatusType, OverallHealth } from '../models/Observability2';

export type HealthCheckFunction = () => Promise<HealthStatus>;

export class HealthCheckManager {
  private healthChecks: Map<string, HealthCheckFunction> = new Map();
  private lastResults: Map<string, HealthStatus> = new Map();
  private startTime: Date = new Date();

  constructor() {
    // Register default health checks
    this.registerDefaultChecks();
  }

  /**
   * Register default health checks
   */
  private registerDefaultChecks(): void {
    this.registerHealthCheck('memory', () => this.checkMemory());
    this.registerHealthCheck('cpu', () => this.checkCPU());
    this.registerHealthCheck('uptime', () => this.checkUptime());
  }

  /**
   * Register a health check
   */
  registerHealthCheck(name: string, checkFunction: HealthCheckFunction): void {
    this.healthChecks.set(name, checkFunction);
    Logger.info('HealthCheckManager', 'Health check registered', { name });
  }

  /**
   * Unregister a health check
   */
  unregisterHealthCheck(name: string): void {
    this.healthChecks.delete(name);
    this.lastResults.delete(name);
    Logger.info('HealthCheckManager', 'Health check unregistered', { name });
  }

  /**
   * Check database health
   */
  async checkDatabase(connectionTest?: () => Promise<boolean>): Promise<HealthStatus> {
    const startTime = Date.now();

    try {
      const isConnected = connectionTest ? await connectionTest() : true;

      const status: HealthStatus = {
        status: isConnected ? 'healthy' : 'unhealthy',
        component: 'database',
        responseTime: Date.now() - startTime,
        lastCheck: new Date(),
        message: isConnected ? 'Database connection OK' : 'Database connection failed',
        details: {
          connected: isConnected,
        },
      };

      this.lastResults.set('database', status);
      return status;
    } catch (error) {
      const status: HealthStatus = {
        status: 'unhealthy',
        component: 'database',
        responseTime: Date.now() - startTime,
        lastCheck: new Date(),
        message: error instanceof Error ? error.message : 'Database check failed',
        details: {
          error: error instanceof Error ? error.message : String(error),
        },
      };

      this.lastResults.set('database', status);
      return status;
    }
  }

  /**
   * Check external service health
   */
  async checkExternalService(
    serviceName: string,
    healthCheckUrl: string,
    timeout: number = 5000,
  ): Promise<HealthStatus> {
    const startTime = Date.now();

    try {
      // Simulate HTTP request (in real implementation, use fetch or axios)
      const isReachable = await this.pingService(healthCheckUrl, timeout);

      const responseTime = Date.now() - startTime;

      const status: HealthStatus = {
        status: isReachable ? 'healthy' : 'unhealthy',
        component: serviceName,
        responseTime,
        lastCheck: new Date(),
        message: isReachable ? `${serviceName} is reachable` : `${serviceName} is unreachable`,
        details: {
          url: healthCheckUrl,
          reachable: isReachable,
        },
      };

      this.lastResults.set(serviceName, status);
      return status;
    } catch (error) {
      const status: HealthStatus = {
        status: 'unhealthy',
        component: serviceName,
        responseTime: Date.now() - startTime,
        lastCheck: new Date(),
        message: error instanceof Error ? error.message : 'Service check failed',
        details: {
          url: healthCheckUrl,
          error: error instanceof Error ? error.message : String(error),
        },
      };

      this.lastResults.set(serviceName, status);
      return status;
    }
  }

  /**
   * Check memory health
   */
  async checkMemory(): Promise<HealthStatus> {
    const startTime = Date.now();

    try {
      if (typeof process === 'undefined' || !process.memoryUsage) {
        return this.createHealthStatus('memory', 'healthy', Date.now() - startTime, 'Memory check not available');
      }

      const usage = process.memoryUsage();
      const heapUsedMB = usage.heapUsed / 1024 / 1024;
      const heapTotalMB = usage.heapTotal / 1024 / 1024;
      const heapUsagePercent = (heapUsedMB / heapTotalMB) * 100;

      let status: HealthStatusType = 'healthy';
      let message = 'Memory usage is normal';

      if (heapUsagePercent > 90) {
        status = 'unhealthy';
        message = 'Memory usage is critical';
      } else if (heapUsagePercent > 75) {
        status = 'degraded';
        message = 'Memory usage is high';
      }

      const healthStatus: HealthStatus = {
        status,
        component: 'memory',
        responseTime: Date.now() - startTime,
        lastCheck: new Date(),
        message,
        details: {
          heapUsedMB: heapUsedMB.toFixed(2),
          heapTotalMB: heapTotalMB.toFixed(2),
          heapUsagePercent: heapUsagePercent.toFixed(2),
          rssMB: (usage.rss / 1024 / 1024).toFixed(2),
        },
      };

      this.lastResults.set('memory', healthStatus);
      return healthStatus;
    } catch (error) {
      return this.createErrorStatus('memory', Date.now() - startTime, error);
    }
  }

  /**
   * Check CPU health
   */
  async checkCPU(): Promise<HealthStatus> {
    const startTime = Date.now();

    try {
      if (typeof process === 'undefined' || !process.cpuUsage) {
        return this.createHealthStatus('cpu', 'healthy', Date.now() - startTime, 'CPU check not available');
      }

      const usage = process.cpuUsage();
      const totalCPU = (usage.user + usage.system) / 1000000; // Convert to seconds

      let status: HealthStatusType = 'healthy';
      let message = 'CPU usage is normal';

      // Note: This is a simplified check. Real CPU % would require OS-level monitoring
      if (totalCPU > 10) {
        status = 'degraded';
        message = 'CPU usage is elevated';
      }

      const healthStatus: HealthStatus = {
        status,
        component: 'cpu',
        responseTime: Date.now() - startTime,
        lastCheck: new Date(),
        message,
        details: {
          userCPU: (usage.user / 1000000).toFixed(2),
          systemCPU: (usage.system / 1000000).toFixed(2),
          totalCPU: totalCPU.toFixed(2),
        },
      };

      this.lastResults.set('cpu', healthStatus);
      return healthStatus;
    } catch (error) {
      return this.createErrorStatus('cpu', Date.now() - startTime, error);
    }
  }

  /**
   * Check disk space (placeholder - requires OS-level implementation)
   */
  async checkDiskSpace(): Promise<HealthStatus> {
    const startTime = Date.now();

    // Placeholder - would require 'diskusage' or similar package
    const healthStatus: HealthStatus = {
      status: 'healthy',
      component: 'disk',
      responseTime: Date.now() - startTime,
      lastCheck: new Date(),
      message: 'Disk space check not implemented',
      details: {
        available: 'N/A',
        total: 'N/A',
        usagePercent: 'N/A',
      },
    };

    this.lastResults.set('disk', healthStatus);
    return healthStatus;
  }

  /**
   * Check uptime
   */
  async checkUptime(): Promise<HealthStatus> {
    const startTime = Date.now();

    try {
      const uptime = Date.now() - this.startTime.getTime();
      const uptimeSeconds = Math.floor(uptime / 1000);
      const uptimeMinutes = Math.floor(uptimeSeconds / 60);
      const uptimeHours = Math.floor(uptimeMinutes / 60);

      const healthStatus: HealthStatus = {
        status: 'healthy',
        component: 'uptime',
        responseTime: Date.now() - startTime,
        lastCheck: new Date(),
        message: `System running for ${uptimeHours}h ${uptimeMinutes % 60}m`,
        details: {
          uptimeSeconds,
          uptimeMinutes,
          uptimeHours,
          startTime: this.startTime.toISOString(),
        },
      };

      this.lastResults.set('uptime', healthStatus);
      return healthStatus;
    } catch (error) {
      return this.createErrorStatus('uptime', Date.now() - startTime, error);
    }
  }

  /**
   * Run all health checks
   */
  async checkAll(): Promise<HealthStatus[]> {
    const results: HealthStatus[] = [];

    for (const [name, checkFunction] of this.healthChecks.entries()) {
      try {
        const result = await checkFunction();
        results.push(result);
      } catch (error) {
        Logger.error('HealthCheckManager', 'Health check failed', { name, error });
        results.push(
          this.createErrorStatus(name, 0, error),
        );
      }
    }

    return results;
  }

  /**
   * Get overall health
   */
  async getOverallHealth(): Promise<OverallHealth> {
    const components = await this.checkAll();

    // Determine overall status
    let overallStatus: HealthStatusType = 'healthy';

    if (components.some((c) => c.status === 'unhealthy')) {
      overallStatus = 'unhealthy';
    } else if (components.some((c) => c.status === 'degraded')) {
      overallStatus = 'degraded';
    }

    const uptime = Date.now() - this.startTime.getTime();

    return {
      status: overallStatus,
      timestamp: new Date(),
      components,
      uptime,
      version: '1.0.0', // Would come from package.json
    };
  }

  /**
   * Get last result for a component
   */
  getLastResult(component: string): HealthStatus | undefined {
    return this.lastResults.get(component);
  }

  /**
   * Get all last results
   */
  getAllLastResults(): HealthStatus[] {
    return Array.from(this.lastResults.values());
  }

  /**
   * Check if system is healthy
   */
  async isHealthy(): Promise<boolean> {
    const overall = await this.getOverallHealth();
    return overall.status === 'healthy';
  }

  /**
   * Get health summary
   */
  getHealthSummary(): {
    total: number;
    healthy: number;
    degraded: number;
    unhealthy: number;
  } {
    const results = this.getAllLastResults();

    return {
      total: results.length,
      healthy: results.filter((r) => r.status === 'healthy').length,
      degraded: results.filter((r) => r.status === 'degraded').length,
      unhealthy: results.filter((r) => r.status === 'unhealthy').length,
    };
  }

  /**
   * Clear all results
   */
  clear(): void {
    this.lastResults.clear();
    Logger.info('HealthCheckManager', 'Health check results cleared');
  }

  /**
   * Export health data
   */
  export(): string {
    return JSON.stringify(
      {
        overall: this.getHealthSummary(),
        components: this.getAllLastResults(),
        uptime: Date.now() - this.startTime.getTime(),
        exportedAt: new Date(),
      },
      null,
      2,
    );
  }

  // Private helper methods

  private async pingService(url: string, timeout: number): Promise<boolean> {
    // Placeholder - in real implementation, use fetch or axios with timeout
    return new Promise((resolve) => {
      setTimeout(() => {
        // Simulate 95% success rate
        resolve(Math.random() > 0.05);
      }, Math.random() * 100);
    });
  }

  private createHealthStatus(
    component: string,
    status: HealthStatusType,
    responseTime: number,
    message: string,
    details?: any,
  ): HealthStatus {
    const healthStatus: HealthStatus = {
      status,
      component,
      responseTime,
      lastCheck: new Date(),
      message,
      details,
    };

    this.lastResults.set(component, healthStatus);
    return healthStatus;
  }

  private createErrorStatus(component: string, responseTime: number, error: any): HealthStatus {
    return this.createHealthStatus(
      component,
      'unhealthy',
      responseTime,
      error instanceof Error ? error.message : 'Health check failed',
      {
        error: error instanceof Error ? error.message : String(error),
      },
    );
  }
}
