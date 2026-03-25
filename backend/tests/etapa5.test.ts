/**
 * ETAPA 5 Tests
 * Testes completos para ML Engine, Prediction Models e Analytics
 */

import { MLEngine } from '../src/services/MLEngine';
import { DemandPredictor, TimeoutPredictor, MatchingTimePredictor, AcceptanceRatePredictor, CancellationRatePredictor } from '../src/services/PredictionModels';
import { RecommendationEngine } from '../src/services/RecommendationEngine';
import { PerformanceAnalytics } from '../src/services/PerformanceAnalytics';
import { TrainingData, PredictionType, AnomalyType } from '../src/models/ML';
import { Metrics } from '../src/models/Observability';

describe('ETAPA 5 - ML Engine Tests', () => {
  let mlEngine: MLEngine;

  beforeEach(() => {
    mlEngine = new MLEngine();
  });

  // Training Tests
  describe('Training', () => {
    test('should add training data', () => {
      const data: TrainingData = {
        timestamp: new Date(),
        metrics: {
          timeoutRate: 15,
          acceptanceRate: 80,
          matchingTime: 35000,
          errorRate: 2,
          demandLevel: 60,
          p95ResponseTime: 200,
          p99ResponseTime: 300,
        },
        outcome: { succeeded: true, reason: 'matched' },
      };

      mlEngine.addTrainingData(data);
      // Should not throw and data should be stored
      expect(mlEngine['trainingData'].length).toBe(1);
    });

    test('should maintain max training data limit', () => {
      for (let i = 0; i < 10100; i++) {
        mlEngine.addTrainingData({
          timestamp: new Date(),
          metrics: {
            timeoutRate: 15,
            acceptanceRate: 80,
            matchingTime: 35000,
            errorRate: 2,
            demandLevel: 60,
            p95ResponseTime: 200,
            p99ResponseTime: 300,
          },
          outcome: { succeeded: true, reason: 'matched' },
        });
      }

      // Should keep max 10000
      expect(mlEngine['trainingData'].length).toBeLessThanOrEqual(10000);
    });
  });

  // Prediction Tests
  describe('Predictions', () => {
    beforeEach(() => {
      // Add training data
      for (let i = 0; i < 50; i++) {
        mlEngine.addTrainingData({
          timestamp: new Date(Date.now() - i * 60000),
          metrics: {
            timeoutRate: 15 + Math.random() * 5,
            acceptanceRate: 75 + Math.random() * 10,
            matchingTime: 35000 + Math.random() * 5000,
            errorRate: 2 + Math.random() * 1,
            demandLevel: 60 + Math.random() * 20,
            p95ResponseTime: 200,
            p99ResponseTime: 300,
          },
          outcome: { succeeded: Math.random() > 0.15, reason: 'matched' },
        });
      }
    });

    test('should predict demand', () => {
      const prediction = mlEngine.predictDemand(30);

      expect(prediction.type).toBe(PredictionType.DEMAND);
      expect(prediction.value).toBeGreaterThan(0);
      expect(prediction.confidence).toBeGreaterThan(0);
      expect(prediction.confidence).toBeLessThanOrEqual(100);
      expect(prediction.lowerBound).toBeLessThan(prediction.upperBound);
    });

    test('should predict timeout', () => {
      const prediction = mlEngine.predictTimeout();

      expect(prediction.type).toBe(PredictionType.TIMEOUT);
      expect(prediction.value).toBeGreaterThanOrEqual(0);
      expect(prediction.value).toBeLessThanOrEqual(100);
      expect(prediction.confidence).toBeGreaterThan(0);
    });

    test('should predict matching time', () => {
      const prediction = mlEngine.predictMatchingTime();

      expect(prediction.type).toBe(PredictionType.MATCHING_TIME);
      expect(prediction.value).toBeGreaterThan(0);
      expect(prediction.confidence).toBeGreaterThan(0);
    });

    test('should return confidence based on sample size', () => {
      const pred1 = mlEngine.predictDemand(30);
      expect(pred1.confidence).toBeGreaterThan(50);

      // Add more data
      for (let i = 0; i < 200; i++) {
        mlEngine.addTrainingData({
          timestamp: new Date(),
          metrics: {
            timeoutRate: 15,
            acceptanceRate: 80,
            matchingTime: 35000,
            errorRate: 2,
            demandLevel: 60,
            p95ResponseTime: 200,
            p99ResponseTime: 300,
          },
          outcome: { succeeded: true, reason: 'matched' },
        });
      }

      const pred2 = mlEngine.predictDemand(30);
      expect(pred2.confidence).toBeGreaterThanOrEqual(pred1.confidence);
    });
  });

  // Anomaly Detection Tests
  describe('Anomaly Detection', () => {
    test('should detect timeout spike', () => {
      const metrics: Metrics = {
        timeoutRate: 50, // Very high
        acceptanceRate: 80,
        matchingTime: 35000,
        errorRate: 2,
        demandLevel: 60,
        p95ResponseTime: 200,
        p99ResponseTime: 300,
      };

      const anomalies = mlEngine.detectAnomalies(metrics);

      expect(anomalies.length).toBeGreaterThan(0);
      expect(anomalies.some((a) => a.type === AnomalyType.TIMEOUT_SPIKE)).toBe(true);
    });

    test('should detect low acceptance', () => {
      const metrics: Metrics = {
        timeoutRate: 15,
        acceptanceRate: 30, // Very low
        matchingTime: 35000,
        errorRate: 2,
        demandLevel: 60,
        p95ResponseTime: 200,
        p99ResponseTime: 300,
      };

      const anomalies = mlEngine.detectAnomalies(metrics);

      expect(anomalies.some((a) => a.type === AnomalyType.LOW_ACCEPTANCE)).toBe(true);
    });

    test('should classify anomaly severity', () => {
      const metrics: Metrics = {
        timeoutRate: 60, // Critical
        acceptanceRate: 80,
        matchingTime: 35000,
        errorRate: 2,
        demandLevel: 60,
        p95ResponseTime: 200,
        p99ResponseTime: 300,
      };

      const anomalies = mlEngine.detectAnomalies(metrics);
      const timeout = anomalies.find((a) => a.type === AnomalyType.TIMEOUT_SPIKE);

      expect(timeout).toBeDefined();
      expect(timeout?.severity).toBe('critical');
    });
  });

  // Analysis Tests
  describe('Analysis', () => {
    beforeEach(() => {
      for (let i = 0; i < 50; i++) {
        mlEngine.addTrainingData({
          timestamp: new Date(),
          metrics: {
            timeoutRate: 15,
            acceptanceRate: 80,
            matchingTime: 35000,
            errorRate: 2,
            demandLevel: 60,
            p95ResponseTime: 200,
            p99ResponseTime: 300,
          },
          outcome: { succeeded: true, reason: 'matched' },
        });
      }
    });

    test('should analyze behavior', () => {
      const behavior = mlEngine.analyzeBehavior();

      expect(behavior).toBeDefined();
      expect(behavior.peakHours).toBeDefined();
      expect(behavior.patterns).toBeDefined();
      expect(behavior.trends).toBeDefined();
    });

    test('should generate recommendations', () => {
      const metrics: Metrics = {
        timeoutRate: 25, // Slightly high
        acceptanceRate: 65, // Slightly low
        matchingTime: 50000, // High
        errorRate: 5,
        demandLevel: 50,
        p95ResponseTime: 200,
        p99ResponseTime: 300,
      };

      const recommendations = mlEngine.generateRecommendations(metrics);

      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations[0].confidence).toBeGreaterThan(0);
      expect(recommendations[0].confidence).toBeLessThanOrEqual(100);
    });

    test('should compare with baseline', () => {
      const baseline: Metrics = {
        timeoutRate: 15,
        acceptanceRate: 80,
        matchingTime: 35000,
        errorRate: 2,
        demandLevel: 60,
        p95ResponseTime: 200,
        p99ResponseTime: 300,
      };

      mlEngine['baselineMetrics'] = baseline;

      const current: Metrics = {
        timeoutRate: 12,
        acceptanceRate: 85,
        matchingTime: 32000,
        errorRate: 1.5,
        demandLevel: 65,
        p95ResponseTime: 190,
        p99ResponseTime: 290,
      };

      const comparison = mlEngine.compareWithBaseline(current);

      expect(comparison.hasImproved).toBe(true);
      expect(comparison.improvementPercentage).toBeGreaterThan(0);
    });

    test('should generate summary', () => {
      const summary = mlEngine.getSummary();

      expect(summary).toBeDefined();
      expect(summary.predictions).toBeDefined();
      expect(summary.predictions.length).toBeGreaterThan(0);
      expect(summary.anomalies).toBeDefined();
      expect(summary.recommendations).toBeDefined();
      expect(summary.analysis).toBeDefined();
    });
  });

  // Cache Tests
  describe('Caching', () => {
    test('should maintain predictions cache limit', () => {
      for (let i = 0; i < 1100; i++) {
        mlEngine.addTrainingData({
          timestamp: new Date(),
          metrics: {
            timeoutRate: 15,
            acceptanceRate: 80,
            matchingTime: 35000,
            errorRate: 2,
            demandLevel: 60,
            p95ResponseTime: 200,
            p99ResponseTime: 300,
          },
          outcome: { succeeded: true, reason: 'matched' },
        });
        mlEngine.predictDemand();
      }

      expect(mlEngine['predictions'].length).toBeLessThanOrEqual(1000);
    });

    test('should maintain anomalies cache limit', () => {
      for (let i = 0; i < 1100; i++) {
        mlEngine.detectAnomalies({
          timeoutRate: 50,
          acceptanceRate: 80,
          matchingTime: 35000,
          errorRate: 2,
          demandLevel: 60,
          p95ResponseTime: 200,
          p99ResponseTime: 300,
        });
      }

      expect(mlEngine['anomalies'].length).toBeLessThanOrEqual(1000);
    });
  });
});

describe('Prediction Models Tests', () => {
  // Demand Predictor Tests
  describe('DemandPredictor', () => {
    test('should train and predict', () => {
      const predictor = new DemandPredictor();

      const trainData: TrainingData[] = [];
      for (let i = 0; i < 50; i++) {
        trainData.push({
          timestamp: new Date(Date.now() - i * 3600000),
          metrics: {
            timeoutRate: 15,
            acceptanceRate: 80,
            matchingTime: 35000,
            errorRate: 2,
            demandLevel: 60 + Math.random() * 20,
            p95ResponseTime: 200,
            p99ResponseTime: 300,
          },
          outcome: { succeeded: true, reason: 'matched' },
        });
      }

      predictor.train(trainData);
      const prediction = predictor.predict(30);

      expect(prediction.type).toBe(PredictionType.DEMAND);
      expect(prediction.value).toBeGreaterThan(0);
      expect(prediction.confidence).toBeGreaterThan(50);
    });

    test('should consider seasonal factors', () => {
      const predictor = new DemandPredictor();

      const trainData: TrainingData[] = [];
      for (let i = 0; i < 50; i++) {
        trainData.push({
          timestamp: new Date(Date.now() - i * 3600000),
          metrics: {
            timeoutRate: 15,
            acceptanceRate: 80,
            matchingTime: 35000,
            errorRate: 2,
            demandLevel: 60,
            p95ResponseTime: 200,
            p99ResponseTime: 300,
          },
          outcome: { succeeded: true, reason: 'matched' },
        });
      }

      predictor.train(trainData);
      const prediction = predictor.predict();

      // Should have factors
      expect(prediction.factors.dayOfWeek).toBeDefined();
      expect(prediction.factors.timeOfDay).toBeDefined();
    });
  });

  // Timeout Predictor Tests
  describe('TimeoutPredictor', () => {
    test('should predict timeout rate', () => {
      const predictor = new TimeoutPredictor();

      const trainData: TrainingData[] = [];
      for (let i = 0; i < 100; i++) {
        trainData.push({
          timestamp: new Date(),
          metrics: {
            timeoutRate: 15,
            acceptanceRate: 80,
            matchingTime: 35000,
            errorRate: 2,
            demandLevel: 60,
            p95ResponseTime: 200,
            p99ResponseTime: 300,
          },
          outcome: { succeeded: Math.random() > 0.15, reason: Math.random() > 0.15 ? 'matched' : 'timeout' },
        });
      }

      predictor.train(trainData);
      const prediction = predictor.predict();

      expect(prediction.type).toBe(PredictionType.TIMEOUT);
      expect(prediction.value).toBeGreaterThanOrEqual(0);
      expect(prediction.value).toBeLessThanOrEqual(100);
    });
  });

  // Acceptance Rate Predictor Tests
  describe('AcceptanceRatePredictor', () => {
    test('should predict acceptance rate', () => {
      const predictor = new AcceptanceRatePredictor();

      const trainData: TrainingData[] = [];
      for (let i = 0; i < 100; i++) {
        trainData.push({
          timestamp: new Date(),
          metrics: {
            timeoutRate: 15,
            acceptanceRate: 80,
            matchingTime: 35000,
            errorRate: 2,
            demandLevel: 60,
            p95ResponseTime: 200,
            p99ResponseTime: 300,
          },
          outcome: { succeeded: Math.random() > 0.2, reason: 'matched' },
        });
      }

      predictor.train(trainData);
      const rate = predictor.predict();

      expect(rate).toBeGreaterThan(0);
      expect(rate).toBeLessThanOrEqual(100);
    });
  });
});

describe('RecommendationEngine Tests', () => {
  let engine: RecommendationEngine;

  beforeEach(() => {
    engine = new RecommendationEngine();
  });

  test('should generate recommendations', () => {
    const metrics: Metrics = {
      timeoutRate: 25,
      acceptanceRate: 65,
      matchingTime: 50000,
      errorRate: 5,
      demandLevel: 50,
      p95ResponseTime: 200,
      p99ResponseTime: 300,
    };

    const trends = { timeoutTrend: 0.1, acceptanceTrend: -0.1, matchingTrendTrend: 0.05 };

    const recommendations = engine.generateRecommendations(metrics, trends);

    expect(recommendations.length).toBeGreaterThan(0);
    expect(recommendations[0].id).toBeDefined();
    expect(recommendations[0].priority).toBeDefined();
  });

  test('should prioritize by severity', () => {
    const metrics: Metrics = {
      timeoutRate: 35,
      acceptanceRate: 65,
      matchingTime: 50000,
      errorRate: 5,
      demandLevel: 50,
      p95ResponseTime: 200,
      p99ResponseTime: 300,
    };

    const trends = { timeoutTrend: 0.1, acceptanceTrend: -0.1, matchingTrendTrend: 0.05 };

    const recommendations = engine.generateRecommendations(metrics, trends);

    expect(recommendations[0].priority === 'critical' || recommendations[0].priority === 'high').toBe(true);
  });

  test('should get top recommendations', () => {
    const metrics: Metrics = {
      timeoutRate: 25,
      acceptanceRate: 65,
      matchingTime: 50000,
      errorRate: 5,
      demandLevel: 50,
      p95ResponseTime: 200,
      p99ResponseTime: 300,
    };

    const trends = { timeoutTrend: 0.1, acceptanceTrend: -0.1, matchingTrendTrend: 0.05 };

    engine.generateRecommendations(metrics, trends);
    const top = engine.getTopRecommendations(3);

    expect(top.length).toBeLessThanOrEqual(3);
  });

  test('should calculate expected impact', () => {
    const metrics: Metrics = {
      timeoutRate: 25,
      acceptanceRate: 65,
      matchingTime: 50000,
      errorRate: 5,
      demandLevel: 50,
      p95ResponseTime: 200,
      p99ResponseTime: 300,
    };

    const trends = { timeoutTrend: 0.1, acceptanceTrend: -0.1, matchingTrendTrend: 0.05 };

    engine.generateRecommendations(metrics, trends);
    const impact = engine.calculateExpectedImpact();

    expect(impact.totalImprovement).toBeGreaterThanOrEqual(0);
    expect(impact.avgConfidence).toBeGreaterThan(0);
  });
});

describe('PerformanceAnalytics Tests', () => {
  let analytics: PerformanceAnalytics;

  beforeEach(() => {
    analytics = new PerformanceAnalytics();
  });

  test('should calculate health score', () => {
    const metrics: Metrics = {
      timeoutRate: 15,
      acceptanceRate: 80,
      matchingTime: 35000,
      errorRate: 2,
      demandLevel: 60,
      p95ResponseTime: 200,
      p99ResponseTime: 300,
    };

    const score = analytics.calculateHealthScore(metrics);

    expect(score.overall).toBeGreaterThan(0);
    expect(score.overall).toBeLessThanOrEqual(100);
    expect(score.timeout).toBeGreaterThan(0);
    expect(score.acceptance).toBeGreaterThan(0);
  });

  test('should add metrics and maintain history', () => {
    const metrics: Metrics = {
      timeoutRate: 15,
      acceptanceRate: 80,
      matchingTime: 35000,
      errorRate: 2,
      demandLevel: 60,
      p95ResponseTime: 200,
      p99ResponseTime: 300,
    };

    analytics.addMetrics(metrics);
    analytics.addMetrics(metrics);

    expect(analytics['metricsHistory'].length).toBe(2);
  });

  test('should set and use baseline', () => {
    const baseline: Metrics = {
      timeoutRate: 15,
      acceptanceRate: 80,
      matchingTime: 35000,
      errorRate: 2,
      demandLevel: 60,
      p95ResponseTime: 200,
      p99ResponseTime: 300,
    };

    analytics.setBaseline(baseline);

    const current: Metrics = {
      timeoutRate: 12,
      acceptanceRate: 85,
      matchingTime: 32000,
      errorRate: 1.5,
      demandLevel: 65,
      p95ResponseTime: 190,
      p99ResponseTime: 290,
    };

    const comparison = analytics.compareWithBaseline(current);

    expect(comparison.hasImproved).toBe(true);
    expect(comparison.improvementPercentage).toBeGreaterThan(0);
  });

  test('should generate performance report', () => {
    const metrics: Metrics = {
      timeoutRate: 15,
      acceptanceRate: 80,
      matchingTime: 35000,
      errorRate: 2,
      demandLevel: 60,
      p95ResponseTime: 200,
      p99ResponseTime: 300,
    };

    const report = analytics.generatePerformanceReport(metrics);

    expect(report.timestamp).toBeDefined();
    expect(report.healthScore).toBeDefined();
    expect(report.trends).toBeDefined();
    expect(report.summary).toBeDefined();
  });

  test('should export report as JSON', () => {
    const metrics: Metrics = {
      timeoutRate: 15,
      acceptanceRate: 80,
      matchingTime: 35000,
      errorRate: 2,
      demandLevel: 60,
      p95ResponseTime: 200,
      p99ResponseTime: 300,
    };

    const json = analytics.exportReport(metrics);

    expect(() => JSON.parse(json)).not.toThrow();
    const parsed = JSON.parse(json);
    expect(parsed.report).toBeDefined();
    expect(parsed.comparison).toBeDefined();
  });
});
