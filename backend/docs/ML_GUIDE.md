<!-- ML_GUIDE.md -->

# ML Guide - Vou de Moto - ETAPA 5

**Guia Técnico Completo para o Motor de Machine Learning**

## Índice

1. [Fundação Teórica](#fundação-teórica)
2. [Arquitetura](#arquitetura)
3. [Algoritmos Implementados](#algoritmos-implementados)
4. [Componentes](#componentes)
5. [Integração](#integração)
6. [Exemplos Práticos](#exemplos-práticos)
7. [Troubleshooting](#troubleshooting)
8. [Performance e Limites](#performance-e-limites)

---

## Fundação Teórica

### Estatística Descritiva

#### Média (Mean - μ)
$$\mu = \frac{\sum_{i=1}^{n} x_i}{n}$$

Representa o valor central dos dados. Afetada por outliers.

**Exemplo**: Tempos de matching [25s, 30s, 28s, 35s, 32s]
$$\mu = \frac{25 + 30 + 28 + 35 + 32}{5} = 30s$$

#### Desvio Padrão (Standard Deviation - σ)
$$\sigma = \sqrt{\frac{\sum_{i=1}^{n} (x_i - \mu)^2}{n}}$$

Mede a variabilidade dos dados. Quanto maior, mais dispersos estão os dados.

**Exemplo**: Com μ = 30s
$$\sigma = \sqrt{\frac{(25-30)^2 + (30-30)^2 + (28-30)^2 + (35-30)^2 + (32-30)^2}{5}} = 3.16s$$

#### Coeficiente de Variação (CV)
$$CV = \frac{\sigma}{\mu} \times 100\%$$

Mede a variabilidade relativa. Útil para comparar dispersão entre variáveis com diferentes escalas.

**Exemplo**: $CV = \frac{3.16}{30} \times 100\% = 10.5\%$

### Distribuição Normal e Z-Score

A distribuição normal (curva de Gauss) descreve como os dados se distribuem em torno da média.

#### Propriedades
- 68% dos dados estão em μ ± σ (1 desvio padrão)
- 95% dos dados estão em μ ± 1.96σ (2 desvios padrão)
- 99.7% dos dados estão em μ ± 3σ (3 desvios padrão)

#### Z-Score
$$Z = \frac{x - \mu}{\sigma}$$

Padroniza um valor, indicando quantos desvios padrão ele está da média.

**Interpretação**:
- Z > 2 ou Z < -2: Anomalia (5% de significância)
- Z > 3 ou Z < -3: Anomalia forte (0.3% de significância)
- -1 < Z < 1: Valor normal (68% de confiança)

**Exemplo**: Timeout rate = 40%, μ = 15%, σ = 5%
$$Z = \frac{40 - 15}{5} = 5$$

Z = 5 é uma anomalia muito forte (timeout crítico).

### Intervalo de Confiança

Para 95% de confiança:
$$IC_{95\%} = [\mu - 1.96\sigma, \mu + 1.96\sigma]$$

Indica a faixa onde esperamos que o valor real esteja com 95% de probabilidade.

**Exemplo**: Tempo de matching
- μ = 35s, σ = 3.16s
- $IC_{95\%} = [35 - 1.96 \times 3.16, 35 + 1.96 \times 3.16]$
- $IC_{95\%} = [28.8s, 41.2s]$

---

## Arquitetura

### Componentes Principais

```
┌─────────────────────────────────────────────────┐
│             Application Layer                   │
│  (Jobs, Controllers, Services)                  │
└────────────────┬────────────────────────────────┘
                 │
        ┌────────▼────────┐
        │  MLEngine (Hub) │ ◄────── Central de Orquestração
        └────┬───┬────┬───┴────────┐
             │   │    │           │
    ┌────────▼─┐ │    │      ┌────▼──────────┐
    │Prediction│ │    │      │  Analytics    │
    │  Models  │ │    │      └───────────────┘
    └──────────┘ │    │
                 │    │
    ┌────────────▼────▼────────┐
    │  Statistical Algorithms  │
    │ - Moving Average        │
    │ - Z-Score              │
    │ - Std Dev              │
    │ - Confidence Intervals  │
    └─────────────────────────┘
                 │
    ┌────────────▼────────────┐
    │   Training Data Store   │
    │   (max 10,000 records)  │
    └─────────────────────────┘
```

### Fluxo de Dados

```
1. Application
   │
2. MLEngine receives metrics
   │
3. Add training data
   │
4. Run statistical algorithms
   │
5. Generate predictions/anomalies
   │
6. Cache results
   │
7. Return to application
```

---

## Algoritmos Implementados

### 1. Moving Average (MA)

**Propósito**: Suavizar dados e reduzir ruído
**Fórmula**: $MA_t = \frac{\sum_{i=t-w+1}^{t} x_i}{w}$

Onde:
- $MA_t$ = Média móvel no tempo t
- $w$ = Tamanho da janela
- $x_i$ = Valor no tempo i

**Implementação no Vou de Moto**:

```typescript
private calculateMovingAverage(values: number[], window: number = 5): number {
  if (values.length < window) {
    return values.reduce((a, b) => a + b, 0) / values.length;
  }
  
  const recent = values.slice(-window);
  return recent.reduce((a, b) => a + b, 0) / window;
}
```

**Uso**: Previsão de demanda
**Exemplo**: 
- Dados últimas 5 horas: [50, 52, 48, 55, 53] (demanda)
- MA₅ = (50 + 52 + 48 + 55 + 53) / 5 = 51.6

**Vantagens**:
- Simples de implementar
- Eficaz para remover ruído
- Computacionalmente leve
- Bom para dados com tendência suave

**Limitações**:
- Atraso em dados com mudanças abruptas
- Todos os pontos têm mesmo peso
- Não captura sazonalidade

### 2. Z-Score para Detecção de Anomalias

**Propósito**: Identificar valores anormais
**Fórmula**: $Z = \frac{x - \mu}{\sigma}$

**Implementação**:

```typescript
private checkZScore(value: number, values: number[], threshold: number = 2): boolean {
  if (values.length < 2) return false;
  
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const stdDev = this.calculateStdDev(values);
  
  const zscore = (value - mean) / stdDev;
  
  return Math.abs(zscore) > threshold; // Z > 2 é anomalia
}
```

**Interpretação**:
- |Z| ≤ 1: Valor normal (68% dos dados)
- 1 < |Z| ≤ 2: Valor incomum (5% dos dados)
- |Z| > 2: Anomalia (< 5% dos dados)
- |Z| > 3: Anomalia forte (< 0.3% dos dados)

**Exemplo**:
- Timeout rate normal: 15% ± 2%
- Timeout rate observado: 22%
- Z = (22 - 15) / 2 = 3.5 → Anomalia forte (CRÍTICA)

**Vantagens**:
- Estatisticamente fundamentado
- Adapta-se a diferentes escalas
- Simples e rápido

**Limitações**:
- Assume distribuição normal
- Afetado por múltiplas anomalias consecutivas
- Não detecta mudanças graduais

### 3. Desvio Padrão

**Propósito**: Quantificar variabilidade
**Fórmula**: $\sigma = \sqrt{\frac{\sum_{i=1}^{n} (x_i - \mu)^2}{n}}$

**Implementação**:

```typescript
private calculateStdDev(values: number[]): number {
  if (values.length < 2) return 0;
  
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  
  return Math.sqrt(variance);
}
```

**Uso**: Base para Z-Score, Confidence Intervals, análise de volatilidade

**Exemplo**:
- Matching times: [30s, 28s, 32s, 31s, 29s]
- Média: 30s
- Variância: ((0)² + (2)² + (2)² + (1)² + (1)²) / 5 = 2
- σ = √2 = 1.41s

### 4. Intervalo de Confiança (95%)

**Propósito**: Fornecer faixa de incerteza para previsões
**Fórmula**: $IC = [\mu - 1.96\sigma, \mu + 1.96\sigma]$

**Implementação**:

```typescript
const confidence95 = {
  lower: mean - 1.96 * stdDev,
  upper: mean + 1.96 * stdDev
};
```

**Interpretação**:
- Com 95% de confiança, o valor real está nesta faixa
- Faixa maior = menos certeza
- Faixa menor = mais certeza

**Exemplo**: Previsão de demand
- Previsão: 60 rides/hora
- IC95: [54, 66] rides/hora
- Significa: confiamos que a demanda estará entre 54 e 66 com 95% de probabilidade

---

## Componentes

### 1. MLEngine

**Responsabilidade**: Orquestração central de todas as operações ML

#### Métodos Principais

##### predictDemand(periodMinutes: number = 30): PredictionModel

Prevê a demanda de rides usando Moving Average.

```typescript
// Uso
const mlEngine = new MLEngine();
mlEngine.addTrainingData(data1);
mlEngine.addTrainingData(data2);

const prediction = mlEngine.predictDemand(30);
console.log(prediction.value); // 65.4 rides
console.log(prediction.confidence); // 85%
console.log(prediction.lowerBound); // 58.2
console.log(prediction.upperBound); // 72.6
```

**Algoritmo**:
1. Calcula média dos últimos 30 dados
2. Calcula desvio padrão
3. Aplica fator sazonal (horário do dia)
4. Retorna previsão com IC 95%

##### predictTimeout(): PredictionModel

Prevê probabilidade de timeout baseada em histórico.

```typescript
const timeoutPred = mlEngine.predictTimeout();
console.log(timeoutPred.value); // 18.5% de chance de timeout
```

**Algoritmo**:
1. Conta taxa de falhas históricas
2. Analisa últimas 10 observações
3. Calcula tendência
4. Retorna percentual com confidence

##### detectAnomalies(metrics: Metrics): AnomalyModel[]

Detecta anomalias usando Z-Score.

```typescript
const metrics = {
  timeoutRate: 45, // 3x mais que normal
  acceptanceRate: 80,
  matchingTime: 35000,
  errorRate: 2,
  demandLevel: 60,
  p95ResponseTime: 200,
  p99ResponseTime: 300
};

const anomalies = mlEngine.detectAnomalies(metrics);

for (const anomaly of anomalies) {
  console.log(`Type: ${anomaly.type}`);
  console.log(`Severity: ${anomaly.severity}`);
  console.log(`Z-Score: ${anomaly.deviationScore}`);
}
```

**Algoritmo**:
1. Calcula Z-Score para cada métrica
2. Classifica por severidade (|Z| = critério)
3. Retorna anomalias ordenadas por severidade

**Critérios de Severidade**:
- LOW: 2 < |Z| ≤ 2.5
- MEDIUM: 2.5 < |Z| ≤ 3
- HIGH: 3 < |Z| ≤ 3.5
- CRITICAL: |Z| > 3.5

##### generateRecommendations(metrics: Metrics): Recommendation[]

Gera recomendações baseadas em análise de métricas.

```typescript
const recommendations = mlEngine.generateRecommendations(metrics);

for (const rec of recommendations) {
  console.log(`Action: ${rec.type}`);
  console.log(`Priority: ${rec.priority}`);
  console.log(`Expected Improvement: ${rec.expectedImprovement}%`);
  console.log(`Confidence: ${rec.confidence}%`);
}
```

**Regras**:
- Timeout > 20%: Extend timeout
- Acceptance < 70%: Increase driver incentive
- Matching time > 45s: Adjust search radius
- Error rate > 5%: Alert admin

### 2. Prediction Models

Modelos específicos para cada tipo de previsão.

#### DemandPredictor

```typescript
const predictor = new DemandPredictor();

// Treinar
predictor.train(trainingData);

// Prever
const demand = predictor.predict(30); // 30 minutos

console.log(demand.value); // 62 rides
console.log(demand.factors.timeOfDay); // "evening"
```

**Fatores Sazonais**:
- 07:00-09:00: 1.3x (morning rush)
- 12:00-14:00: 1.2x (lunch)
- 18:00-21:00: 1.5x (evening peak)
- 03:00-06:00: 0.4x (night low)
- Outros: 1.0x (normal)

#### TimeoutPredictor

```typescript
const predictor = new TimeoutPredictor();
predictor.train(trainingData);

const timeoutRate = predictor.predict();
console.log(timeoutRate.value); // 16.5%
```

Usa:
- Últimas 10 observações
- Calcula tendência (recente vs. antiga)
- Ajusta previsão pela tendência

#### MatchingTimePredictor

```typescript
const predictor = new MatchingTimePredictor();
predictor.train(trainingData);

const matchingTime = predictor.predict(currentDemand);
console.log(matchingTime.value); // 38000ms (38 segundos)
```

**Buckets de Demanda**:
- Baixa: < 30 rides
- Média: 30-60 rides
- Alta: 60-85 rides
- Muito alta: > 85 rides

Usa bucket relevante para previsão mais precisa.

### 3. RecommendationEngine

```typescript
const engine = new RecommendationEngine();

const recommendations = engine.generateRecommendations(metrics, trends);

// Get top 5
const top5 = engine.getTopRecommendations(5);

// Get critical only
const critical = engine.getCriticalRecommendations();

// Calculate impact
const impact = engine.calculateExpectedImpact();
console.log(`Expected improvement: ${impact.totalImprovement.toFixed(1)}%`);
console.log(`Average confidence: ${impact.avgConfidence.toFixed(1)}%`);
```

### 4. PerformanceAnalytics

```typescript
const analytics = new PerformanceAnalytics();

// Adicionar métricas ao longo do tempo
analytics.addMetrics(metrics1);
analytics.addMetrics(metrics2);
// ... mais métricas

// Set baseline
analytics.setBaseline(metricsBaseline);

// Calcular health score
const healthScore = analytics.calculateHealthScore(currentMetrics);
console.log(`Overall: ${healthScore.overall}/100`);
console.log(`Timeout: ${healthScore.timeout}/100`);
console.log(`Acceptance: ${healthScore.acceptance}/100`);

// Tendências
const trends = analytics.calculateTrends();
for (const trend of trends) {
  console.log(`${trend.metric}: ${trend.direction}`);
}

// Comparar com baseline
const comparison = analytics.compareWithBaseline(currentMetrics);
if (comparison.hasImproved) {
  console.log(`Improved by ${comparison.improvementPercentage.toFixed(1)}%`);
}

// Análise semanal
const weeklyAnalysis = analytics.getWeeklyAnalysis();
console.log(`Best day: ${weeklyAnalysis.bestDay}`);
console.log(`Worst day: ${weeklyAnalysis.worstDay}`);
```

---

## Integração

### Com o JobScheduler

```typescript
// src/jobs/PerformanceJobs.ts

export class PredictionJob implements Job {
  schedule = 300000; // 5 minutos
  retries = 2;

  async execute(context: IJobContext): Promise<void> {
    const mlEngine = new MLEngine();
    
    // Obter dados de treinamento
    const trainingData = await context.metricsCollector.getAllMetrics();
    trainingData.forEach(data => mlEngine.addTrainingData(data));
    
    // Gerar previsões
    const predictions = [
      mlEngine.predictDemand(30),
      mlEngine.predictTimeout(),
      mlEngine.predictMatchingTime()
    ];
    
    // Salvar resultados
    await context.database.savePredictions(predictions);
  }
}
```

### Com o MetricsCollector

```typescript
// Fluxo integrado
const metricsCollector = new MetricsCollector();
const mlEngine = new MLEngine();

// Cada vez que métricas são coletadas
const metrics = metricsCollector.getMetrics();

// Adicionar como training data
mlEngine.addTrainingData({
  timestamp: new Date(),
  metrics,
  outcome: { succeeded: true, reason: 'matched' }
});

// Detectar anomalias
const anomalies = mlEngine.detectAnomalies(metrics);
if (anomalies.length > 0) {
  // Alertar
  alertManager.triggerAlert('ANOMALY_DETECTED', anomalies);
}

// Gerar recommendations
const recommendations = mlEngine.generateRecommendations(metrics);
if (recommendations.length > 0) {
  // Executar ações
  for (const rec of recommendations) {
    await applyRecommendation(rec);
  }
}
```

### Com o DashboardService

```typescript
// Para visualização em tempo real
const dashboardService = new DashboardService();
const mlEngine = new MLEngine();

const summary = mlEngine.getSummary();

// Atualizar dashboard
dashboardService.updatePanel('ml_metrics', {
  predictions: summary.predictions,
  anomalies: summary.anomalies,
  recommendations: summary.recommendations,
  accuracy: summary.analysis.accuracy
});
```

---

## Exemplos Práticos

### Exemplo 1: Setup Básico

```typescript
import { MLEngine } from './services/MLEngine';
import { TrainingData } from './models/ML';

// Inicializar engine
const mlEngine = new MLEngine();

// Adicionar dados de treinamento
const trainingData: TrainingData[] = [
  {
    timestamp: new Date('2026-01-20T10:00:00'),
    metrics: {
      timeoutRate: 15,
      acceptanceRate: 80,
      matchingTime: 35000,
      errorRate: 2,
      demandLevel: 60,
      p95ResponseTime: 200,
      p99ResponseTime: 300
    },
    outcome: { succeeded: true, reason: 'matched' }
  },
  // ... mais dados
];

trainingData.forEach(data => mlEngine.addTrainingData(data));
console.log('Engine trained with', trainingData.length, 'records');
```

### Exemplo 2: Previsões

```typescript
// Prever demanda para próximos 30 minutos
const demandPred = mlEngine.predictDemand(30);
console.log('Predicted demand:', demandPred.value, 'rides');
console.log('Confidence:', demandPred.confidence, '%');
console.log('95% CI:', demandPred.lowerBound, '-', demandPred.upperBound);

// Prever timeout
const timeoutPred = mlEngine.predictTimeout();
console.log('Timeout probability:', timeoutPred.value, '%');

// Prever tempo de matching
const matchingPred = mlEngine.predictMatchingTime();
console.log('Matching time:', matchingPred.value / 1000, 'seconds');
```

### Exemplo 3: Detecção de Anomalias

```typescript
const currentMetrics = {
  timeoutRate: 40, // 2.7x acima do normal (15%)
  acceptanceRate: 65, // Abaixo de 75%
  matchingTime: 60000, // Acima de 45s
  errorRate: 3,
  demandLevel: 50,
  p95ResponseTime: 250,
  p99ResponseTime: 350
};

const anomalies = mlEngine.detectAnomalies(currentMetrics);

console.log('Detected', anomalies.length, 'anomalies');
for (const anomaly of anomalies) {
  console.log(`- ${anomaly.type} (${anomaly.severity})`);
  console.log(`  Z-Score: ${anomaly.deviationScore.toFixed(2)}`);
  console.log(`  Recommendation: ${anomaly.recommendation}`);
}
```

### Exemplo 4: Recomendações

```typescript
const metrics = {/* ... */};
const trends = {
  timeoutTrend: 0.15,
  acceptanceTrend: -0.1,
  matchingTrendTrend: 0.05
};

const engine = new RecommendationEngine();
const recommendations = engine.generateRecommendations(metrics, trends);

console.log('Generated', recommendations.length, 'recommendations');

// Top 3 critical
const critical = recommendations
  .filter(r => r.priority === 'critical')
  .slice(0, 3);

for (const rec of critical) {
  console.log(`[${rec.priority.toUpperCase()}]`, rec.type);
  console.log(`  Current: ${rec.currentValue}`);
  console.log(`  Recommended: ${rec.recommendedValue}`);
  console.log(`  Expected improvement: ${rec.expectedImprovement}%`);
}
```

### Exemplo 5: Análise de Performance

```typescript
const analytics = new PerformanceAnalytics();

// Adicionar histórico de métricas
for (let i = 0; i < 168; i++) { // 1 semana de dados
  const metrics = {/* métricas variam */};
  analytics.addMetrics(metrics);
}

// Set baseline (primeira semana)
analytics.setBaseline(firstWeekMetrics);

// Análise semanal
const weeklyAnalysis = analytics.getWeeklyAnalysis();
console.log('Average metrics for week:');
console.log('  Timeout:', weeklyAnalysis.avgMetrics?.timeoutRate);
console.log('  Acceptance:', weeklyAnalysis.avgMetrics?.acceptanceRate);
console.log('Health score:', weeklyAnalysis.avgHealthScore?.overall);

// Tendências
const trends = analytics.calculateTrends();
console.log('Trends:');
trends.forEach(trend => {
  console.log(`  ${trend.metric}: ${trend.direction} (${trend.magnitude.toFixed(1)}%)`);
});

// Comparação com baseline
const comparison = analytics.compareWithBaseline(currentMetrics);
if (comparison.hasImproved) {
  console.log(`Overall improvement: ${comparison.improvementPercentage.toFixed(1)}%`);
} else {
  console.log(`Decline detected: ${Math.abs(comparison.improvementPercentage).toFixed(1)}%`);
}

// Exportar
const report = analytics.exportReport(currentMetrics);
console.log(report);
```

---

## Troubleshooting

### Problema: Previsões com confiança baixa

**Causa**: Dados de treinamento insuficientes

**Solução**:
```typescript
// Verificar tamanho de dados
const dataSize = mlEngine['trainingData'].length;
if (dataSize < 30) {
  console.warn('Warning: Less than 30 training samples. Confidence will be low.');
}

// Adicionar mais dados
for (const data of historicalData) {
  mlEngine.addTrainingData(data);
}
```

### Problema: Muitas anomalias falsos positivos

**Causa**: Threshold de Z-Score muito baixo ou dados não-normais

**Solução**:
```typescript
// Aumentar threshold de Z-Score (de 2 para 3)
// Modifique em MLEngine
const threshold = 3; // |Z| > 3 apenas

// Ou remover outliers antes de treinar
const cleaned = trainingData.filter(data => {
  // Filtrar valores extremos
  return data.metrics.timeoutRate < 50 && data.metrics.errorRate < 10;
});

mlEngine.train(cleaned);
```

### Problema: Previsões não mudam (estáticas)

**Causa**: Dados de treinamento muito similar ou nenhum dado adicionado

**Solução**:
```typescript
// Verificar se novos dados estão sendo adicionados
console.log('Training data points:', mlEngine['trainingData'].length);

// Forçar atualização
mlEngine.clearTrainingData();
for (const data of recentData) {
  mlEngine.addTrainingData(data);
}

// Fazer nova previsão
const freshPrediction = mlEngine.predictDemand(30);
```

### Problema: Z-Score NaN ou Infinity

**Causa**: Todos os valores são iguais (stdDev = 0) ou array vazio

**Solução**:
```typescript
// Em calculateStdDev
if (values.length === 0 || stdDev === 0) {
  return 0; // Valor normal se não há variação
}

// Sempre verificar antes de usar Z-Score
if (stdDev > 0) {
  const zscore = (value - mean) / stdDev;
  // Usar zscore
} else {
  console.log('No variation in data - cannot detect anomalies');
}
```

---

## Performance e Limites

### Limites de Dados

| Métrica | Limite | Razão |
|---------|--------|-------|
| Training Data | 10,000 registros | ~30 dias a 1 sample/2.5 min |
| Predictions Cache | 1,000 registros | ~3 dias a 1 pred/5 min |
| Anomalies Cache | 1,000 registros | Histórico completo |
| Window Size (MA) | 5-10 | Balanço entre suavização e responsividade |

### Complexidade de Tempo

| Operação | Complexidade | Tempo Estimado (1000 records) |
|----------|-------------|------------------------------|
| addTrainingData() | O(1) | < 1ms |
| predictDemand() | O(n) | ~2ms |
| detectAnomalies() | O(n) | ~3ms |
| generateRecommendations() | O(n) | ~1ms |
| calculateTrends() | O(n) | ~4ms |
| **Total (getSummary)** | **O(n)** | **~15ms** |

### Memory Usage

```
Training Data (10,000 records): ~5 MB
Predictions Cache (1,000 records): ~1.2 MB
Anomalies Cache (1,000 records): ~1 MB
Engine State: ~2 MB
---
Total: ~9.2 MB
```

### Recomendações de Tuning

**Para maior precisão**:
- Aumentar window size do MA (5 → 10)
- Manter mais dados de treinamento
- Usar z-score threshold 2 (mais sensível)

**Para maior performance**:
- Reduzir window size (5 → 3)
- Limpar dados mais frequentemente
- Usar z-score threshold 2.5 ou 3

**Para melhor equilíbrio**:
- Window size: 5
- Training data: 5,000-7,000 registros
- Z-score threshold: 2
- Refresh: a cada 5 minutos

---

## Conclusão

O motor de ML do Vou de Moto fornece:
- ✅ Previsões precisas com intervalos de confiança
- ✅ Detecção automática de anomalias
- ✅ Recomendações acionáveis
- ✅ Analytics detalhadas
- ✅ Performance otimizada
- ✅ Escalabilidade garantida

Para mais detalhes, ver ETAPA5_GUIDE.md.
