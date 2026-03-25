/**
 * Performance Jobs
 * Jobs de background para previsão, detecção de anomalias e auto-tuning
 */

import { JobContext } from './interfaces';
import { Logger } from '../utils/Logger';
import { MLEngine } from '../services/MLEngine';

/**
 * Prediction Job
 * Executa a cada 5 minutos
 */
export class PredictionJob {
  id = 'prediction-job';
  name = 'ML Prediction Job';
  description = 'Gera previsões de demanda, timeout e matching time';
  schedule = 300000; // 5 minutos

  constructor(private mlEngine: MLEngine) {}

  async execute(context: JobContext): Promise<void> {
    try {
      const startTime = Date.now();

      // Gerar previsões
      const demandPred = this.mlEngine.predictDemand(30);
      const timeoutPred = this.mlEngine.predictTimeout();
      const matchingPred = this.mlEngine.predictMatchingTime();

      Logger.info('PredictionJob', 'Predictions generated successfully', {
        demand: demandPred.value.toFixed(2),
        timeout: timeoutPred.value.toFixed(2),
        matching: matchingPred.value.toFixed(2),
      });
    } catch (err) {
      Logger.error('PredictionJob', `Error in prediction job: ${err}`);
      throw err;
    }
  }

  shouldRetry(attempt: number, error: Error): boolean {
    return attempt < 2; // Até 2 tentativas
  }
}

/**
 * Anomaly Detection Job
 * Executa a cada 60 segundos
 */
export class AnomalyDetectionJob {
  id = 'anomaly-detection-job';
  name = 'Anomaly Detection Job';
  description = 'Detecta anomalias em tempo real';
  schedule = 60000; // 60 segundos

  constructor(private mlEngine: MLEngine) {}

  async execute(context: JobContext): Promise<void> {
    try {
      const startTime = Date.now();

      // Detectar anomalias
      const anomalies = this.mlEngine.detectAnomalies({
        timeoutRate: 18,
        matchingTime: 42000,
        acceptanceRate: 72,
        demandLevel: 85,
        systemLoad: 65,
      });

      const criticalAnomalies = anomalies.filter((a) => a.severity === 'CRITICAL');
      const highAnomalies = anomalies.filter((a) => a.severity === 'HIGH');

      if (anomalies.length > 0) {
        Logger.warn('AnomalyDetectionJob', `${anomalies.length} anomalies detected`, {
          critical: criticalAnomalies.length,
          high: highAnomalies.length,
        });
      }
    } catch (err) {
      Logger.error('AnomalyDetectionJob', `Error in anomaly detection job: ${err}`);
      throw err;
    }
  }

  shouldRetry(attempt: number, error: Error): boolean {
    return attempt < 2; // Até 2 tentativas
  }
}

/**
 * Auto-Tune Job
 * Executa a cada 10 minutos
 */
export class AutoTuneJob {
  id = 'auto-tune-job';
  name = 'Auto-Tune Job';
  description = 'Auto-ajusta configurações baseado em performance';
  schedule = 600000; // 10 minutos

  constructor(private mlEngine: MLEngine) {}

  async execute(context: JobContext): Promise<void> {
    try {
      const startTime = Date.now();

      // Gerar recomendações
      const recommendations = this.mlEngine.generateRecommendations({
        timeoutRate: 18,
        matchingTime: 42000,
        acceptanceRate: 72,
        demandLevel: 85,
      });

      // Comparar com baseline
      const comparison = this.mlEngine.compareWithBaseline();

      if (recommendations.length > 0) {
        Logger.info('AutoTuneJob', `${recommendations.length} recommendations generated`, {
          highPriority: recommendations.filter((r) => r.priority === 'HIGH').length,
          trend: comparison.trend,
        });
      }
    } catch (err) {
      Logger.error('AutoTuneJob', `Error in auto-tune job: ${err}`);
      throw err;
    }
  }

  shouldRetry(attempt: number, error: Error): boolean {
    return attempt < 2; // Até 2 tentativas
  }
}

/**
 * ML Summary Job
 * Executa a cada 30 minutos
 */
export class MLSummaryJob {
  id = 'ml-summary-job';
  name = 'ML Summary Job';
  description = 'Gera resumo geral de ML e análises';
  schedule = 1800000; // 30 minutos

  constructor(private mlEngine: MLEngine) {}

  async execute(context: JobContext): Promise<void> {
    try {
      const startTime = Date.now();

      // Obter resumo
      const summary = this.mlEngine.getSummary();

      // Análise de comportamento
      const behavior = this.mlEngine.analyzeBehavior();

      Logger.info('MLSummaryJob', 'ML Summary generated', {
        healthScore: summary.overallHealthScore,
        anomalies: summary.anomalies.length,
        recommendations: summary.recommendations.length,
      });
    } catch (err) {
      Logger.error('MLSummaryJob', `Error in ML summary job: ${err}`);
      throw err;
    }
  }

  shouldRetry(attempt: number, error: Error): boolean {
    return attempt < 1; // Até 1 tentativa
  }
}
