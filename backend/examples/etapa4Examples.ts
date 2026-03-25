/**
 * ETAPA 4 - Observability Examples
 * Exemplos de uso do sistema de observabilidade avançada
 */

import { MetricsCollector } from '../src/services/MetricsCollector';
import { AlertManager } from '../src/services/AlertManager';
import { DashboardService } from '../src/services/DashboardService';
import { MetricType, COMMON_ALERTS, AlertLevel } from '../src/models/Observability';

/**
 * Exemplo 1: Coleta básica de métricas
 */
export async function example1_basicMetricsCollection() {
  console.log('=== Exemplo 1: Coleta Básica de Métricas ===\n');

  const collector = new MetricsCollector();

  // Registrar algumas métricas
  collector.recordMetric({
    type: MetricType.MATCHING_ATTEMPT,
    value: 45,
    unit: 'ms',
    timestamp: new Date(),
    tags: { service: 'matching', status: 'success' },
    dimensions: {
      rideId: 'ride-123',
      driverId: 'driver-456',
      status: 'matched',
    },
  });

  collector.recordMetric({
    type: MetricType.TIMEOUT_EXPIRED,
    value: 1,
    unit: 'count',
    timestamp: new Date(),
    tags: { service: 'timeout', type: 'driver_accept' },
    dimensions: {
      rideId: 'ride-124',
    },
  });

  // Obter resumo
  const summary = collector.getSummary(60);
  console.log('Resumo de Métricas (últimas 60 minutos):');
  console.log(`  - Taxa de Sucesso de Matching: ${summary.rates.matchingSuccessRate || 0}%`);
  console.log(`  - Taxa de Aceita de Driver: ${summary.rates.driverAcceptanceRate || 0}%`);
  console.log(`  - Tempo Médio de Matching: ${summary.averages.matchingTime || 0}ms`);
  console.log(`  - Taxa de Timeout: ${summary.rates.timeoutRate || 0}%\n`);

  await collector.destroy();
}

/**
 * Exemplo 2: Definir alertas comuns
 */
export async function example2_commonAlerts() {
  console.log('=== Exemplo 2: Definir Alertas Comuns ===\n');

  const collector = new MetricsCollector();
  const alertManager = new AlertManager();

  // Definir alertas comuns
  const alertIds = alertManager.defineCommonAlerts();
  console.log(`${alertIds.length} alertas comuns definidos:`);
  alertIds.forEach((id, index) => {
    console.log(`  ${index + 1}. ${id}`);
  });

  // Verificar status de um alerta
  const status = alertManager.getAlertStatus(alertIds[0]);
  console.log(`\nStatus do primeiro alerta:`);
  console.log(`  - Nome: ${status?.name}`);
  console.log(`  - Habilitado: ${status?.enabled}`);
  console.log(`  - Disparando: ${status?.isFiring}\n`);

  await collector.destroy();
  await alertManager.destroy();
}

/**
 * Exemplo 3: Avaliar alerta contra métrica
 */
export async function example3_evaluateAlert() {
  console.log('=== Exemplo 3: Avaliar Alerta Contra Métrica ===\n');

  const alertManager = new AlertManager();
  const alertIds = alertManager.defineCommonAlerts();

  // Simular métrica de timeout alto
  const firstAlertId = alertIds[0]; // HIGH_TIMEOUT_RATE
  console.log('Testando alertas com valores simulados:');

  // Valor normal - não deve disparar
  let alert = alertManager.evaluateAlert(firstAlertId, 10);
  console.log(`  - Timeout rate 10%: ${alert ? 'ALERTA' : 'OK'}`);

  // Valor crítico - deve disparar
  alert = alertManager.evaluateAlert(firstAlertId, 25);
  console.log(`  - Timeout rate 25%: ${alert ? 'ALERTA DISPARADO' : 'OK'}`);

  if (alert) {
    console.log(`    Detalhes: ${alert.message}`);
    console.log(`    Nível: ${alert.level}`);
  }

  console.log();

  await alertManager.destroy();
}

/**
 * Exemplo 4: Dashboard em tempo real
 */
export async function example4_dashboardRealtime() {
  console.log('=== Exemplo 4: Dashboard em Tempo Real ===\n');

  const collector = new MetricsCollector();
  const alertManager = new AlertManager();
  const dashboard = new DashboardService(collector, alertManager);

  // Definir alertas
  alertManager.defineCommonAlerts();

  // Registrar algumas métricas
  collector.recordMetric({
    type: MetricType.MATCHING_ATTEMPT,
    value: 50,
    unit: 'ms',
    timestamp: new Date(),
  });

  collector.recordMetric({
    type: MetricType.DRIVER_ACCEPTANCE_RATE,
    value: 85,
    unit: '%',
    timestamp: new Date(),
  });

  // Obter dados do dashboard
  const data = dashboard.getDashboardData();

  console.log('Dados do Dashboard:');
  console.log(`  - Saúde do Sistema: OK`);
  console.log(`  - Alertas Ativos: ${data.alerts?.recent?.length || 0}`);
  console.log(`  - Corridas Completadas: ${data.rideMetrics?.completed || 0}`);
  console.log(`  - Drivers Ativos: ${data.driverMetrics?.activeDrivers || 0}`);
  console.log(`  - Drivers Inativos: ${data.driverMetrics?.offlineDrivers || 0}`);
  console.log(`  - Total Timeouts: ${data.timeoutMetrics?.total || 0}\n`);

  await collector.destroy();
  await alertManager.destroy();
  await dashboard.destroy();
}

/**
 * Exemplo 5: Histórico de alertas
 */
export async function example5_alertHistory() {
  console.log('=== Exemplo 5: Histórico de Alertas ===\n');

  const alertManager = new AlertManager();
  alertManager.defineCommonAlerts();

  // Simular múltiplos disparos
  const alert1 = alertManager.evaluateAlert('alert-1', 25); // Timeout alto
  const alert2 = alertManager.evaluateAlert('alert-2', 50); // Aceita baixa

  // Obter histórico
  const history = alertManager.getAlertHistory(10);
  console.log(`Total de alertas no histórico: ${history.length}`);

  // Obter estatísticas
  const stats = alertManager.getStats();
  console.log('\nEstatísticas de Alertas:');
  console.log(`  - Total de Alertas Definidos: ${stats.totalAlerts}`);
  console.log(`  - Alertas Ativos: ${stats.activeAlerts}`);
  console.log(`  - Alertas Recentes (1h): ${stats.recentAlerts}`);
  console.log(`  - Severidade:`);
  console.log(`    • CRITICAL: ${stats.bySeverity.critical}`);
  console.log(`    • WARNING: ${stats.bySeverity.warning}`);
  console.log(`    • INFO: ${stats.bySeverity.info}\n`);

  await alertManager.destroy();
}

/**
 * Exemplo 6: Reconhecer alertas
 */
export async function example6_acknowledgeAlerts() {
  console.log('=== Exemplo 6: Reconhecer Alertas ===\n');

  const collector = new MetricsCollector();
  const alertManager = new AlertManager();
  const dashboard = new DashboardService(collector, alertManager);

  alertManager.defineCommonAlerts();

  // Simular alerta
  const alert = alertManager.evaluateAlert('alert-1', 25);

  if (alert) {
    console.log(`Alerta disparado: ${alert.name}`);

    // Reconhecer alerta
    dashboard.acknowledgeAlert(alert.alertId);
    console.log('Alerta reconhecido pelo usuário\n');
  }

  await collector.destroy();
  await alertManager.destroy();
  await dashboard.destroy();
}

/**
 * Exemplo 7: Tendências e análises
 */
export async function example7_trendsAnalysis() {
  console.log('=== Exemplo 7: Tendências e Análises ===\n');

  const collector = new MetricsCollector();

  // Registrar métricas ao longo do tempo
  const now = Date.now();
  for (let i = 0; i < 10; i++) {
    collector.recordMetric({
      type: MetricType.MATCHING_ATTEMPT,
      value: 30 + i * 5, // Tendência crescente
      unit: 'ms',
      timestamp: new Date(now - i * 60000),
    });
  }

  // Analisar tendência
  const trend = collector.getTrendAnalysis(MetricType.MATCHING_ATTEMPT);
  console.log('Análise de Tendência (Tempo de Matching):');
  console.log(`  - Tendência: ${trend.trend}`);
  console.log(`  - Mudança %: ${trend.percentageChange}%`);
  console.log(`  - Previsão: ${trend.forecast}\n`);

  await collector.destroy();
}

/**
 * Exemplo 8: Exportar dados
 */
export async function example8_exportData() {
  console.log('=== Exemplo 8: Exportar Dados ===\n');

  const collector = new MetricsCollector();

  // Registrar algumas métricas
  for (let i = 0; i < 5; i++) {
    collector.recordMetric({
      type: MetricType.MATCHING_ATTEMPT,
      value: 40 + Math.random() * 20,
      unit: 'ms',
      timestamp: new Date(),
    });
  }

  // Exportar
  const exported = collector.export();
  console.log('Dados exportados (JSON):');
  console.log('  - Timestamp:', exported.timestamp);
  console.log('  - Total de métricas coletadas');

  await collector.destroy();
}

/**
 * Exemplo 9: Listeners de alerta
 */
export async function example9_alertListeners() {
  console.log('=== Exemplo 9: Listeners de Alerta ===\n');

  const alertManager = new AlertManager();

  // Adicionar listener
  alertManager.addAlertListener(async (alert) => {
    console.log(`[LISTENER] Alerta recebido: ${alert.name}`);
  });

  alertManager.defineCommonAlerts();

  // Disparar alerta
  const alert = alertManager.evaluateAlert('alert-1', 25);

  if (alert) {
    // Notificar listeners
    await alertManager.notifyListeners(alert);
  }

  console.log();

  await alertManager.destroy();
}

/**
 * Exemplo 10: Integração completa
 */
export async function example10_fullIntegration() {
  console.log('=== Exemplo 10: Integração Completa ===\n');

  const collector = new MetricsCollector();
  const alertManager = new AlertManager();
  const dashboard = new DashboardService(collector, alertManager);

  // Iniciar refresh automático
  dashboard.startAutoRefresh(5000);

  // Definir alertas
  alertManager.defineCommonAlerts();

  // Simular coleta de métricas
  console.log('Coletando métricas...');
  const metricTypes = [
    MetricType.MATCHING_ATTEMPT,
    MetricType.DRIVER_ACCEPTANCE_RATE,
    MetricType.TIMEOUT_STARTED,
  ];

  for (let i = 0; i < 3; i++) {
    const type = metricTypes[i];
    collector.recordMetric({
      type,
      value: 40 + Math.random() * 60,
      unit: type === MetricType.DRIVER_ACCEPTANCE_RATE ? '%' : 'ms',
      timestamp: new Date(),
    });
  }

  // Obter dados do dashboard
  const dashboardData = dashboard.getDashboardData();
  console.log('\nResumo Final do Dashboard:');
  console.log(`  - Corridas: ${dashboardData.summary?.totalRides || 0}`);
  console.log(`  - Alertas Críticos: ${dashboardData.alerts?.critical || 0}`);
  console.log(`  - Timeouts: ${dashboardData.timeoutMetrics?.total || 0}\n`);

  // Parar refresh
  dashboard.stopAutoRefresh();

  await collector.destroy();
  await alertManager.destroy();
  await dashboard.destroy();
}

/**
 * Executar todos os exemplos
 */
export async function runAllExamples() {
  console.log('🚀 ETAPA 4 - Observability Examples\n');
  console.log('===============================================\n');

  try {
    await example1_basicMetricsCollection();
    await example2_commonAlerts();
    await example3_evaluateAlert();
    await example4_dashboardRealtime();
    await example5_alertHistory();
    await example6_acknowledgeAlerts();
    await example7_trendsAnalysis();
    await example8_exportData();
    await example9_alertListeners();
    await example10_fullIntegration();

    console.log('===============================================');
    console.log('✅ Todos os exemplos executados com sucesso!\n');
  } catch (err) {
    console.error('❌ Erro ao executar exemplos:', err);
  }
}

// Executar se for o arquivo principal
if (require.main === module) {
  runAllExamples().catch(console.error);
}
