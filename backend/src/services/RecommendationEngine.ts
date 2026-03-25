/**
 * Recommendation Engine
 * Gera recomendações baseadas em análise de performance
 */

import { Logger } from '../utils/Logger';
import { Recommendation, RecommendationType } from '../models/ML';
import { Metrics } from '../models/Observability';

export class RecommendationEngine {
  private recommendations: Recommendation[] = [];

  /**
   * Gerar recomendações baseadas em métricas
   */
  generateRecommendations(metrics: Metrics, trends: { timeoutTrend: number; acceptanceTrend: number; matchingTrendTrend: number }): Recommendation[] {
    const recommendations: Recommendation[] = [];

    // Verifica timeout alto
    if (metrics.timeoutRate > 20) {
      recommendations.push({
        id: `rec_${Date.now()}_1`,
        type: 'extend_timeout' as RecommendationType,
        priority: metrics.timeoutRate > 30 ? 'CRITICAL' : 'HIGH',
        targetMetric: 'timeoutRate',
        currentValue: metrics.timeoutRate,
        recommendedValue: metrics.timeoutRate * 0.8,
        expectedImprovement: metrics.timeoutRate * 0.2,
        confidence: 85,
        reason: 'High timeout rate detected',
        timestamp: new Date(),
        metadata: {
          algorithm: 'threshold_based',
          dataPoints: 100,
        },
      });
    }

    // Verifica aceita baixa
    if (metrics.acceptanceRate < 70) {
      recommendations.push({
        id: `rec_${Date.now()}_2`,
        type: 'increase_driver_incentive' as RecommendationType,
        priority: metrics.acceptanceRate < 50 ? 'CRITICAL' : 'HIGH',
        targetMetric: 'acceptanceRate',
        currentValue: metrics.acceptanceRate,
        recommendedValue: metrics.acceptanceRate + 15,
        expectedImprovement: 15,
        confidence: 80,
        reason: 'Low driver acceptance rate',
        timestamp: new Date(),
        metadata: {
          algorithm: 'acceptance_analyzer',
          dataPoints: 50,
        },
      });
    }

    // Verifica tempo de matching
    if (metrics.matchingTime > 45000) {
      recommendations.push({
        id: `rec_${Date.now()}_3`,
        type: 'adjust_search_radius' as RecommendationType,
        priority: metrics.matchingTime > 60000 ? 'HIGH' : 'MEDIUM',
        targetMetric: 'matchingTime',
        currentValue: metrics.matchingTime,
        recommendedValue: metrics.matchingTime * 0.85,
        expectedImprovement: metrics.matchingTime * 0.15,
        confidence: 75,
        reason: 'Matching time exceeding threshold',
        timestamp: new Date(),
        metadata: {
          algorithm: 'matching_time_optimizer',
          dataPoints: 80,
        },
      });
    }

    // Verifica demanda baixa
    if (metrics.demandLevel < 20) {
      recommendations.push({
        id: `rec_${Date.now()}_4`,
        type: 'activate_surge_pricing' as RecommendationType,
        priority: metrics.demandLevel < 10 ? 'HIGH' : 'MEDIUM',
        targetMetric: 'demandLevel',
        currentValue: metrics.demandLevel,
        recommendedValue: metrics.demandLevel + 30,
        expectedImprovement: 30,
        confidence: 70,
        reason: 'Low demand level detected',
        timestamp: new Date(),
        metadata: {
          algorithm: 'demand_booster',
          dataPoints: 60,
        },
      });
    }

    // Verifica taxas anormais
    if (metrics.errorRate > 5) {
      recommendations.push({
        id: `rec_${Date.now()}_5`,
        type: 'alert_admin' as RecommendationType,
        priority: 'CRITICAL',
        targetMetric: 'errorRate',
        currentValue: metrics.errorRate,
        recommendedValue: metrics.errorRate * 0.5,
        expectedImprovement: metrics.errorRate * 0.5,
        confidence: 90,
        reason: 'Abnormal error rate detected',
        timestamp: new Date(),
        metadata: {
          algorithm: 'error_monitor',
          dataPoints: 100,
        },
      });
    }

    // Recomendações baseadas em tendências
    if (trends.timeoutTrend > 0.1) {
      recommendations.push({
        id: `rec_${Date.now()}_6`,
        type: 'extend_timeout' as RecommendationType,
        priority: 'MEDIUM',
        targetMetric: 'timeoutRate',
        currentValue: metrics.timeoutRate,
        recommendedValue: metrics.timeoutRate - 5,
        expectedImprovement: 5,
        confidence: 70,
        reason: 'Increasing timeout trend detected',
        timestamp: new Date(),
        metadata: {
          algorithm: 'trend_analyzer',
          trendValue: trends.timeoutTrend,
        },
      });
    }

    if (trends.acceptanceTrend < -0.1) {
      recommendations.push({
        id: `rec_${Date.now()}_7`,
        type: 'increase_driver_incentive' as RecommendationType,
        priority: 'MEDIUM',
        targetMetric: 'acceptanceRate',
        currentValue: metrics.acceptanceRate,
        recommendedValue: metrics.acceptanceRate + 10,
        expectedImprovement: 10,
        confidence: 75,
        reason: 'Declining acceptance trend detected',
        timestamp: new Date(),
        metadata: {
          algorithm: 'trend_analyzer',
          trendValue: trends.acceptanceTrend,
        },
      });
    }

    // Ordenar por prioridade
    const priorityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    this.recommendations = recommendations;
    Logger.info('RecommendationEngine', `Generated ${recommendations.length} recommendations`);

    return recommendations;
  }

  /**
   * Obter recomendações top N
   */
  getTopRecommendations(count: number = 5): Recommendation[] {
    return this.recommendations.slice(0, count);
  }

  /**
   * Obter recomendações por tipo
   */
  getRecommendationsByType(type: RecommendationType): Recommendation[] {
    return this.recommendations.filter((r) => r.type === type);
  }

  /**
   * Obter recomendações críticas
   */
  getCriticalRecommendations(): Recommendation[] {
    return this.recommendations.filter((r) => r.priority === 'CRITICAL');
  }

  /**
   * Aplicar recomendação (marcar como aplicada)
   */
  applyRecommendation(id: string): boolean {
    const rec = this.recommendations.find((r) => r.id === id);
    if (rec) {
      Logger.info('RecommendationEngine', `Applied recommendation: ${id}`);
      return true;
    }
    return false;
  }

  /**
   * Obter recomendações ativas
   */
  getActiveRecommendations(): Recommendation[] {
    const oneHourAgo = Date.now() - 3600000;
    return this.recommendations.filter((r) => r.timestamp.getTime() > oneHourAgo);
  }

  /**
   * Limpar recomendações antigas
   */
  clearOldRecommendations(): void {
    const threeDaysAgo = Date.now() - 3 * 24 * 3600000;
    this.recommendations = this.recommendations.filter((r) => r.timestamp.getTime() > threeDaysAgo);
    Logger.info('RecommendationEngine', 'Cleared old recommendations');
  }

  /**
   * Obter histórico de recomendações
   */
  getHistory(limit: number = 100): Recommendation[] {
    return this.recommendations.slice(-limit);
  }

  /**
   * Calcular impacto esperado
   */
  calculateExpectedImpact(): { totalImprovement: number; avgConfidence: number; totalRecommendations: number } {
    if (this.recommendations.length === 0) {
      return {
        totalImprovement: 0,
        avgConfidence: 0,
        totalRecommendations: 0,
      };
    }

    const totalImprovement = this.recommendations.reduce((sum, r) => sum + r.expectedImprovement, 0);
    const avgConfidence = this.recommendations.reduce((sum, r) => sum + r.confidence, 0) / this.recommendations.length;

    return {
      totalImprovement: totalImprovement / this.recommendations.length,
      avgConfidence,
      totalRecommendations: this.recommendations.length,
    };
  }

  /**
   * Exportar recomendações
   */
  export(): string {
    return JSON.stringify(
      {
        timestamp: new Date(),
        recommendations: this.recommendations,
        impact: this.calculateExpectedImpact(),
      },
      null,
      2,
    );
  }
}
