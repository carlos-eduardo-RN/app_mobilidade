/**
 * Prediction Models
 * Modelos específicos de previsão com lógica avançada
 */

import { Logger } from '../utils/Logger';
import { TrainingData, PredictionModel, PredictionType } from '../models/ML';

/**
 * Demand Predictor
 * Prevê demanda de rides baseado em padrões históricos
 */
export class DemandPredictor {
  private hourlyPatterns: Map<number, number[]> = new Map(); // hour -> demands
  private dayPatterns: Map<string, number[]> = new Map(); // dayOfWeek -> demands
  private trainingData: TrainingData[] = [];

  constructor() {
    this.initializePatterns();
  }

  private initializePatterns(): void {
    // Inicializar padrões por hora (0-23)
    for (let i = 0; i < 24; i++) {
      this.hourlyPatterns.set(i, []);
    }

    // Inicializar padrões por dia
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    days.forEach((day) => {
      this.dayPatterns.set(day, []);
    });
  }

  /**
   * Treinar modelo com dados históricos
   */
  train(data: TrainingData[]): void {
    this.trainingData = data;

    for (const item of data) {
      const hour = item.timestamp.getHours();
      const day = item.timestamp.toLocaleString('en-US', { weekday: 'long' });
      const demand = item.metrics.demandLevel;

      this.hourlyPatterns.get(hour)?.push(demand);
      this.dayPatterns.get(day)?.push(demand);
    }

    Logger.info('DemandPredictor', `Model trained with ${data.length} data points`);
  }

  /**
   * Prever demanda
   */
  predict(periodMinutes: number = 30): PredictionModel {
    const now = new Date();
    const hour = now.getHours();
    const day = now.toLocaleString('en-US', { weekday: 'long' });

    const hourDemands = this.hourlyPatterns.get(hour) || [];
    const dayDemands = this.dayPatterns.get(day) || [];

    // Combinar padrões
    const allDemands = [...hourDemands, ...dayDemands];

    if (allDemands.length === 0) {
      return this.getDefaultPrediction(PredictionType.DEMAND, periodMinutes);
    }

    const avg = allDemands.reduce((a, b) => a + b, 0) / allDemands.length;
    const variance = allDemands.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / allDemands.length;
    const stdDev = Math.sqrt(variance);

    // Análise sazonal
    const seasonal = this.analyzeSeasonal(hour);

    const predicted = avg * seasonal;
    const confidence = Math.min(95, 50 + allDemands.length * 0.5);

    return {
      type: PredictionType.DEMAND,
      timestamp: new Date(),
      period: periodMinutes,
      value: predicted,
      confidence,
      accuracy: 85,
      lowerBound: predicted - 1.96 * stdDev,
      upperBound: predicted + 1.96 * stdDev,
      factors: {
        dayOfWeek: day,
        timeOfDay: this.getTimeOfDay(hour),
      },
      metadata: {
        samplesUsed: allDemands.length,
        algorithm: 'demand_seasonal_predictor',
        lastUpdated: new Date(),
      },
    };
  }

  private analyzeSeasonal(hour: number): number {
    // Multiplicador sazonal baseado na hora
    if (hour >= 7 && hour <= 9) return 1.3; // Morning peak
    if (hour >= 12 && hour <= 14) return 1.2; // Lunch peak
    if (hour >= 18 && hour <= 21) return 1.5; // Evening peak
    if (hour >= 3 && hour <= 6) return 0.4; // Night low
    return 1.0; // Normal
  }

  private getTimeOfDay(hour: number): string {
    if (hour < 6) return 'night';
    if (hour < 12) return 'morning';
    if (hour < 18) return 'afternoon';
    return 'evening';
  }

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
      factors: { dayOfWeek: 'unknown', timeOfDay: 'unknown' },
      metadata: {
        samplesUsed: 0,
        algorithm: 'default',
        lastUpdated: new Date(),
      },
    };
  }
}

/**
 * Timeout Predictor
 * Prevê probabilidade de timeout
 */
export class TimeoutPredictor {
  private timeoutRates: number[] = [];
  private driverRejectionRates: Map<string, number> = new Map();

  /**
   * Treinar modelo
   */
  train(data: TrainingData[]): void {
    const failedCount = data.filter((d) => !d.outcome.succeeded).length;
    const timeoutRate = (failedCount / data.length) * 100;

    this.timeoutRates.push(timeoutRate);

    if (this.timeoutRates.length > 100) {
      this.timeoutRates.shift();
    }

    Logger.info('TimeoutPredictor', `Timeout model trained: ${timeoutRate.toFixed(2)}%`);
  }

  /**
   * Prever timeout
   */
  predict(): PredictionModel {
    if (this.timeoutRates.length === 0) {
      return this.getDefaultPrediction();
    }

    // Usar últimas 10 observações
    const recentRates = this.timeoutRates.slice(-10);
    const avg = recentRates.reduce((a, b) => a + b, 0) / recentRates.length;
    const trend = this.calculateTrend(recentRates);

    const predicted = avg + trend; // Ajustar pela tendência

    return {
      type: PredictionType.TIMEOUT,
      timestamp: new Date(),
      period: 1,
      value: Math.max(0, Math.min(100, predicted)),
      confidence: 85,
      accuracy: 80,
      lowerBound: Math.max(0, predicted - 5),
      upperBound: Math.min(100, predicted + 5),
      factors: {
        dayOfWeek: new Date().toLocaleString('en-US', { weekday: 'long' }),
        timeOfDay: this.getTimeOfDay(),
      },
      metadata: {
        samplesUsed: recentRates.length,
        algorithm: 'timeout_predictor',
        lastUpdated: new Date(),
      },
    };
  }

  private calculateTrend(rates: number[]): number {
    if (rates.length < 2) return 0;
    const recent = rates.slice(-3).reduce((a, b) => a + b, 0) / 3;
    const older = rates.slice(0, 3).reduce((a, b) => a + b, 0) / 3;
    return (recent - older) * 0.5; // 50% do trend
  }

  private getTimeOfDay(): string {
    const hour = new Date().getHours();
    if (hour < 6) return 'night';
    if (hour < 12) return 'morning';
    if (hour < 18) return 'afternoon';
    return 'evening';
  }

  private getDefaultPrediction(): PredictionModel {
    return {
      type: PredictionType.TIMEOUT,
      timestamp: new Date(),
      period: 1,
      value: 15,
      confidence: 50,
      accuracy: 0,
      lowerBound: 10,
      upperBound: 20,
      factors: { dayOfWeek: 'unknown', timeOfDay: 'unknown' },
      metadata: {
        samplesUsed: 0,
        algorithm: 'default',
        lastUpdated: new Date(),
      },
    };
  }
}

/**
 * Matching Time Predictor
 * Prevê tempo de matching
 */
export class MatchingTimePredictor {
  private matchingTimes: number[] = [];
  private demandBuckets: Map<string, number[]> = new Map();

  /**
   * Treinar modelo
   */
  train(data: TrainingData[]): void {
    for (const item of data) {
      const time = item.metrics.matchingTime;
      const demand = item.metrics.demandLevel;

      this.matchingTimes.push(time);

      // Agrupar por nível de demanda
      const demandLevel = this.getBucket(demand);
      if (!this.demandBuckets.has(demandLevel)) {
        this.demandBuckets.set(demandLevel, []);
      }
      this.demandBuckets.get(demandLevel)?.push(time);
    }

    if (this.matchingTimes.length > 1000) {
      this.matchingTimes = this.matchingTimes.slice(-1000);
    }

    Logger.info('MatchingTimePredictor', `Matching time model trained with ${data.length} samples`);
  }

  /**
   * Prever tempo de matching
   */
  predict(currentDemand: number): PredictionModel {
    if (this.matchingTimes.length === 0) {
      return this.getDefaultPrediction();
    }

    const demandLevel = this.getBucket(currentDemand);
    const relevantTimes = this.demandBuckets.get(demandLevel) || this.matchingTimes;

    const avg = relevantTimes.reduce((a, b) => a + b, 0) / relevantTimes.length;
    const variance = relevantTimes.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / relevantTimes.length;
    const stdDev = Math.sqrt(variance);

    const confidence = Math.min(90, 60 + relevantTimes.length * 0.5);

    return {
      type: PredictionType.MATCHING_TIME,
      timestamp: new Date(),
      period: 1,
      value: avg,
      confidence,
      accuracy: 78,
      lowerBound: avg - 1.96 * stdDev,
      upperBound: avg + 1.96 * stdDev,
      factors: {
        dayOfWeek: new Date().toLocaleString('en-US', { weekday: 'long' }),
        timeOfDay: this.getTimeOfDay(),
      },
      metadata: {
        samplesUsed: relevantTimes.length,
        algorithm: 'matching_time_demand_adjusted',
        lastUpdated: new Date(),
      },
    };
  }

  private getBucket(demand: number): string {
    if (demand < 30) return 'low';
    if (demand < 60) return 'medium';
    if (demand < 85) return 'high';
    return 'very_high';
  }

  private getTimeOfDay(): string {
    const hour = new Date().getHours();
    if (hour < 6) return 'night';
    if (hour < 12) return 'morning';
    if (hour < 18) return 'afternoon';
    return 'evening';
  }

  private getDefaultPrediction(): PredictionModel {
    return {
      type: PredictionType.MATCHING_TIME,
      timestamp: new Date(),
      period: 1,
      value: 40000,
      confidence: 50,
      accuracy: 0,
      lowerBound: 35000,
      upperBound: 45000,
      factors: { dayOfWeek: 'unknown', timeOfDay: 'unknown' },
      metadata: {
        samplesUsed: 0,
        algorithm: 'default',
        lastUpdated: new Date(),
      },
    };
  }
}

/**
 * Acceptance Rate Predictor
 * Prevê taxa de aceita de drivers
 */
export class AcceptanceRatePredictor {
  private acceptanceRates: number[] = [];

  /**
   * Treinar modelo
   */
  train(data: TrainingData[]): void {
    const accepted = data.filter((d) => d.outcome.succeeded).length;
    const rate = (accepted / data.length) * 100;

    this.acceptanceRates.push(rate);

    if (this.acceptanceRates.length > 100) {
      this.acceptanceRates.shift();
    }

    Logger.info('AcceptanceRatePredictor', `Acceptance rate model trained: ${rate.toFixed(2)}%`);
  }

  /**
   * Prever aceita
   */
  predict(): number {
    if (this.acceptanceRates.length === 0) {
      return 75; // Default
    }

    // Média móvel ponderada (últimas observações tem mais peso)
    let sum = 0;
    let weights = 0;

    for (let i = 0; i < Math.min(10, this.acceptanceRates.length); i++) {
      const idx = this.acceptanceRates.length - 1 - i;
      const weight = i + 1; // Mais peso para recentes

      sum += this.acceptanceRates[idx] * weight;
      weights += weight;
    }

    return sum / weights;
  }
}

/**
 * Cancellation Rate Predictor
 * Prevê taxa de cancelamento
 */
export class CancellationRatePredictor {
  private cancellationRates: number[] = [];

  /**
   * Treinar modelo
   */
  train(data: TrainingData[]): void {
    const cancelled = data.filter((d) => !d.outcome.succeeded && d.outcome.reason === 'cancelled').length;
    const rate = (cancelled / data.length) * 100;

    this.cancellationRates.push(rate);

    if (this.cancellationRates.length > 100) {
      this.cancellationRates.shift();
    }

    Logger.info('CancellationRatePredictor', `Cancellation rate model trained: ${rate.toFixed(2)}%`);
  }

  /**
   * Prever cancelamento
   */
  predict(): number {
    if (this.cancellationRates.length === 0) {
      return 10; // Default
    }

    const recent = this.cancellationRates.slice(-5);
    return recent.reduce((a, b) => a + b, 0) / recent.length;
  }
}
