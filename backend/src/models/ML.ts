/**
 * ETAPA 5 - Performance & Machine Learning Models
 * Modelos de dados para previsão e análise
 */

/**
 * Tipos de Previsão
 */
export enum PredictionType {
  DEMAND = 'demand',              // Demanda de rides
  TIMEOUT = 'timeout',            // Probabilidade de timeout
  MATCHING_TIME = 'matching_time', // Tempo de matching
  ACCEPTANCE = 'acceptance',      // Taxa de aceita
  CANCELLATION = 'cancellation',  // Taxa de cancelamento
}

/**
 * Tipos de Anomalia
 */
export enum AnomalyType {
  TIMEOUT_SPIKE = 'timeout_spike',           // Spike de timeouts
  DEMAND_SURGE = 'demand_surge',             // Surge de demanda
  MATCHING_DELAY = 'matching_delay',         // Delay no matching
  LOW_ACCEPTANCE = 'low_acceptance',         // Aceita muito baixa
  HIGH_CANCELLATION = 'high_cancellation',   // Cancelamentos altos
  DRIVER_OFFLINE = 'driver_offline',         // Muitos drivers offline
  DATABASE_SLOW = 'database_slow',           // Database lento
  SYSTEM_OVERLOAD = 'system_overload',       // Sistema sobrecarregado
}

/**
 * Modelo de Previsão
 */
export interface PredictionModel {
  type: PredictionType;
  timestamp: Date;
  period: number; // minutos (ex: 30 para próximos 30min)
  value: number; // valor previsto
  confidence: number; // 0-100 (confiança da previsão)
  accuracy: number; // 0-100 (acurácia histórica)
  lowerBound: number; // intervalo de confiança - limite inferior
  upperBound: number; // intervalo de confiança - limite superior
  factors: {
    dayOfWeek: string;
    timeOfDay: string;
    weather?: string;
    specialEvent?: string;
  };
  metadata: {
    samplesUsed: number;
    algorithm: string;
    lastUpdated: Date;
  };
}

/**
 * Modelo de Anomalia
 */
export interface AnomalyModel {
  id: string;
  type: AnomalyType;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  timestamp: Date;
  metric: string;
  normalRange: {
    min: number;
    max: number;
    mean: number;
    stdDev: number;
  };
  observedValue: number;
  deviationScore: number; // z-score
  affectedEntities: {
    rideIds?: string[];
    driverIds?: string[];
    regionIds?: string[];
  };
  recommendation: string;
  resolved: boolean;
}

/**
 * Recomendação de Ação
 */
export interface Recommendation {
  id: string;
  timestamp: Date;
  type: 'increase_drivers' | 'adjust_radius' | 'extend_timeout' | 'alert_user' | 'pause_matching';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  targetMetric: string;
  currentValue: number;
  recommendedValue: number;
  expectedImprovement: number; // percentual
  reason: string;
  confidence: number; // 0-100
  estimatedImpact: {
    timeoutRate: number;
    matchingTime: number;
    acceptanceRate: number;
  };
}

/**
 * Relatório de Performance
 */
export interface PerformanceReport {
  timestamp: Date;
  period: 'hour' | 'day' | 'week' | 'month';
  metrics: {
    matchingSuccessRate: number;
    timeoutRate: number;
    averageMatchingTime: number;
    driverAcceptanceRate: number;
    cancellationRate: number;
  };
  predictions: {
    nextHourDemand: number;
    next30minTimeouts: number;
    trendDirection: 'up' | 'down' | 'stable';
  };
  anomalies: AnomalyModel[];
  recommendations: Recommendation[];
  healthScore: number; // 0-100
  comparisonWithBaseline: {
    improvement: number; // percentual
    trend: 'improving' | 'degrading' | 'stable';
  };
}

/**
 * Dados de Treinamento
 */
export interface TrainingData {
  timestamp: Date;
  metrics: {
    timeoutRate: number;
    matchingTime: number;
    acceptanceRate: number;
    demandLevel: number;
    systemLoad: number;
  };
  outcome: {
    succeeded: boolean;
    reason?: string;
  };
}

/**
 * Modelo Estatístico
 */
export interface StatisticalModel {
  name: string;
  type: 'moving_average' | 'exponential_smoothing' | 'linear_regression' | 'z_score';
  parameters: {
    windowSize?: number;
    alpha?: number;
    beta?: number;
    gamma?: number;
  };
  accuracy: number; // 0-100
  lastUpdated: Date;
}

/**
 * Análise de Comportamento
 */
export interface BehaviorAnalysis {
  timestamp: Date;
  patterns: {
    peakHours: string[]; // Ex: ["09:00", "12:00", "18:00"]
    quietHours: string[];
    commonRoutes: Array<{ from: string; to: string; frequency: number }>;
    driverPatterns: Array<{ behavior: string; percentage: number }>;
  };
  trends: {
    demandTrend: 'increasing' | 'decreasing' | 'stable';
    acceptanceTrend: 'increasing' | 'decreasing' | 'stable';
    timeoutTrend: 'increasing' | 'decreasing' | 'stable';
  };
  clusters: {
    driverCluster: string;
    passengerCluster: string;
    routeCluster: string;
  };
}

/**
 * Configuração Auto-tune
 */
export interface AutoTuneConfig {
  timestamp: Date;
  parameter: string; // Ex: "DRIVER_ACCEPT_TIMEOUT_SECONDS"
  currentValue: number;
  suggestedValue: number;
  reasoning: string;
  confidence: number; // 0-100
  expectedImprovement: number;
  risks: string[];
  applied: boolean;
  appliedAt?: Date;
  result?: {
    success: boolean;
    actualImprovement: number;
    issues?: string[];
  };
}

/**
 * Resumo de Previsões
 */
export interface PredictionSummary {
  timestamp: Date;
  predictions: PredictionModel[];
  anomalies: AnomalyModel[];
  recommendations: Recommendation[];
  overallHealthScore: number;
  nextActionItems: string[];
  criticalAlerts: string[];
}

/**
 * Histórico de Performance
 */
export interface PerformanceHistory {
  date: Date;
  hourly: Array<{
    hour: number;
    metrics: any;
    prediction: PredictionModel;
    anomalies: AnomalyModel[];
  }>;
  daily: {
    bestHour: number;
    worstHour: number;
    averagePerformance: number;
  };
}

/**
 * Comparação com Baseline
 */
export interface BaselineComparison {
  timestamp: Date;
  baseline: {
    period: string;
    metrics: any;
  };
  current: {
    period: string;
    metrics: any;
  };
  improvement: number; // percentual
  differences: Array<{
    metric: string;
    baselineValue: number;
    currentValue: number;
    change: number;
    percentageChange: number;
  }>;
  trend: 'improving' | 'degrading' | 'stable';
  recommendations: string[];
}
