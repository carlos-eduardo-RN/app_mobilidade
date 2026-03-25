/**
 * Performance Analytics
 * Análise avançada de performance e reportes
 */

import { Logger } from '../utils/Logger';
import { Metrics } from '../models/Observability';
import { PerformanceReport, BaselineComparison } from '../models/ML';

export interface PerformanceTrend {
  metric: string;
  direction: 'up' | 'down' | 'stable';
  magnitude: number; // Percentual de mudança
  daysOfData: number;
}

export interface PerformanceHealthScore {
  overall: number; // 0-100
  timeout: number;
  acceptance: number;
  matching: number;
  error: number;
  demand: number;
}

export class PerformanceAnalytics {
  private metricsHistory: Array<{ timestamp: Date; metrics: Metrics }> = [];
  private baseline: Metrics | null = null;

  /**
   * Adicionar observação de métrica
   */
  addMetrics(metrics: Metrics): void {
    this.metricsHistory.push({
      timestamp: new Date(),
      metrics: { ...metrics },
    });

    // Manter apenas últimos 7 dias
    const sevenDaysAgo = Date.now() - 7 * 24 * 3600000;
    this.metricsHistory = this.metricsHistory.filter((item) => item.timestamp.getTime() > sevenDaysAgo);
  }

  /**
   * Definir baseline
   */
  setBaseline(metrics: Metrics): void {
    this.baseline = { ...metrics };
    Logger.info('PerformanceAnalytics', 'Baseline set');
  }

  /**
   * Calcular health score
   */
  calculateHealthScore(metrics: Metrics): PerformanceHealthScore {
    const scoreTimeout = Math.max(0, 100 - metrics.timeoutRate * 2); // 20% timeout = 60 score
    const scoreAcceptance = metrics.acceptanceRate; // Direto
    const scoreMatching = Math.max(0, 100 - (metrics.matchingTime / 60000) * 100); // 60s = 0, 30s = 100
    const scoreError = Math.max(0, 100 - metrics.errorRate * 10); // 10% error = 0 score
    const scoreDemand = Math.min(100, metrics.demandLevel * 1.5); // Mais demand = melhor (até 100)

    const overall = (scoreTimeout + scoreAcceptance + scoreMatching + scoreError + scoreDemand) / 5;

    return {
      overall: Math.round(overall),
      timeout: Math.round(scoreTimeout),
      acceptance: Math.round(scoreAcceptance),
      matching: Math.round(scoreMatching),
      error: Math.round(scoreError),
      demand: Math.round(scoreDemand),
    };
  }

  /**
   * Calcular tendências
   */
  calculateTrends(): PerformanceTrend[] {
    if (this.metricsHistory.length < 2) {
      return [];
    }

    const trends: PerformanceTrend[] = [];
    const first = this.metricsHistory[0].metrics;
    const last = this.metricsHistory[this.metricsHistory.length - 1].metrics;
    const days = this.metricsHistory.length / 144; // 10 min per sample = 144 samples per day

    // Timeout trend
    const timeoutChange = ((last.timeoutRate - first.timeoutRate) / first.timeoutRate) * 100;
    trends.push({
      metric: 'timeoutRate',
      direction: timeoutChange > 5 ? 'up' : timeoutChange < -5 ? 'down' : 'stable',
      magnitude: Math.abs(timeoutChange),
      daysOfData: Math.round(days),
    });

    // Acceptance trend
    const acceptanceChange = ((last.acceptanceRate - first.acceptanceRate) / first.acceptanceRate) * 100;
    trends.push({
      metric: 'acceptanceRate',
      direction: acceptanceChange > 5 ? 'up' : acceptanceChange < -5 ? 'down' : 'stable',
      magnitude: Math.abs(acceptanceChange),
      daysOfData: Math.round(days),
    });

    // Matching time trend
    const matchingChange = ((last.matchingTime - first.matchingTime) / first.matchingTime) * 100;
    trends.push({
      metric: 'matchingTime',
      direction: matchingChange > 5 ? 'up' : matchingChange < -5 ? 'down' : 'stable',
      magnitude: Math.abs(matchingChange),
      daysOfData: Math.round(days),
    });

    // Error rate trend
    const errorChange = ((last.errorRate - first.errorRate) / Math.max(0.1, first.errorRate)) * 100;
    trends.push({
      metric: 'errorRate',
      direction: errorChange > 5 ? 'up' : errorChange < -5 ? 'down' : 'stable',
      magnitude: Math.abs(errorChange),
      daysOfData: Math.round(days),
    });

    return trends;
  }

  /**
   * Gerar relatório de performance
   */
  generatePerformanceReport(metrics: Metrics): PerformanceReport {
    const healthScore = this.calculateHealthScore(metrics);
    const trends = this.calculateTrends();

    return {
      timestamp: new Date(),
      metrics: { ...metrics },
      healthScore,
      trends,
      recommendations: this.getRecommendations(metrics, healthScore),
      summary: this.generateSummary(metrics, healthScore),
    };
  }

  /**
   * Comparar com baseline
   */
  compareWithBaseline(metrics: Metrics): BaselineComparison {
    if (!this.baseline) {
      return {
        hasImproved: false,
        improvementPercentage: 0,
        changesByMetric: {},
        overallTrend: 'neutral',
        recommendation: 'Set a baseline first',
      };
    }

    const changes: Record<string, number> = {
      timeoutRate: ((metrics.timeoutRate - this.baseline.timeoutRate) / this.baseline.timeoutRate) * 100,
      acceptanceRate: ((metrics.acceptanceRate - this.baseline.acceptanceRate) / this.baseline.acceptanceRate) * 100,
      matchingTime: ((metrics.matchingTime - this.baseline.matchingTime) / this.baseline.matchingTime) * 100,
      errorRate: ((metrics.errorRate - this.baseline.errorRate) / Math.max(0.1, this.baseline.errorRate)) * 100,
      demandLevel: ((metrics.demandLevel - this.baseline.demandLevel) / Math.max(1, this.baseline.demandLevel)) * 100,
    };

    // Calcular melhoria geral (negativo para timeout/error = bom, positivo para outros = bom)
    const timeoutImprovement = -changes.timeoutRate; // Negativo
    const acceptanceImprovement = changes.acceptanceRate;
    const matchingImprovement = -changes.matchingTime; // Negativo
    const errorImprovement = -changes.errorRate; // Negativo

    const overallImprovement = (timeoutImprovement + acceptanceImprovement + matchingImprovement + errorImprovement) / 4;

    return {
      hasImproved: overallImprovement > 0,
      improvementPercentage: overallImprovement,
      changesByMetric: changes,
      overallTrend: overallImprovement > 5 ? 'positive' : overallImprovement < -5 ? 'negative' : 'stable',
      recommendation: this.getBaselineRecommendation(changes),
    };
  }

  /**
   * Exportar relatório
   */
  exportReport(metrics: Metrics): string {
    const report = this.generatePerformanceReport(metrics);
    const comparison = this.compareWithBaseline(metrics);

    return JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        report,
        comparison,
        historySize: this.metricsHistory.length,
      },
      null,
      2,
    );
  }

  /**
   * Obter análise semanal
   */
  getWeeklyAnalysis(): {
    avgMetrics: Metrics | null;
    bestDay: Date | null;
    worstDay: Date | null;
    avgHealthScore: PerformanceHealthScore | null;
  } {
    if (this.metricsHistory.length === 0) {
      return {
        avgMetrics: null,
        bestDay: null,
        worstDay: null,
        avgHealthScore: null,
      };
    }

    // Agrupar por dia
    const dayGroups: Map<string, Metrics[]> = new Map();

    for (const item of this.metricsHistory) {
      const day = item.timestamp.toISOString().split('T')[0];
      if (!dayGroups.has(day)) {
        dayGroups.set(day, []);
      }
      dayGroups.get(day)?.push(item.metrics);
    }

    // Calcular média diária e health score
    let bestScore = -1;
    let bestDay = null;
    let worstScore = 101;
    let worstDay = null;
    let totalScore = 0;
    let scoreCount = 0;

    const avgMetricsArray: Metrics[] = [];

    for (const [day, metrics] of dayGroups.entries()) {
      const avg: Metrics = {
        timeoutRate: metrics.reduce((sum, m) => sum + m.timeoutRate, 0) / metrics.length,
        acceptanceRate: metrics.reduce((sum, m) => sum + m.acceptanceRate, 0) / metrics.length,
        matchingTime: metrics.reduce((sum, m) => sum + m.matchingTime, 0) / metrics.length,
        errorRate: metrics.reduce((sum, m) => sum + m.errorRate, 0) / metrics.length,
        demandLevel: metrics.reduce((sum, m) => sum + m.demandLevel, 0) / metrics.length,
        p95ResponseTime: metrics.reduce((sum, m) => sum + m.p95ResponseTime, 0) / metrics.length,
        p99ResponseTime: metrics.reduce((sum, m) => sum + m.p99ResponseTime, 0) / metrics.length,
      };

      avgMetricsArray.push(avg);

      const score = this.calculateHealthScore(avg).overall;
      totalScore += score;
      scoreCount++;

      if (score > bestScore) {
        bestScore = score;
        bestDay = new Date(day);
      }

      if (score < worstScore) {
        worstScore = score;
        worstDay = new Date(day);
      }
    }

    // Calcular métrica média e health score médio
    const avgMetrics: Metrics = {
      timeoutRate: avgMetricsArray.reduce((sum, m) => sum + m.timeoutRate, 0) / avgMetricsArray.length,
      acceptanceRate: avgMetricsArray.reduce((sum, m) => sum + m.acceptanceRate, 0) / avgMetricsArray.length,
      matchingTime: avgMetricsArray.reduce((sum, m) => sum + m.matchingTime, 0) / avgMetricsArray.length,
      errorRate: avgMetricsArray.reduce((sum, m) => sum + m.errorRate, 0) / avgMetricsArray.length,
      demandLevel: avgMetricsArray.reduce((sum, m) => sum + m.demandLevel, 0) / avgMetricsArray.length,
      p95ResponseTime: avgMetricsArray.reduce((sum, m) => sum + m.p95ResponseTime, 0) / avgMetricsArray.length,
      p99ResponseTime: avgMetricsArray.reduce((sum, m) => sum + m.p99ResponseTime, 0) / avgMetricsArray.length,
    };

    const avgHealthScore = this.calculateHealthScore(avgMetrics);

    return {
      avgMetrics,
      bestDay,
      worstDay,
      avgHealthScore,
    };
  }

  // Helper methods

  private getRecommendations(metrics: Metrics, _score: PerformanceHealthScore): string[] {
    const recommendations: string[] = [];

    if (metrics.timeoutRate > 20) {
      recommendations.push('Increase timeout threshold');
    }
    if (metrics.acceptanceRate < 70) {
      recommendations.push('Consider driver incentives');
    }
    if (metrics.matchingTime > 45000) {
      recommendations.push('Adjust search radius');
    }
    if (metrics.errorRate > 5) {
      recommendations.push('Investigate error rate spike');
    }

    return recommendations;
  }

  private generateSummary(metrics: Metrics, score: PerformanceHealthScore): string {
    const status = score.overall >= 80 ? 'Excellent' : score.overall >= 60 ? 'Good' : 'Needs Attention';
    return `System Health: ${status} (Score: ${score.overall}/100) - Timeout: ${metrics.timeoutRate.toFixed(1)}%, Acceptance: ${metrics.acceptanceRate.toFixed(1)}%, Matching: ${(metrics.matchingTime / 1000).toFixed(1)}s`;
  }

  private getBaselineRecommendation(changes: Record<string, number>): string {
    const worstMetric = Object.entries(changes).reduce((worst, [metric, value]) => {
      if (metric === 'timeoutRate' || metric === 'errorRate') {
        value = -value; // Inverse for error metrics
      }
      return value < worst[1] ? [metric, value] : worst;
    }, ['', Infinity]);

    return `Focus on improving ${worstMetric[0]} which has declined ${Math.abs(worstMetric[1] as number).toFixed(1)}%`;
  }
}
