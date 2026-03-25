/**
 * Metrics Job
 * Job de background para coleta e processamento de métricas
 */

import { JobContext } from './interfaces';
import { Logger } from '../utils/Logger';
import { MetricsCollector } from '../services/MetricsCollector';

export class MetricsJob {
  id = 'metrics-collector';
  name = 'Metrics Collection Job';
  description = 'Coleta e processa métricas do sistema em tempo real';
  schedule = 60000; // 60 segundos

  constructor(private metricsCollector: MetricsCollector) {}

  async execute(context: JobContext): Promise<void> {
    try {
      const startTime = Date.now();

      // Agregar métricas por período
      const aggregation = this.metricsCollector.calculateAggregation('hour');

      // Obter resumo
      const summary = this.metricsCollector.getSummary(60);

      // Verificar saúde
      const health = this.metricsCollector.getHealthStatus();

      // JobContext é read-only, não tem métodos incrementAttempt/updateLastResult/addError

      Logger.info('MetricsJob', `Metrics collected, health: ${health.status}`);
    } catch (err) {
      Logger.error('MetricsJob', `Error collecting metrics: ${err}`);
      throw err;
    }
  }

  shouldRetry(attempt: number, error: Error): boolean {
    return attempt < 3; // Até 3 tentativas
  }
}
