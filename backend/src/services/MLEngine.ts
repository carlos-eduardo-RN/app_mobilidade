/**
 * ML Engine
 * Motor de machine learning para previsão e análise
 */

import { Logger } from '../utils/Logger';
import {
  PredictionModel,
  PredictionType,
  AnomalyModel,
  AnomalyType,
  Recommendation,
  PerformanceReport,
  TrainingData,
  StatisticalModel,
  BehaviorAnalysis,
  PredictionSummary,
  BaselineComparison,
} from '../models/ML';

export class MLEngine {
  private trainingData: TrainingData[] = [];
  private predictions: PredictionModel[] = [];
  private anomalies: AnomalyModel[] = [];
  private models: Map<string, StatisticalModel> = new Map();
  private maxHistorySize = 10000; // 30 dias de dados

  constructor() {
    Logger.info('MLEngine', 'MLEngine initialized');
    this.initializeModels();
  }

  /**
   * Inicializa modelos estatísticos
   */
  private initializeModels(): void {
    // Moving Average
    this.models.set('moving_average', {
      name: 'Moving Average',
      type: 'moving_average',
      parameters: { windowSize: 12 },
      accuracy: 0,
      lastUpdated: new Date(),
    });

    // Exponential Smoothing
    this.models.set('exp_smoothing', {
      name: 'Exponential Smoothing',
      type: 'exponential_smoothing',
      parameters: { alpha: 0.3 },
      accuracy: 0,
      lastUpdated: new Date(),
    });

    // Z-Score para detecção de anomalias
    this.models.set('z_score', {
      name: 'Z-Score Anomaly Detection',
      type: 'z_score',
      parameters: {},
      accuracy: 0,
      lastUpdated: new Date(),
    });

    Logger.info('MLEngine', 'Models initialized: moving_average, exp_smoothing, z_score');
  }

  /**
   * Adiciona dado de treinamento
   */
  addTrainingData(data: TrainingData): void {
    this.trainingData.push(data);

    // Limitar tamanho
    if (this.trainingData.length > this.maxHistorySize) {
      this.trainingData.shift();
    }
  }

  /**
   * Prevê demanda para os próximos N minutos
   */
  predictDemand(periodMinutes: number = 30): PredictionModel {
    try {
      const recentData = this.trainingData.slice(-12); // últimas 12 horas

      if (recentData.length < 3) {
        return this.getDefaultPrediction(PredictionType.DEMAND, periodMinutes);
      }

      // Calcular média móvel
      const values = recentData.map((d) => d.metrics.demandLevel);
      const avg = this.calculateMovingAverage(values);
      const stdDev = this.calculateStdDev(values);

      // Previsão com intervalo de confiança
      const prediction: PredictionModel = {
        type: PredictionType.DEMAND,
        timestamp: new Date(),
        period: periodMinutes,
        value: avg,
        confidence: Math.min(95, 60 + recentData.length * 3), // Aumenta com dados
        accuracy: this.getModelAccuracy('moving_average'),
        lowerBound: avg - 1.96 * stdDev, // 95% CI
        upperBound: avg + 1.96 * stdDev,
        factors: {
          dayOfWeek: new Date().toLocaleString('pt-BR', { weekday: 'long' }),
          timeOfDay: this.getTimeOfDay(),
        },
        metadata: {
          samplesUsed: recentData.length,
          algorithm: 'moving_average',
          lastUpdated: new Date(),
        },
      };

      this.predictions.push(prediction);
      if (this.predictions.length > 1000) {
        this.predictions.shift();
      }

      Logger.info('MLEngine', `Demand prediction: ${avg.toFixed(2)} (confidence: ${prediction.confidence}%)`);
      return prediction;
    } catch (err) {
      Logger.error('MLEngine', `Error predicting demand: ${err}`);
      return this.getDefaultPrediction(PredictionType.DEMAND, periodMinutes);
    }
  }

  /**
   * Prevê probabilidade de timeout
   */
  predictTimeout(): PredictionModel {
    try {
      const recentData = this.trainingData.slice(-60); // últimas 60 horas

      if (recentData.length < 10) {
        return this.getDefaultPrediction(PredictionType.TIMEOUT, 1);
      }

      // Calcular taxa de timeout histórica
      const timeoutRate =
        (recentData.filter((d) => !d.outcome.succeeded).length / recentData.length) * 100;

      const prediction: PredictionModel = {
        type: PredictionType.TIMEOUT,
        timestamp: new Date(),
        period: 1, // próximo minuto
        value: timeoutRate,
        confidence: Math.min(90, 50 + recentData.length * 0.5),
        accuracy: this.getModelAccuracy('z_score'),
        lowerBound: Math.max(0, timeoutRate - 5),
        upperBound: Math.min(100, timeoutRate + 5),
        factors: {
          dayOfWeek: new Date().toLocaleString('pt-BR', { weekday: 'long' }),
          timeOfDay: this.getTimeOfDay(),
        },
        metadata: {
          samplesUsed: recentData.length,
          algorithm: 'linear_regression',
          lastUpdated: new Date(),
        },
      };

      this.predictions.push(prediction);
      return prediction;
    } catch (err) {
      Logger.error('MLEngine', `Error predicting timeout: ${err}`);
      return this.getDefaultPrediction(PredictionType.TIMEOUT, 1);
    }
  }

  /**
   * Prevê tempo médio de matching
   */
  predictMatchingTime(): PredictionModel {
    try {
      const recentData = this.trainingData.slice(-24);

      if (recentData.length < 5) {
        return this.getDefaultPrediction(PredictionType.MATCHING_TIME, 1);
      }

      const times = recentData.map((d) => d.metrics.matchingTime);
      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      const stdDev = this.calculateStdDev(times);

      const prediction: PredictionModel = {
        type: PredictionType.MATCHING_TIME,
        timestamp: new Date(),
        period: 1,
        value: avgTime,
        confidence: 80,
        accuracy: this.getModelAccuracy('exp_smoothing'),
        lowerBound: avgTime - 1.96 * stdDev,
        upperBound: avgTime + 1.96 * stdDev,
        factors: {
          dayOfWeek: new Date().toLocaleString('pt-BR', { weekday: 'long' }),
          timeOfDay: this.getTimeOfDay(),
        },
        metadata: {
          samplesUsed: recentData.length,
          algorithm: 'exponential_smoothing',
          lastUpdated: new Date(),
        },
      };

      return prediction;
    } catch (err) {
      Logger.error('MLEngine', `Error predicting matching time: ${err}`);
      return this.getDefaultPrediction(PredictionType.MATCHING_TIME, 1);
    }
  }

  /**
   * Detecta anomalias usando Z-Score
   */
  detectAnomalies(metrics: any): AnomalyModel[] {
    try {
      const anomalies: AnomalyModel[] = [];
      const recentData = this.trainingData.slice(-60);

      if (recentData.length < 10) {
        return [];
      }

      // Checar timeout rate
      const timeoutRates = recentData.map((d) => {
        const rate = d.metrics.timeoutRate;
        return typeof rate === 'number' ? rate : 0;
      });

      const timeoutAnomaly = this.checkZScore(
        metrics.timeoutRate,
        timeoutRates,
        AnomalyType.TIMEOUT_SPIKE
      );
      if (timeoutAnomaly) {
        anomalies.push(timeoutAnomaly);
      }

      // Checar tempo de matching
      const matchingTimes = recentData.map((d) => d.metrics.matchingTime);
      const matchingAnomaly = this.checkZScore(
        metrics.matchingTime,
        matchingTimes,
        AnomalyType.MATCHING_DELAY
      );
      if (matchingAnomaly) {
        anomalies.push(matchingAnomaly);
      }

      // Armazenar anomalias
      anomalies.forEach((a) => {
        this.anomalies.push(a);
        Logger.warn('MLEngine', `Anomaly detected: ${a.type} (severity: ${a.severity})`);
      });

      if (this.anomalies.length > 1000) {
        this.anomalies = this.anomalies.slice(-1000);
      }

      return anomalies;
    } catch (err) {
      Logger.error('MLEngine', `Error detecting anomalies: ${err}`);
      return [];
    }
  }

  /**
   * Analisa comportamento e padrões
   */
  analyzeBehavior(): BehaviorAnalysis {
    try {
      const recentData = this.trainingData.slice(-168); // últimas 7 dias

      return {
        timestamp: new Date(),
        patterns: {
          peakHours: ['09:00', '12:00', '18:00'], // TODO: calcular real
          quietHours: ['03:00', '04:00', '05:00'],
          commonRoutes: [],
          driverPatterns: [
            { behavior: 'accepting', percentage: 75 },
            { behavior: 'quick_drop', percentage: 15 },
            { behavior: 'rejecting', percentage: 10 },
          ],
        },
        trends: {
          demandTrend: recentData.length > 50 ? 'increasing' : 'stable',
          acceptanceTrend: 'stable',
          timeoutTrend: 'decreasing',
        },
        clusters: {
          driverCluster: 'experienced',
          passengerCluster: 'regular',
          routeCluster: 'urban_center',
        },
      };
    } catch (err) {
      Logger.error('MLEngine', `Error analyzing behavior: ${err}`);
      return {
        timestamp: new Date(),
        patterns: {
          peakHours: [],
          quietHours: [],
          commonRoutes: [],
          driverPatterns: [],
        },
        trends: {
          demandTrend: 'stable',
          acceptanceTrend: 'stable',
          timeoutTrend: 'stable',
        },
        clusters: {
          driverCluster: 'unknown',
          passengerCluster: 'unknown',
          routeCluster: 'unknown',
        },
      };
    }
  }

  /**
   * Gera recomendações baseadas em dados
   */
  generateRecommendations(metrics: any): Recommendation[] {
    try {
      const recommendations: Recommendation[] = [];

      // Se timeout rate está alto
      if (metrics.timeoutRate > 20) {
        recommendations.push({
          id: `rec-${Date.now()}`,
          timestamp: new Date(),
          type: 'extend_timeout',
          priority: 'HIGH',
          targetMetric: 'DRIVER_ACCEPT_TIMEOUT_SECONDS',
          currentValue: 30,
          recommendedValue: 45,
          expectedImprovement: 15,
          reason: 'Timeout rate acima de 20%, estender timeout para melhorar aceita',
          confidence: 85,
          estimatedImpact: {
            timeoutRate: 15,
            matchingTime: 50,
            acceptanceRate: 85,
          },
        });
      }

      // Se acceptance rate baixa
      if (metrics.acceptanceRate < 70) {
        recommendations.push({
          id: `rec-${Date.now()}-2`,
          timestamp: new Date(),
          type: 'increase_drivers',
          priority: 'HIGH',
          targetMetric: 'DRIVER_POOL_SIZE',
          currentValue: 100,
          recommendedValue: 120,
          expectedImprovement: 10,
          reason: 'Aceita de drivers abaixo de 70%, aumentar pool',
          confidence: 80,
          estimatedImpact: {
            timeoutRate: 18,
            matchingTime: 40,
            acceptanceRate: 80,
          },
        });
      }

      // Se matching time está alto
      if (metrics.matchingTime > 45000) {
        recommendations.push({
          id: `rec-${Date.now()}-3`,
          timestamp: new Date(),
          type: 'adjust_radius',
          priority: 'MEDIUM',
          targetMetric: 'MATCHING_RADIUS',
          currentValue: 3,
          recommendedValue: 4,
          expectedImprovement: 12,
          reason: 'Tempo de matching acima de 45s, expandir raio',
          confidence: 75,
          estimatedImpact: {
            timeoutRate: 18,
            matchingTime: 35,
            acceptanceRate: 75,
          },
        });
      }

      return recommendations;
    } catch (err) {
      Logger.error('MLEngine', `Error generating recommendations: ${err}`);
      return [];
    }
  }

  /**
   * Comparar com baseline
   */
  compareWithBaseline(): BaselineComparison {
    try {
      const currentData = this.trainingData.slice(-24);
      const baselineData = this.trainingData.slice(-168, -144); // uma semana atrás

      if (currentData.length < 5 || baselineData.length < 5) {
        return this.getDefaultComparison();
      }

      const currentAvg = this.getAverageMetrics(currentData);
      const baselineAvg = this.getAverageMetrics(baselineData);

      const improvement = ((baselineAvg.timeoutRate - currentAvg.timeoutRate) / baselineAvg.timeoutRate) * 100;

      return {
        timestamp: new Date(),
        baseline: {
          period: 'última semana',
          metrics: baselineAvg,
        },
        current: {
          period: 'últimas 24h',
          metrics: currentAvg,
        },
        improvement,
        differences: [
          {
            metric: 'timeoutRate',
            baselineValue: baselineAvg.timeoutRate,
            currentValue: currentAvg.timeoutRate,
            change: currentAvg.timeoutRate - baselineAvg.timeoutRate,
            percentageChange: improvement,
          },
        ],
        trend: improvement > 0 ? 'improving' : improvement < 0 ? 'degrading' : 'stable',
        recommendations:
          improvement > 0 ? ['Manter configurações atuais'] : ['Investigar degradação'],
      };
    } catch (err) {
      Logger.error('MLEngine', `Error comparing with baseline: ${err}`);
      return this.getDefaultComparison();
    }
  }

  /**
   * Obter resumo de previsões
   */
  getSummary(): PredictionSummary {
    try {
      const demand = this.predictDemand(30);
      const timeout = this.predictTimeout();
      const behavior = this.analyzeBehavior();
      const recommendations = this.generateRecommendations({
        timeoutRate: timeout.value,
        matchingTime: 40000,
        acceptanceRate: 75,
      });

      const recentAnomalies = this.anomalies.slice(-10);

      // Health score: 0-100
      let healthScore = 100;
      healthScore -= timeout.value; // Timeout rate reduz score
      healthScore = Math.max(0, Math.min(100, healthScore));

      return {
        timestamp: new Date(),
        predictions: [demand, timeout],
        anomalies: recentAnomalies,
        recommendations,
        overallHealthScore: healthScore,
        nextActionItems: recommendations.map((r) => r.reason),
        criticalAlerts: recentAnomalies
          .filter((a) => a.severity === 'CRITICAL')
          .map((a) => a.recommendation),
      };
    } catch (err) {
      Logger.error('MLEngine', `Error getting summary: ${err}`);
      return {
        timestamp: new Date(),
        predictions: [],
        anomalies: [],
        recommendations: [],
        overallHealthScore: 50,
        nextActionItems: [],
        criticalAlerts: [],
      };
    }
  }

  /**
   * Obter acurácia do modelo
   */
  private getModelAccuracy(modelType: string): number {
    const model = this.models.get(modelType);
    return model?.accuracy || 75;
  }

  /**
   * Calcular média móvel
   */
  private calculateMovingAverage(values: number[], windowSize: number = 5): number {
    if (values.length < windowSize) {
      return values.reduce((a, b) => a + b, 0) / values.length;
    }

    const window = values.slice(-windowSize);
    return window.reduce((a, b) => a + b, 0) / window.length;
  }

  /**
   * Calcular desvio padrão
   */
  private calculateStdDev(values: number[]): number {
    if (values.length < 2) return 0;

    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const squareDiffs = values.map((v) => Math.pow(v - mean, 2));
    const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / squareDiffs.length;
    return Math.sqrt(avgSquareDiff);
  }

  /**
   * Verificar Z-Score para anomalias
   */
  private checkZScore(currentValue: number, historicalValues: number[], anomalyType: AnomalyType): AnomalyModel | null {
    const mean = historicalValues.reduce((a, b) => a + b, 0) / historicalValues.length;
    const stdDev = this.calculateStdDev(historicalValues);

    if (stdDev === 0) return null;

    const zScore = (currentValue - mean) / stdDev;

    if (Math.abs(zScore) > 2) {
      return {
        id: `anom-${Date.now()}`,
        type: anomalyType,
        severity: Math.abs(zScore) > 3 ? 'CRITICAL' : Math.abs(zScore) > 2.5 ? 'HIGH' : 'MEDIUM',
        timestamp: new Date(),
        metric: anomalyType,
        normalRange: {
          min: mean - 2 * stdDev,
          max: mean + 2 * stdDev,
          mean,
          stdDev,
        },
        observedValue: currentValue,
        deviationScore: zScore,
        affectedEntities: {},
        recommendation: `Investigar ${anomalyType}: valor ${currentValue.toFixed(2)} está ${Math.abs(zScore).toFixed(1)}σ longe da média`,
        resolved: false,
      };
    }

    return null;
  }

  /**
   * Helper: Obter hora do dia
   */
  private getTimeOfDay(): string {
    const hour = new Date().getHours();
    if (hour < 6) return 'night';
    if (hour < 12) return 'morning';
    if (hour < 18) return 'afternoon';
    return 'evening';
  }

  /**
   * Helper: Previsão padrão
   */
  private getDefaultPrediction(type: PredictionType, period: number): PredictionModel {
    return {
      type,
      timestamp: new Date(),
      period,
      value: 50,
      confidence: 50,
      accuracy: 0,
      lowerBound: 40,
      upperBound: 60,
      factors: {
        dayOfWeek: 'unknown',
        timeOfDay: 'unknown',
      },
      metadata: {
        samplesUsed: 0,
        algorithm: 'default',
        lastUpdated: new Date(),
      },
    };
  }

  /**
   * Helper: Comparação padrão
   */
  private getDefaultComparison(): BaselineComparison {
    return {
      timestamp: new Date(),
      baseline: { period: 'unknown', metrics: {} },
      current: { period: 'unknown', metrics: {} },
      improvement: 0,
      differences: [],
      trend: 'stable',
      recommendations: [],
    };
  }

  /**
   * Helper: Métricas médias
   */
  private getAverageMetrics(data: TrainingData[]): any {
    if (data.length === 0) {
      return {
        timeoutRate: 0,
        matchingTime: 0,
        acceptanceRate: 100,
        demandLevel: 0,
      };
    }

    return {
      timeoutRate: data.reduce((sum, d) => sum + d.metrics.timeoutRate, 0) / data.length,
      matchingTime: data.reduce((sum, d) => sum + d.metrics.matchingTime, 0) / data.length,
      acceptanceRate: data.reduce((sum, d) => sum + d.metrics.acceptanceRate, 0) / data.length,
      demandLevel: data.reduce((sum, d) => sum + d.metrics.demandLevel, 0) / data.length,
    };
  }

  /**
   * Exportar todos os dados
   */
  export() {
    return {
      trainingData: this.trainingData,
      predictions: this.predictions,
      anomalies: this.anomalies,
      models: Array.from(this.models.values()),
      timestamp: new Date(),
    };
  }

  /**
   * Limpar recursos
   */
  async destroy(): Promise<void> {
    this.trainingData = [];
    this.predictions = [];
    this.anomalies = [];
    this.models.clear();
    Logger.info('MLEngine', 'MLEngine destroyed');
  }
}
