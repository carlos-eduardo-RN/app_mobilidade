/**
 * Metrics Collector
 * Coleta, agrega e rastreia métricas de timeouts, rides e drivers
 */

import { Logger } from '../utils/Logger';
import {
  MetricType,
  MetricData,
  MetricsAggregation,
  HealthCheck,
  HealthStatus,
  TrendAnalysis,
} from '../models/Observability';

interface MetricsStorage {
  [key: string]: MetricData[];
}

export class MetricsCollector {
  private metrics: MetricsStorage = {};
  private aggregations: Map<string, MetricsAggregation> = new Map();
  private retentionMs = 24 * 60 * 60 * 1000; // 24 horas
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(cleanupIntervalMs: number = 60_000) {
    this.initCleanupInterval(cleanupIntervalMs);
    Logger.info('MetricsCollector', 'MetricsCollector initialized');
  }

  /**
   * Registra uma métrica
   */
  recordMetric(data: MetricData): void {
    try {
      const key = `${data.type}`;

      if (!this.metrics[key]) {
        this.metrics[key] = [];
      }

      this.metrics[key].push(data);

      Logger.debug('MetricsCollector', `Metric recorded: ${data.type} = ${data.value}${data.unit}`, {
        tags: data.tags,
      });
    } catch (err) {
      Logger.error('MetricsCollector', `Error recording metric: ${err}`);
    }
  }

  /**
   * Obtém métricas de um tipo em um período
   */
  getMetrics(
    type: MetricType,
    startTime: Date,
    endTime: Date
  ): MetricData[] {
    const key = `${type}`;
    if (!this.metrics[key]) {
      return [];
    }

    return this.metrics[key].filter(
      (m) => m.timestamp >= startTime && m.timestamp <= endTime
    );
  }

  /**
   * Obtém todas as métricas de um tipo
   */
  getAllMetrics(type: MetricType): MetricData[] {
    const key = `${type}`;
    return this.metrics[key] || [];
  }

  /**
   * Calcula agregação para um período
   */
  calculateAggregation(
    period: 'minute' | 'hour' | 'day'
  ): MetricsAggregation {
    const now = new Date();
    let startTime: Date;

    switch (period) {
      case 'minute':
        startTime = new Date(now.getTime() - 60_000);
        break;
      case 'hour':
        startTime = new Date(now.getTime() - 60 * 60_000);
        break;
      case 'day':
        startTime = new Date(now.getTime() - 24 * 60 * 60_000);
        break;
    }

    const aggregation: MetricsAggregation = {
      period,
      startTime,
      endTime: now,
      metrics: {},
    };

    // Processar cada tipo de métrica
    for (const type of Object.values(MetricType)) {
      const metrics = this.getMetrics(type as MetricType, startTime, now);

      if (metrics.length > 0) {
        const values = metrics.map((m) => m.value).sort((a, b) => a - b);

        aggregation.metrics[type as MetricType] = {
          count: metrics.length,
          sum: values.reduce((a, b) => a + b, 0),
          avg: values.reduce((a, b) => a + b, 0) / values.length,
          min: values[0],
          max: values[values.length - 1],
          p50: this.percentile(values, 50),
          p95: this.percentile(values, 95),
          p99: this.percentile(values, 99),
        };
      }
    }

    return aggregation;
  }

  /**
   * Calcula percentil
   */
  private percentile(sorted: number[], p: number): number {
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  /**
   * Obtém análise de tendência
   */
  getTrendAnalysis(type: MetricType, periods: number = 3): TrendAnalysis {
    const now = new Date();
    const hourAgo = new Date(now.getTime() - 60 * 60_000);
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60_000);

    const recent = this.getMetrics(type, hourAgo, now);
    const previous = this.getMetrics(type, twoHoursAgo, hourAgo);

    const recentAvg = recent.length > 0
      ? recent.reduce((a, m) => a + m.value, 0) / recent.length
      : 0;

    const previousAvg = previous.length > 0
      ? previous.reduce((a, m) => a + m.value, 0) / previous.length
      : 0;

    const change = previousAvg > 0
      ? ((recentAvg - previousAvg) / previousAvg) * 100
      : 0;

    const trend: 'up' | 'down' | 'stable' = 
      change > 10 ? 'up' : change < -10 ? 'down' : 'stable';

    return {
      metric: type,
      trend,
      percentageChange: change,
      period: { from: twoHoursAgo, to: now },
      forecast: {
        nextHour: recentAvg * (1 + change / 100),
        nextDay: recentAvg,
        confidence: Math.min(100, recent.length * 10),
      },
    };
  }

  /**
   * Calcula taxa de sucesso de matching
   */
  getMatchingSuccessRate(periodMinutes: number = 60): number {
    const now = new Date();
    const startTime = new Date(now.getTime() - periodMinutes * 60_000);

    const attempts = this.getMetrics(MetricType.MATCHING_ATTEMPT, startTime, now);
    const successes = this.getMetrics(MetricType.MATCHING_SUCCESS, startTime, now);

    if (attempts.length === 0) {
      return 0;
    }

    return (successes.length / attempts.length) * 100;
  }

  /**
   * Calcula taxa de aceitação de drivers
   */
  getDriverAcceptanceRate(periodMinutes: number = 60): number {
    const now = new Date();
    const startTime = new Date(now.getTime() - periodMinutes * 60_000);

    const assigned = this.getMetrics(MetricType.RIDE_DRIVER_ASSIGNED, startTime, now);
    const accepted = this.getMetrics(MetricType.RIDE_DRIVER_ACCEPTED, startTime, now);

    if (assigned.length === 0) {
      return 0;
    }

    return (accepted.length / assigned.length) * 100;
  }

  /**
   * Calcula tempo médio de matching
   */
  getAverageMatchingTime(periodMinutes: number = 60): number {
    const now = new Date();
    const startTime = new Date(now.getTime() - periodMinutes * 60_000);

    const metrics = this.getMetrics(MetricType.MATCHING_AVG_DURATION, startTime, now);

    if (metrics.length === 0) {
      return 0;
    }

    return metrics.reduce((sum, m) => sum + m.value, 0) / metrics.length;
  }

  /**
   * Calcula taxa de timeout
   */
  getTimeoutRate(periodMinutes: number = 60): number {
    const now = new Date();
    const startTime = new Date(now.getTime() - periodMinutes * 60_000);

    const rides = this.getMetrics(MetricType.RIDE_CREATED, startTime, now);
    const timeouts = this.getMetrics(MetricType.TIMEOUT_EXPIRED, startTime, now);

    if (rides.length === 0) {
      return 0;
    }

    return (timeouts.length / rides.length) * 100;
  }

  /**
   * Verifica saúde do sistema
   */
  getHealthStatus(): HealthCheck {
    const matchingRate = this.getMatchingSuccessRate();
    const acceptanceRate = this.getDriverAcceptanceRate();
    const timeoutRate = this.getTimeoutRate();
    const avgMatchingTime = this.getAverageMatchingTime();

    let overallStatus = HealthStatus.HEALTHY;

    if (timeoutRate > 20 || acceptanceRate < 50 || matchingRate < 60) {
      overallStatus = HealthStatus.CRITICAL;
    } else if (timeoutRate > 15 || acceptanceRate < 70 || avgMatchingTime > 45_000) {
      overallStatus = HealthStatus.DEGRADED;
    }

    return {
      status: overallStatus,
      timestamp: new Date(),
      components: {
        database: HealthStatus.HEALTHY, // Placeholder
        matching: matchingRate > 80 ? HealthStatus.HEALTHY : HealthStatus.DEGRADED,
        timeouts: timeoutRate < 20 ? HealthStatus.HEALTHY : HealthStatus.CRITICAL,
        drivers: acceptanceRate > 70 ? HealthStatus.HEALTHY : HealthStatus.DEGRADED,
        rides: HealthStatus.HEALTHY, // Placeholder
      },
      metrics: {
        timeoutRate,
        matchingSuccess: matchingRate,
        driverOnlineRate: acceptanceRate,
        systemLoad: (timeoutRate + (100 - matchingRate)) / 2,
      },
      alerts: [],
    };
  }

  /**
   * Obtém estatísticas resumidas
   */
  getSummary(periodMinutes: number = 60) {
    const now = new Date();
    const startTime = new Date(now.getTime() - periodMinutes * 60_000);

    return {
      period: { startTime, endTime: now },
      metrics: {
        totalRides: this.getMetrics(MetricType.RIDE_CREATED, startTime, now).length,
        completedRides: this.getMetrics(MetricType.RIDE_COMPLETED, startTime, now).length,
        cancelledRides: this.getMetrics(MetricType.RIDE_CANCELLED, startTime, now).length,
        timeouts: this.getMetrics(MetricType.TIMEOUT_EXPIRED, startTime, now).length,
        matchingAttempts: this.getMetrics(MetricType.MATCHING_ATTEMPT, startTime, now).length,
        matchingSuccesses: this.getMetrics(MetricType.MATCHING_SUCCESS, startTime, now).length,
      },
      rates: {
        timeoutRate: this.getTimeoutRate(periodMinutes),
        matchingSuccessRate: this.getMatchingSuccessRate(periodMinutes),
        driverAcceptanceRate: this.getDriverAcceptanceRate(periodMinutes),
        rideCompletionRate: this.getRideCompletionRate(periodMinutes),
      },
      averages: {
        matchingTime: this.getAverageMatchingTime(periodMinutes),
      },
    };
  }

  /**
   * Calcula taxa de conclusão de rides
   */
  private getRideCompletionRate(periodMinutes: number = 60): number {
    const now = new Date();
    const startTime = new Date(now.getTime() - periodMinutes * 60_000);

    const created = this.getMetrics(MetricType.RIDE_CREATED, startTime, now);
    const completed = this.getMetrics(MetricType.RIDE_COMPLETED, startTime, now);

    if (created.length === 0) {
      return 0;
    }

    return (completed.length / created.length) * 100;
  }

  /**
   * Inicializa limpeza periódica
   */
  private initCleanupInterval(intervalMs: number): void {
    this.cleanupInterval = setInterval(() => {
      try {
        const now = Date.now();

        for (const key of Object.keys(this.metrics)) {
          this.metrics[key] = this.metrics[key].filter(
            (m) => now - m.timestamp.getTime() < this.retentionMs
          );

          if (this.metrics[key].length === 0) {
            delete this.metrics[key];
          }
        }

        Logger.debug('MetricsCollector', 'Metrics cleanup completed');
      } catch (err) {
        Logger.error('MetricsCollector', `Error in cleanup: ${err}`);
      }
    }, intervalMs);
  }

  /**
   * Exporta métricas em formato JSON
   */
  export() {
    return {
      timestamp: new Date(),
      metrics: this.metrics,
      summary: this.getSummary(),
      health: this.getHealthStatus(),
    };
  }

  /**
   * Limpa todos os dados (para testes)
   */
  clear(): void {
    this.metrics = {};
    this.aggregations.clear();
    Logger.info('MetricsCollector', 'All metrics cleared');
  }

  /**
   * Limpa recursos
   */
  async destroy(): Promise<void> {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    this.metrics = {};
    this.aggregations.clear();
    Logger.info('MetricsCollector', 'MetricsCollector destroyed');
  }
}
