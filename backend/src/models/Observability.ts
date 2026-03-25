/**
 * Observability Models Domain
 * Interfaces e tipos para métricas, alertas e dashboards
 */

/**
 * Tipos de métrica coletadas
 */
export enum MetricType {
  // Timeout Metrics
  TIMEOUT_STARTED = 'timeout_started',
  TIMEOUT_EXPIRED = 'timeout_expired',
  TIMEOUT_CANCELLED = 'timeout_cancelled',
  TIMEOUT_EXTENDED = 'timeout_extended',
  TIMEOUT_COMPLETED = 'timeout_completed',

  // Ride Metrics
  RIDE_CREATED = 'ride_created',
  RIDE_DRIVER_ASSIGNED = 'ride_driver_assigned',
  RIDE_DRIVER_ACCEPTED = 'ride_driver_accepted',
  RIDE_STARTED = 'ride_started',
  RIDE_COMPLETED = 'ride_completed',
  RIDE_CANCELLED = 'ride_cancelled',

  // Driver Metrics
  DRIVER_CAME_ONLINE = 'driver_came_online',
  DRIVER_WENT_OFFLINE = 'driver_went_offline',
  DRIVER_ACCEPTANCE_RATE = 'driver_acceptance_rate',
  DRIVER_RESPONSE_TIME = 'driver_response_time',

  // Matching Metrics
  MATCHING_ATTEMPT = 'matching_attempt',
  MATCHING_SUCCESS = 'matching_success',
  MATCHING_FAILURE = 'matching_failure',
  MATCHING_AVG_DURATION = 'matching_avg_duration',
}

/**
 * Dados de uma métrica individual
 */
export interface MetricData {
  type: MetricType;
  value: number;
  unit: string; // 'count', 'ms', '%', 'ratio'
  timestamp: Date;
  tags?: Record<string, string>; // rideId, driverId, status, etc
  dimensions?: {
    rideId?: string;
    driverId?: string;
    passengerId?: string;
    status?: string;
    region?: string;
  };
}

/**
 * Agregação de métricas por período
 */
export interface MetricsAggregation {
  period: 'minute' | 'hour' | 'day';
  startTime: Date;
  endTime: Date;
  metrics: {
    [key in MetricType]?: {
      count: number;
      sum: number;
      avg: number;
      min: number;
      max: number;
      p50: number;
      p95: number;
      p99: number;
    };
  };
}

/**
 * Configuração de alerta
 */
export interface AlertConfig {
  alertId: string;
  name: string;
  description: string;
  enabled: boolean;
  rule: AlertRule;
  actions: AlertAction[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Tipos de alerta
 */
export enum AlertLevel {
  INFO = 'info',
  WARNING = 'warning',
  CRITICAL = 'critical',
}

/**
 * Regra de alerta
 */
export interface AlertRule {
  metric: MetricType;
  condition: 'greater_than' | 'less_than' | 'equals' | 'not_equals' | 'range';
  threshold: number | { min: number; max: number };
  duration: number; // segundos
  evaluationPeriod: number; // segundos
}

/**
 * Ação de alerta
 */
export interface AlertAction {
  type: 'email' | 'webhook' | 'log' | 'slack' | 'sms';
  destination?: string; // email, webhook URL, slack channel
  template?: string; // mensagem customizada
}

/**
 * Disparo de alerta
 */
export interface AlertTriggered {
  alertId: string;
  name: string;
  level: AlertLevel;
  message: string;
  metric: MetricType;
  value: number;
  threshold: number;
  timestamp: Date;
  actions: AlertAction[];
}

/**
 * Dados do dashboard
 */
export interface DashboardData {
  period: {
    startTime: Date;
    endTime: Date;
  };
  summary: {
    totalRides: number;
    completedRides: number;
    cancelledRides: number;
    averageMatchingTime: number;
    averageResponseTime: number;
    driverAcceptanceRate: number;
    timeoutIncidents: number;
  };
  timeoutMetrics: {
    total: number;
    byType: Record<string, number>;
    expirations: number;
    extensions: number;
    cancellations: number;
  };
  rideMetrics: {
    created: number;
    assigned: number;
    accepted: number;
    completed: number;
    cancelled: number;
    averageDuration: number;
  };
  driverMetrics: {
    activeDrivers: number;
    offlineDrivers: number;
    averageAcceptanceRate: number;
    topPerformers: Array<{
      driverId: string;
      ridesCompleted: number;
      acceptanceRate: number;
      averageRating: number;
    }>;
  };
  alerts: {
    total: number;
    critical: number;
    warning: number;
    info: number;
    recent: AlertTriggered[];
  };
  anomalies: Array<{
    type: string;
    description: string;
    severity: AlertLevel;
    timestamp: Date;
  }>;
}

/**
 * Predefinições de alertas comuns
 */
export const COMMON_ALERTS = {
  HIGH_TIMEOUT_RATE: {
    name: 'Taxa Alta de Timeouts',
    description: 'Mais de 20% das corridas com timeout',
    metric: MetricType.TIMEOUT_EXPIRED,
    condition: 'greater_than' as const,
    threshold: 20,
    duration: 300, // 5 minutos
    level: AlertLevel.CRITICAL,
  },

  LOW_DRIVER_ACCEPTANCE: {
    name: 'Baixa Taxa de Aceitação de Drivers',
    description: 'Menos de 70% de aceitação',
    metric: MetricType.DRIVER_ACCEPTANCE_RATE,
    condition: 'less_than' as const,
    threshold: 70,
    duration: 600, // 10 minutos
    level: AlertLevel.WARNING,
  },

  MATCHING_DELAY: {
    name: 'Atraso no Matching',
    description: 'Tempo médio de matching > 45 segundos',
    metric: MetricType.MATCHING_AVG_DURATION,
    condition: 'greater_than' as const,
    threshold: 45000, // 45s em ms
    duration: 300,
    level: AlertLevel.WARNING,
  },

  DRIVER_OFFLINE_SURGE: {
    name: 'Queda de Drivers Online',
    description: 'Menos de 30% de drivers online',
    metric: MetricType.DRIVER_CAME_ONLINE,
    condition: 'less_than' as const,
    threshold: 30,
    duration: 180,
    level: AlertLevel.CRITICAL,
  },

  RIDE_CANCELLATION_SPIKE: {
    name: 'Pico de Cancelamentos',
    description: 'Mais de 15% de cancelamentos',
    metric: MetricType.RIDE_CANCELLED,
    condition: 'greater_than' as const,
    threshold: 15,
    duration: 300,
    level: AlertLevel.WARNING,
  },
};

/**
 * Limites e thresholds recomendados
 */
export const RECOMMENDED_THRESHOLDS = {
  timeout: {
    driverAccept: 30_000, // 30s
    matching: 60_000, // 60s
    rideInactivity: 300_000, // 5min
  },
  performance: {
    maxMatchingTime: 45_000, // 45s
    minDriverAcceptanceRate: 70, // 70%
    maxTimeoutRate: 20, // 20%
  },
  alerts: {
    criticalAfter: 5, // 5 incidentes críticos
    warningAfter: 15, // 15 avisos
  },
};

/**
 * Status de saúde do sistema
 */
export enum HealthStatus {
  HEALTHY = 'healthy',
  DEGRADED = 'degraded',
  CRITICAL = 'critical',
  OFFLINE = 'offline',
}

/**
 * Verificação de saúde
 */
export interface HealthCheck {
  status: HealthStatus;
  timestamp: Date;
  components: {
    database: HealthStatus;
    matching: HealthStatus;
    timeouts: HealthStatus;
    drivers: HealthStatus;
    rides: HealthStatus;
  };
  metrics: {
    timeoutRate: number;
    matchingSuccess: number;
    driverOnlineRate: number;
    systemLoad: number;
  };
  alerts: AlertTriggered[];
}

/**
 * Análise de tendências
 */
export interface TrendAnalysis {
  metric: MetricType;
  trend: 'up' | 'down' | 'stable';
  percentageChange: number;
  period: { from: Date; to: Date };
  forecast?: {
    nextHour: number;
    nextDay: number;
    confidence: number;
  };
}

/**
 * Relatório de anomalia
 */
export interface AnomalyReport {
  anomalyId: string;
  type: 'performance_degradation' | 'unusual_pattern' | 'threshold_breach';
  severity: AlertLevel;
  metric: MetricType;
  normalRange: { min: number; max: number };
  observedValue: number;
  description: string;
  affectedEntities: string[]; // rideIds, driverIds
  timestamp: Date;
  resolvedAt?: Date;
}
