/**
 * ETAPA 5 - Performance & Machine Learning Examples
 * Exemplos de uso do sistema de ML
 */

import { MLEngine } from '../src/services/MLEngine';
import { PredictionType, AnomalyType, TrainingData } from '../src/models/ML';

/**
 * Exemplo 1: Treinamento básico
 */
export async function example1_basicTraining() {
  console.log('=== Exemplo 1: Treinamento Básico ===\n');

  const mlEngine = new MLEngine();

  // Adicionar dados de treinamento
  for (let i = 0; i < 50; i++) {
    mlEngine.addTrainingData({
      timestamp: new Date(Date.now() - i * 3600000),
      metrics: {
        timeoutRate: 15 + Math.random() * 10,
        matchingTime: 35000 + Math.random() * 20000,
        acceptanceRate: 70 + Math.random() * 25,
        demandLevel: 50 + Math.random() * 100,
        systemLoad: 40 + Math.random() * 50,
      },
      outcome: {
        succeeded: Math.random() > 0.15,
      },
    });
  }

  console.log('✅ 50 dados de treinamento adicionados');
  console.log('Pronto para fazer previsões!\n');

  await mlEngine.destroy();
}

/**
 * Exemplo 2: Previsão de demanda
 */
export async function example2_demandPrediction() {
  console.log('=== Exemplo 2: Previsão de Demanda ===\n');

  const mlEngine = new MLEngine();

  // Adicionar dados históricos
  const demandPattern = [50, 55, 60, 75, 85, 90, 95, 90, 85, 75, 65, 55];
  for (let i = 0; i < demandPattern.length; i++) {
    mlEngine.addTrainingData({
      timestamp: new Date(Date.now() - i * 3600000),
      metrics: {
        timeoutRate: 15,
        matchingTime: 40000,
        acceptanceRate: 75,
        demandLevel: demandPattern[i],
        systemLoad: 50,
      },
      outcome: { succeeded: true },
    });
  }

  // Fazer previsão
  const prediction = mlEngine.predictDemand(30);

  console.log('Previsão de Demanda (próximos 30min):');
  console.log(`  - Valor: ${prediction.value.toFixed(2)} rides`);
  console.log(`  - Confiança: ${prediction.confidence}%`);
  console.log(`  - Intervalo: [${prediction.lowerBound.toFixed(2)}, ${prediction.upperBound.toFixed(2)}]`);
  console.log(`  - Acurácia do modelo: ${prediction.accuracy}%`);
  console.log(`  - Hora do dia: ${prediction.factors.timeOfDay}`);
  console.log(`  - Dia da semana: ${prediction.factors.dayOfWeek}\n`);

  await mlEngine.destroy();
}

/**
 * Exemplo 3: Detecção de anomalias
 */
export async function example3_anomalyDetection() {
  console.log('=== Exemplo 3: Detecção de Anomalias ===\n');

  const mlEngine = new MLEngine();

  // Adicionar dados normais
  for (let i = 0; i < 50; i++) {
    mlEngine.addTrainingData({
      timestamp: new Date(Date.now() - i * 3600000),
      metrics: {
        timeoutRate: 15 + Math.random() * 5,
        matchingTime: 40000 + Math.random() * 5000,
        acceptanceRate: 75 + Math.random() * 5,
        demandLevel: 50 + Math.random() * 30,
        systemLoad: 50 + Math.random() * 20,
      },
      outcome: { succeeded: true },
    });
  }

  // Detectar anomalia
  const anomalies = mlEngine.detectAnomalies({
    timeoutRate: 95, // Muito alto!
    matchingTime: 150000, // Muito alto!
    acceptanceRate: 20, // Muito baixo!
    demandLevel: 80,
    systemLoad: 90,
  });

  console.log(`Anomalias detectadas: ${anomalies.length}`);
  anomalies.forEach((anom, i) => {
    console.log(`  ${i + 1}. ${anom.type}`);
    console.log(`     - Severidade: ${anom.severity}`);
    console.log(`     - Z-Score: ${anom.deviationScore.toFixed(2)}`);
    console.log(`     - Recomendação: ${anom.recommendation}`);
  });
  console.log();

  await mlEngine.destroy();
}

/**
 * Exemplo 4: Previsão de timeout
 */
export async function example4_timeoutPrediction() {
  console.log('=== Exemplo 4: Previsão de Timeout ===\n');

  const mlEngine = new MLEngine();

  // Adicionar dados com alguns timeouts
  for (let i = 0; i < 60; i++) {
    const timeout = Math.random() < 0.18; // 18% timeout rate

    mlEngine.addTrainingData({
      timestamp: new Date(Date.now() - i * 3600000),
      metrics: {
        timeoutRate: 15,
        matchingTime: 40000,
        acceptanceRate: 75,
        demandLevel: 50,
        systemLoad: 50,
      },
      outcome: {
        succeeded: !timeout,
        reason: timeout ? 'driver_timeout' : 'completed',
      },
    });
  }

  // Prever timeout
  const prediction = mlEngine.predictTimeout();

  console.log('Previsão de Timeout (próximo minuto):');
  console.log(`  - Probabilidade: ${prediction.value.toFixed(2)}%`);
  console.log(`  - Confiança: ${prediction.confidence}%`);
  console.log(`  - Intervalo: [${prediction.lowerBound.toFixed(2)}%, ${prediction.upperBound.toFixed(2)}%]`);
  console.log(`  - Amostras usadas: ${prediction.metadata.samplesUsed}`);
  console.log(`  - Algoritmo: ${prediction.metadata.algorithm}\n`);

  await mlEngine.destroy();
}

/**
 * Exemplo 5: Análise de comportamento
 */
export async function example5_behaviorAnalysis() {
  console.log('=== Exemplo 5: Análise de Comportamento ===\n');

  const mlEngine = new MLEngine();

  // Adicionar dados
  for (let i = 0; i < 168; i++) {
    mlEngine.addTrainingData({
      timestamp: new Date(Date.now() - i * 3600000),
      metrics: {
        timeoutRate: 15 + Math.random() * 10,
        matchingTime: 40000 + Math.random() * 10000,
        acceptanceRate: 75 + Math.random() * 15,
        demandLevel: 50 + Math.random() * 100,
        systemLoad: 50 + Math.random() * 30,
      },
      outcome: { succeeded: Math.random() > 0.15 },
    });
  }

  // Analisar comportamento
  const behavior = mlEngine.analyzeBehavior();

  console.log('Análise de Comportamento:');
  console.log(`  Horas de pico: ${behavior.patterns.peakHours.join(', ')}`);
  console.log(`  Horas quietas: ${behavior.patterns.quietHours.join(', ')}`);
  console.log(`  Padrões de driver:`);
  behavior.patterns.driverPatterns.forEach((p) => {
    console.log(`    - ${p.behavior}: ${p.percentage}%`);
  });
  console.log(`  Tendências:`);
  console.log(`    - Demanda: ${behavior.trends.demandTrend}`);
  console.log(`    - Aceita: ${behavior.trends.acceptanceTrend}`);
  console.log(`    - Timeout: ${behavior.trends.timeoutTrend}`);
  console.log(`  Clusters:`);
  console.log(`    - Drivers: ${behavior.clusters.driverCluster}`);
  console.log(`    - Passageiros: ${behavior.clusters.passengerCluster}`);
  console.log(`    - Rotas: ${behavior.clusters.routeCluster}\n`);

  await mlEngine.destroy();
}

/**
 * Exemplo 6: Recomendações automáticas
 */
export async function example6_recommendations() {
  console.log('=== Exemplo 6: Recomendações Automáticas ===\n');

  const mlEngine = new MLEngine();

  // Adicionar dados com problemas
  for (let i = 0; i < 30; i++) {
    mlEngine.addTrainingData({
      timestamp: new Date(Date.now() - i * 3600000),
      metrics: {
        timeoutRate: 25, // Alto
        matchingTime: 60000, // Alto
        acceptanceRate: 65, // Baixo
        demandLevel: 50,
        systemLoad: 80, // Alto
      },
      outcome: { succeeded: Math.random() > 0.25 },
    });
  }

  // Gerar recomendações
  const recommendations = mlEngine.generateRecommendations({
    timeoutRate: 25,
    matchingTime: 60000,
    acceptanceRate: 65,
    demandLevel: 50,
  });

  console.log(`Recomendações geradas: ${recommendations.length}`);
  recommendations.forEach((rec, i) => {
    console.log(`  ${i + 1}. ${rec.type}`);
    console.log(`     - Prioridade: ${rec.priority}`);
    console.log(`     - Valor atual: ${rec.currentValue}`);
    console.log(`     - Valor recomendado: ${rec.recommendedValue}`);
    console.log(`     - Melhoria esperada: ${rec.expectedImprovement}%`);
    console.log(`     - Confiança: ${rec.confidence}%`);
    console.log(`     - Razão: ${rec.reason}`);
  });
  console.log();

  await mlEngine.destroy();
}

/**
 * Exemplo 7: Comparação com baseline
 */
export async function example7_baselineComparison() {
  console.log('=== Exemplo 7: Comparação com Baseline ===\n');

  const mlEngine = new MLEngine();

  // Adicionar dados históricos (última semana)
  for (let i = 168; i > 144; i--) {
    mlEngine.addTrainingData({
      timestamp: new Date(Date.now() - i * 3600000),
      metrics: {
        timeoutRate: 20,
        matchingTime: 50000,
        acceptanceRate: 70,
        demandLevel: 50,
        systemLoad: 60,
      },
      outcome: { succeeded: Math.random() > 0.2 },
    });
  }

  // Adicionar dados atuais (últimas 24h)
  for (let i = 24; i > 0; i--) {
    mlEngine.addTrainingData({
      timestamp: new Date(Date.now() - i * 3600000),
      metrics: {
        timeoutRate: 15, // Melhorou
        matchingTime: 42000, // Melhorou
        acceptanceRate: 78, // Melhorou
        demandLevel: 55,
        systemLoad: 55,
      },
      outcome: { succeeded: Math.random() > 0.15 },
    });
  }

  // Comparar
  const comparison = mlEngine.compareWithBaseline();

  console.log('Comparação com Baseline:');
  console.log(`  Período baseline: ${comparison.baseline.period}`);
  console.log(`  Período atual: ${comparison.current.period}`);
  console.log(`  Melhoria geral: ${comparison.improvement.toFixed(2)}%`);
  console.log(`  Tendência: ${comparison.trend}`);
  console.log(`  Diferenças:`);
  comparison.differences.forEach((diff) => {
    console.log(`    - ${diff.metric}: ${diff.baselineValue.toFixed(2)} → ${diff.currentValue.toFixed(2)} (${diff.percentageChange.toFixed(2)}%)`);
  });
  console.log(`  Recomendações:`);
  comparison.recommendations.forEach((rec) => {
    console.log(`    - ${rec}`);
  });
  console.log();

  await mlEngine.destroy();
}

/**
 * Exemplo 8: Resumo de ML
 */
export async function example8_mlSummary() {
  console.log('=== Exemplo 8: Resumo de ML ===\n');

  const mlEngine = new MLEngine();

  // Adicionar dados
  for (let i = 0; i < 100; i++) {
    mlEngine.addTrainingData({
      timestamp: new Date(Date.now() - i * 3600000),
      metrics: {
        timeoutRate: 15 + Math.random() * 10,
        matchingTime: 35000 + Math.random() * 20000,
        acceptanceRate: 70 + Math.random() * 25,
        demandLevel: 50 + Math.random() * 100,
        systemLoad: 40 + Math.random() * 50,
      },
      outcome: { succeeded: Math.random() > 0.15 },
    });
  }

  // Obter resumo
  const summary = mlEngine.getSummary();

  console.log('Resumo de ML:');
  console.log(`  Score de Saúde: ${summary.overallHealthScore.toFixed(0)}/100`);
  console.log(`  Previsões: ${summary.predictions.length}`);
  console.log(`  Anomalias: ${summary.anomalies.length}`);
  console.log(`  Recomendações: ${summary.recommendations.length}`);
  console.log(`  Alertas Críticos: ${summary.criticalAlerts.length}`);
  console.log(`  Próximas ações:`);
  summary.nextActionItems.slice(0, 3).forEach((item) => {
    console.log(`    - ${item}`);
  });
  console.log();

  await mlEngine.destroy();
}

/**
 * Exemplo 9: Predição de tempo de matching
 */
export async function example9_matchingTimePrediction() {
  console.log('=== Exemplo 9: Predição de Tempo de Matching ===\n');

  const mlEngine = new MLEngine();

  // Adicionar dados históricos
  for (let i = 0; i < 50; i++) {
    mlEngine.addTrainingData({
      timestamp: new Date(Date.now() - i * 3600000),
      metrics: {
        timeoutRate: 15,
        matchingTime: 35000 + Math.random() * 15000,
        acceptanceRate: 75,
        demandLevel: 50 + Math.random() * 50,
        systemLoad: 50,
      },
      outcome: { succeeded: true },
    });
  }

  // Prever
  const prediction = mlEngine.predictMatchingTime();

  console.log('Previsão de Tempo de Matching:');
  console.log(`  - Tempo estimado: ${(prediction.value / 1000).toFixed(1)}s`);
  console.log(`  - Confiança: ${prediction.confidence}%`);
  console.log(`  - Intervalo: [${(prediction.lowerBound / 1000).toFixed(1)}s, ${(prediction.upperBound / 1000).toFixed(1)}s]`);
  console.log(`  - Acurácia: ${prediction.accuracy}%`);
  console.log(`  - Amostras: ${prediction.metadata.samplesUsed}\n`);

  await mlEngine.destroy();
}

/**
 * Exemplo 10: Integração completa
 */
export async function example10_fullIntegration() {
  console.log('=== Exemplo 10: Integração Completa ===\n');

  const mlEngine = new MLEngine();

  // Simular 1 semana de dados
  console.log('Simulando 1 semana de dados...');
  for (let i = 0; i < 168; i++) {
    const hour = i % 24;
    const demandBase = hour >= 7 && hour <= 22 ? 70 : 30;

    mlEngine.addTrainingData({
      timestamp: new Date(Date.now() - i * 3600000),
      metrics: {
        timeoutRate: 15 + Math.sin(i / 24) * 5,
        matchingTime: 40000 + Math.cos(i / 12) * 10000,
        acceptanceRate: 75 + Math.sin(i / 24) * 10,
        demandLevel: demandBase + Math.random() * 30,
        systemLoad: demandBase * 0.5 + Math.random() * 30,
      },
      outcome: { succeeded: Math.random() > 0.15 },
    });
  }

  console.log('✅ Dados importados\n');

  // Fazer tudo
  console.log('Processando...\n');

  const demand = mlEngine.predictDemand(30);
  const timeout = mlEngine.predictTimeout();
  const matching = mlEngine.predictMatchingTime();
  const anomalies = mlEngine.detectAnomalies({
    timeoutRate: timeout.value,
    matchingTime: matching.value,
    acceptanceRate: 75,
    demandLevel: demand.value,
    systemLoad: 50,
  });
  const behavior = mlEngine.analyzeBehavior();
  const recommendations = mlEngine.generateRecommendations({
    timeoutRate: timeout.value,
    matchingTime: matching.value,
    acceptanceRate: 75,
  });
  const summary = mlEngine.getSummary();

  console.log('📊 RELATÓRIO FINAL');
  console.log('==================\n');
  console.log(`Saúde do Sistema: ${summary.overallHealthScore.toFixed(0)}/100`);
  console.log(`\nPrevisões:`);
  console.log(`  • Demanda (30min): ${demand.value.toFixed(0)} rides`);
  console.log(`  • Timeout: ${timeout.value.toFixed(1)}%`);
  console.log(`  • Tempo matching: ${(matching.value / 1000).toFixed(1)}s`);
  console.log(`\nAnomalias: ${anomalies.length}`);
  console.log(`Recomendações: ${recommendations.length}`);
  console.log(`\n✅ Sistema pronto!\n`);

  await mlEngine.destroy();
}

/**
 * Executar todos os exemplos
 */
export async function runAllExamples() {
  console.log('🚀 ETAPA 5 - Performance & Machine Learning Examples\n');
  console.log('===============================================\n');

  try {
    await example1_basicTraining();
    await example2_demandPrediction();
    await example3_anomalyDetection();
    await example4_timeoutPrediction();
    await example5_behaviorAnalysis();
    await example6_recommendations();
    await example7_baselineComparison();
    await example8_mlSummary();
    await example9_matchingTimePrediction();
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
