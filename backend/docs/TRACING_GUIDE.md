# ETAPA 6 - Guia Completo de Distributed Tracing

**Advanced Observability - Distributed Tracing & Deep Monitoring**

---

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Arquitetura](#arquitetura)
3. [Componentes](#componentes)
4. [Guia de Uso](#guia-de-uso)
5. [Integração](#integração)
6. [Melhores Práticas](#melhores-práticas)
7. [Troubleshooting](#troubleshooting)
8. [Performance](#performance)

---

## 🎯 Visão Geral

A ETAPA 6 implementa uma stack completa de observabilidade enterprise-grade com:

- **Distributed Tracing**: Rastreamento de requisições através de múltiplos serviços
- **Correlation IDs**: Identificação única de requisições end-to-end
- **Performance Profiling**: Análise detalhada de CPU, memória e I/O
- **Health Monitoring**: Monitoramento contínuo da saúde do sistema
- **Log Aggregation**: Centralização e análise inteligente de logs
- **Anomaly Detection**: Detecção automática de padrões anormais

### Compatibilidade

- ✅ OpenTelemetry compatible
- ✅ Jaeger export format
- ✅ Elasticsearch integration
- ✅ Splunk integration
- ✅ Industry-standard headers (W3C Trace Context)

---

## 🏗️ Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│                   Application Layer                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │ API      │  │ Services │  │ Database │  │ Cache    │  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘  │
│       │             │              │              │         │
└───────┼─────────────┼──────────────┼──────────────┼─────────┘
        │             │              │              │
┌───────┼─────────────┼──────────────┼──────────────┼─────────┐
│       ▼             ▼              ▼              ▼         │
│  ┌────────────────────────────────────────────────────┐    │
│  │         Observability Middleware                   │    │
│  │  • Correlation ID Injection                        │    │
│  │  • Automatic Tracing                               │    │
│  │  • Request/Response Logging                        │    │
│  │  • Error Capturing                                 │    │
│  │  • Performance Profiling                           │    │
│  └───────────┬────────────────────────────────────────┘    │
│              │                                              │
│  ┌───────────▼────────────────────────────────────────┐    │
│  │         TracingService                             │    │
│  │  • Span Management                                 │    │
│  │  • Context Propagation                             │    │
│  │  • Sampling Strategies                             │    │
│  │  • Jaeger Export                                   │    │
│  └────────────────────────────────────────────────────┘    │
│                                                             │
│  ┌────────────────────────────────────────────────────┐    │
│  │         RequestLogger                              │    │
│  │  • Request/Response Capture                        │    │
│  │  • Sensitive Data Masking                          │    │
│  │  • Audit Trail                                     │    │
│  │  • Error Logging                                   │    │
│  └────────────────────────────────────────────────────┘    │
│                                                             │
│  ┌────────────────────────────────────────────────────┐    │
│  │         PerformanceProfiler                        │    │
│  │  • CPU/Memory Profiling                            │    │
│  │  • Database Query Tracking                         │    │
│  │  • External Call Tracking                          │    │
│  │  • Bottleneck Detection                            │    │
│  └────────────────────────────────────────────────────┘    │
│                                                             │
│  ┌────────────────────────────────────────────────────┐    │
│  │         HealthCheckManager                         │    │
│  │  • System Health Monitoring                        │    │
│  │  • Component Checks                                │    │
│  │  • Custom Check Registration                       │    │
│  │  • Health Aggregation                              │    │
│  └────────────────────────────────────────────────────┘    │
│                                                             │
│  ┌────────────────────────────────────────────────────┐    │
│  │         LogAggregator                              │    │
│  │  • Centralized Log Storage                         │    │
│  │  • Pattern Detection                               │    │
│  │  • Anomaly Detection                               │    │
│  │  • Export to ELK/Splunk                            │    │
│  └────────────────────────────────────────────────────┘    │
│                                                             │
│  ┌────────────────────────────────────────────────────┐    │
│  │         ObservabilityJobs                          │    │
│  │  • TraceExportJob (1min)                           │    │
│  │  • HealthCheckJob (30s)                            │    │
│  │  • LogAggregationJob (5min)                        │    │
│  │  • ProfileAnalysisJob (10min)                      │    │
│  │  • ObservabilitySummaryJob (30min)                 │    │
│  └────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              External Observability Stack                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │ Jaeger   │  │ Elastic  │  │ Splunk   │  │ Grafana  │  │
│  │ (Traces) │  │ (Logs)   │  │ (Logs)   │  │ (Metrics)│  │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## 🧩 Componentes

### 1. TracingService

Serviço central de distributed tracing compatível com OpenTelemetry.

**Funcionalidades**:
- Criação e gerenciamento de spans
- Correlation IDs únicos
- Context propagation via HTTP headers
- 4 estratégias de sampling
- Export para Jaeger

**Exemplo**:
```typescript
const tracingService = new TracingService({
  samplingStrategy: SamplingStrategy.PROBABILISTIC,
  samplingRate: 0.1, // 10% sampling
});

// Start span
const span = tracingService.startSpan('user-registration');

// Add attributes
tracingService.addSpanAttributes(span, {
  userId: 'user123',
  email: 'user@example.com',
});

// Add events
tracingService.addSpanEvent(span, 'validation-completed');

// End span
tracingService.endSpan(span);

// Export to Jaeger
const jaegerTraces = tracingService.exportToJaeger();
```

### 2. RequestLogger

Logger especializado para requisições HTTP com masking automático de dados sensíveis.

**Funcionalidades**:
- Log de requests/responses
- Masking automático (passwords, tokens, credit cards)
- Audit trail completo
- Search por múltiplos critérios
- Statistics dashboard

**Exemplo**:
```typescript
const requestLogger = new RequestLogger();

// Log request
requestLogger.logRequest('POST', '/api/auth', correlationId, traceId, {
  body: {
    email: 'user@example.com',
    password: 'secret123', // Will be masked
  },
});

// Log response
requestLogger.logResponse(correlationId, traceId, 200, 150);

// Get request-response pair
const pair = requestLogger.getRequestResponsePair(correlationId);
```

### 3. PerformanceProfiler

Profiler avançado para análise de performance e detecção de bottlenecks.

**Funcionalidades**:
- CPU usage tracking
- Memory profiling
- Database query analysis
- External API call tracking
- Bottleneck detection com severity
- Flame graph generation

**Exemplo**:
```typescript
const profiler = new PerformanceProfiler();

// Start profiling
const session = profiler.startProfile('checkout-process', correlationId);

// Track database query
profiler.trackDatabaseQuery(
  correlationId,
  'SELECT * FROM orders',
  45
);

// Track external call
profiler.trackExternalCall(
  correlationId,
  'payment-service',
  'POST',
  '/api/charge',
  200
);

// End profiling
const report = profiler.endProfile(session);

// Check bottlenecks
if (report.bottlenecks.length > 0) {
  console.log('Bottlenecks detected:', report.bottlenecks);
}
```

### 4. HealthCheckManager

Gerenciador de health checks com suporte a checks customizados.

**Funcionalidades**:
- Built-in checks (memory, CPU, uptime)
- Custom check registration
- Database health check
- External service health check
- Overall health aggregation
- 3 health states (healthy, degraded, unhealthy)

**Exemplo**:
```typescript
const healthManager = new HealthCheckManager();

// Register custom check
healthManager.registerHealthCheck('redis', async () => {
  const isHealthy = await redis.ping();
  return {
    status: isHealthy ? 'healthy' : 'unhealthy',
    component: 'redis',
    responseTime: 5,
    lastCheck: new Date(),
    message: isHealthy ? 'OK' : 'Connection failed',
  };
});

// Check all health
const overall = await healthManager.getOverallHealth();
console.log('System health:', overall.status);
```

### 5. LogAggregator

Agregador centralizado de logs com análise inteligente.

**Funcionalidades**:
- Triple indexing (correlation ID, trace ID, service)
- Full-text search
- Pattern detection
- Anomaly detection
- Export para Elasticsearch/Splunk
- Top errors aggregation

**Exemplo**:
```typescript
const aggregator = new LogAggregator();

// Aggregate log
aggregator.aggregate({
  timestamp: new Date(),
  level: 'INFO',
  message: 'User login successful',
  correlationId: 'corr_123',
  traceId: 'trace_456',
  service: 'auth',
  operation: 'login',
});

// Search logs
const results = aggregator.search('login', {
  level: 'ERROR',
  service: 'auth',
});

// Detect anomalies
const anomalies = aggregator.detectAnomalies();

// Export to Elasticsearch
const elasticLogs = aggregator.exportToElastic();
```

---

## 📘 Guia de Uso

### Setup Básico

```typescript
import { setupObservabilityMiddleware } from './middleware/ObservabilityMiddleware';
import { TracingService } from './services/TracingService';
import { RequestLogger } from './services/RequestLogger';
import { PerformanceProfiler } from './services/PerformanceProfiler';
import { HealthCheckManager } from './services/HealthCheckManager';
import { LogAggregator } from './services/LogAggregator';

// Initialize services
const tracingService = new TracingService({
  samplingStrategy: SamplingStrategy.PROBABILISTIC,
  samplingRate: 0.1,
});

const requestLogger = new RequestLogger();
const performanceProfiler = new PerformanceProfiler();
const healthCheckManager = new HealthCheckManager();
const logAggregator = new LogAggregator();

// Setup middleware (one-line setup!)
setupObservabilityMiddleware(app, {
  tracingService,
  requestLogger,
  performanceProfiler,
  healthCheckManager,
  logAggregator,
});

// Done! All endpoints now have automatic observability
```

### Endpoints Disponíveis

Após setup, os seguintes endpoints ficam disponíveis:

- `GET /health` - System health status
- `GET /tracing?traceId={id}` - Get trace details
- `GET /performance` - Performance statistics
- `GET /logs?q={query}&level={level}` - Search logs

### Context Propagation

Para propagar contexto entre serviços:

```typescript
// Service A: Inject context into headers
const headers: Record<string, string> = {};
tracingService.injectContext(headers);

// Make HTTP call with headers
await axios.get('http://service-b/api/endpoint', { headers });

// Service B: Extract context from headers
tracingService.propagateContext(req.headers);
const span = tracingService.startSpan('service-b-operation');
// Span will have same traceId as Service A
```

### Sampling Strategies

#### 1. ALWAYS - Sample all traces
```typescript
new TracingService({
  samplingStrategy: SamplingStrategy.ALWAYS,
});
```

**Use Case**: Development, debugging

#### 2. NEVER - Don't sample
```typescript
new TracingService({
  samplingStrategy: SamplingStrategy.NEVER,
});
```

**Use Case**: Disable tracing temporarily

#### 3. PROBABILISTIC - Sample by rate
```typescript
new TracingService({
  samplingStrategy: SamplingStrategy.PROBABILISTIC,
  samplingRate: 0.1, // 10% of traces
});
```

**Use Case**: Production (reduce overhead)

#### 4. RATE_LIMITING - Max traces per second
```typescript
new TracingService({
  samplingStrategy: SamplingStrategy.RATE_LIMITING,
  maxTracesPerSecond: 100,
});
```

**Use Case**: High-traffic systems

---

## 🔗 Integração

### Com Jaeger

```typescript
// Export traces to Jaeger
const jaegerTraces = tracingService.exportToJaeger();

// Send to Jaeger collector
await axios.post('http://jaeger:14268/api/traces', {
  data: jaegerTraces,
});
```

### Com Elasticsearch

```typescript
// Export logs to Elasticsearch
const elasticLogs = logAggregator.exportToElastic();

// Bulk insert into Elasticsearch
await elasticsearch.bulk({
  index: 'app-logs',
  body: elasticLogs.flatMap(log => [
    { index: {} },
    log,
  ]),
});
```

### Com Splunk

```typescript
// Export to Splunk HEC format
const splunkLogs = logAggregator.exportToSplunk();

// Send to Splunk HEC
await axios.post('http://splunk:8088/services/collector', {
  event: splunkLogs,
}, {
  headers: {
    'Authorization': `Splunk ${HEC_TOKEN}`,
  },
});
```

### Com Grafana

```typescript
// Expose metrics endpoint for Prometheus
app.get('/metrics', (req, res) => {
  const stats = logAggregator.getStatistics();
  const health = healthCheckManager.getHealthSummary();
  const perfStats = performanceProfiler.getOperationStats();

  res.send(`
    # HELP app_requests_total Total requests
    # TYPE app_requests_total counter
    app_requests_total ${stats.totalLogs}

    # HELP app_error_rate Error rate percentage
    # TYPE app_error_rate gauge
    app_error_rate ${stats.errorRate}

    # HELP app_health_status System health (1=healthy, 0=unhealthy)
    # TYPE app_health_status gauge
    app_health_status ${health.healthy === health.total ? 1 : 0}
  `);
});
```

---

## ✅ Melhores Práticas

### 1. Correlation IDs

**✅ DO**: Sempre use correlation IDs para rastrear requisições

```typescript
const correlationId = tracingService.createCorrelationId();

// Use em todos os logs relacionados
logger.info('Processing order', { correlationId });
```

**❌ DON'T**: Não crie IDs manualmente

### 2. Span Hierarchy

**✅ DO**: Crie hierarquia clara de spans

```typescript
const parentSpan = tracingService.startSpan('parent-operation');

const childSpan1 = tracingService.startSpan('child-1', parentSpan);
tracingService.endSpan(childSpan1);

const childSpan2 = tracingService.startSpan('child-2', parentSpan);
tracingService.endSpan(childSpan2);

tracingService.endSpan(parentSpan);
```

**❌ DON'T**: Não crie spans soltos sem contexto

### 3. Sensitive Data

**✅ DO**: Confie no masking automático do RequestLogger

```typescript
requestLogger.logRequest('POST', '/api/auth', correlationId, traceId, {
  body: {
    password: 'secret', // Automatically masked
    token: 'abc123', // Automatically masked
  },
});
```

**❌ DON'T**: Não desabilite masking em produção

### 4. Sampling

**✅ DO**: Use sampling em produção

```typescript
// Production
new TracingService({
  samplingStrategy: SamplingStrategy.PROBABILISTIC,
  samplingRate: 0.1, // 10%
});
```

**❌ DON'T**: Não use ALWAYS em produção (overhead alto)

### 5. Health Checks

**✅ DO**: Registre checks para componentes críticos

```typescript
healthManager.registerHealthCheck('database', async () => {
  try {
    await database.ping();
    return { status: 'healthy', ... };
  } catch (error) {
    return { status: 'unhealthy', ... };
  }
});
```

**❌ DON'T**: Não ignore health checks

### 6. Performance Profiling

**✅ DO**: Profile operações críticas

```typescript
const session = profiler.startProfile('critical-operation', correlationId);

// ... operation code ...

const report = profiler.endProfile(session);

if (report.bottlenecks.length > 0) {
  logger.warn('Bottlenecks detected', { bottlenecks: report.bottlenecks });
}
```

**❌ DON'T**: Não profile tudo (overhead)

### 7. Log Aggregation

**✅ DO**: Agregue logs com contexto completo

```typescript
aggregator.aggregate({
  timestamp: new Date(),
  level: 'ERROR',
  message: 'Payment failed',
  correlationId,
  traceId,
  service: 'payment',
  operation: 'process-payment',
  metadata: {
    userId: 'user123',
    amount: 99.99,
    errorCode: 'INSUFFICIENT_FUNDS',
  },
});
```

**❌ DON'T**: Não omita metadata importante

---

## 🔧 Troubleshooting

### Problema: Traces não aparecem no Jaeger

**Possíveis Causas**:
1. Sampling desabilitado (NEVER)
2. Sampling rate muito baixo
3. Jaeger collector unreachable

**Solução**:
```typescript
// Temporariamente use ALWAYS para debug
new TracingService({
  samplingStrategy: SamplingStrategy.ALWAYS,
});

// Verifique connectivity com Jaeger
const traces = tracingService.exportToJaeger();
console.log('Traces to export:', traces.length);
```

### Problema: Memory usage alto

**Possíveis Causas**:
1. Muitos spans ativos
2. Log aggregator muito grande
3. Profiler acumulando muitos reports

**Solução**:
```typescript
// Aumentar sampling rate (diminuir traces)
samplingRate: 0.01 // 1% instead of 10%

// Verificar tamanhos
console.log('Active spans:', tracingService.getStats());
console.log('Log count:', logAggregator.getStatistics().totalLogs);
```

### Problema: Correlation IDs não propagando

**Possíveis Causas**:
1. Headers não sendo injetados
2. Middleware não configurado corretamente

**Solução**:
```typescript
// Verificar headers
console.log('Headers sent:', headers);

// Verificar middleware order
app.use(correlationIdMiddleware(tracingService)); // Must be first!
```

### Problema: Bottlenecks não detectados

**Possíveis Causas**:
1. Profiler não sendo usado
2. Queries/calls não sendo tracked

**Solução**:
```typescript
// Sempre track queries
profiler.trackDatabaseQuery(correlationId, query, duration);

// Sempre track external calls
profiler.trackExternalCall(correlationId, service, method, url, duration);
```

---

## ⚡ Performance

### Overhead Esperado

| Componente | Overhead | Sampling | Produção |
|-----------|----------|----------|----------|
| TracingService | <2ms/request | Sim | 0.2ms @ 10% |
| RequestLogger | <1ms/request | Não | 1ms |
| PerformanceProfiler | <5ms/request | Opcional | 0ms (disabled) |
| HealthCheckManager | <50ms/check | N/A | 50ms @ 30s |
| LogAggregator | <1ms/log | Não | 1ms |

### Otimizações

#### 1. Sampling Inteligente

```typescript
// Sample mais errors, menos successes
const shouldSample = (statusCode: number) => {
  if (statusCode >= 500) return true; // Always sample errors
  if (statusCode >= 400) return Math.random() < 0.5; // 50% client errors
  return Math.random() < 0.1; // 10% successes
};
```

#### 2. Async Export

```typescript
// Export em background
setInterval(async () => {
  const traces = tracingService.exportTraces();
  await sendToJaeger(traces); // Non-blocking
}, 60000); // Every minute
```

#### 3. Buffering

```typescript
// Buffer logs antes de enviar
const logBuffer: LogEntry[] = [];

aggregator.aggregate = (log) => {
  logBuffer.push(log);
  
  if (logBuffer.length >= 100) {
    const batch = logBuffer.splice(0, 100);
    sendToElasticsearch(batch); // Batch insert
  }
};
```

### Limites Configuráveis

```typescript
// TracingService
maxActiveSpans: 10000 // Default
maxCompletedSpans: 10000 // Auto-cleanup to 5000

// RequestLogger
maxRequestsLog: 10000 // Per type
maxResponsesLog: 10000
maxErrorsLog: 10000
maxAuditLog: 10000

// PerformanceProfiler
maxReports: 1000
maxDatabaseQueries: 10000
maxExternalCalls: 10000
maxSlowOperations: 1000

// LogAggregator
maxLogs: 100000 // Auto-prune to 50000
```

---

## 📊 Métricas Recomendadas

### KPIs de Observabilidade

1. **Trace Coverage**: % de requests traced
2. **Error Trace Rate**: % de errors capturados
3. **Health Check Uptime**: % tempo healthy
4. **Log Aggregation Rate**: logs/segundo
5. **Bottleneck Detection Rate**: % operações com bottlenecks

### Dashboards Recomendados

#### Grafana Dashboard 1: System Overview
- Total requests
- Error rate
- Average response time
- System health status

#### Grafana Dashboard 2: Traces
- Active traces
- Trace duration P50/P95/P99
- Traces by service
- Failed traces

#### Grafana Dashboard 3: Performance
- CPU usage
- Memory usage
- Database query time
- External API call time

#### Grafana Dashboard 4: Health
- Component health status
- Health check response time
- Unhealthy components timeline

---

## 🎓 Recursos Adicionais

### OpenTelemetry Documentation
- https://opentelemetry.io/docs/

### Jaeger Documentation
- https://www.jaegertracing.io/docs/

### W3C Trace Context
- https://www.w3.org/TR/trace-context/

### Elasticsearch Logging
- https://www.elastic.co/guide/en/elasticsearch/reference/current/logging.html

### Distributed Tracing Patterns
- https://microservices.io/patterns/observability/distributed-tracing.html

---

## 📝 Changelog

### v1.0.0 - 2026-01-26
- ✅ Initial release
- ✅ TracingService with OpenTelemetry compatibility
- ✅ RequestLogger with sensitive data masking
- ✅ PerformanceProfiler with bottleneck detection
- ✅ HealthCheckManager with custom checks
- ✅ LogAggregator with anomaly detection
- ✅ ObservabilityJobs automation
- ✅ Express middleware integration
- ✅ 110+ test cases
- ✅ 10 complete examples
- ✅ Production-ready

---

**🚀 Happy Tracing!**
