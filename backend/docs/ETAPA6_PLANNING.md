# ETAPA 6 - Advanced Observability

**Distributed Tracing, Correlation IDs e Observabilidade Profunda**

## Objetivos

ETAPA 6 adiciona **observabilidade avançada de nível enterprise** ao Vou de Moto:

✅ **Distributed Tracing** - Rastreamento completo de requests
✅ **Correlation IDs** - Rastreamento cross-service
✅ **Request/Response Logging** - Auditoria completa
✅ **Performance Profiling** - Análise de gargalos
✅ **Health Checks** - Status de saúde de componentes
✅ **Log Aggregation** - Centralização de logs
✅ **Advanced Metrics** - Métricas customizadas

## Arquitetura

```
┌─────────────────────────────────────────────────┐
│           Application Layer                     │
│    (Controllers, Services, Jobs)                │
└────────────────┬────────────────────────────────┘
                 │
        ┌────────▼────────┐
        │   TracingService │ ◄──── OpenTelemetry
        │  (Correlation)   │
        └────────┬─────────┘
                 │
    ┌────────────┼────────────┐
    │            │            │
┌───▼────┐  ┌────▼─────┐  ┌──▼──────────┐
│Request │  │Performance│  │HealthCheck │
│Logger  │  │ Profiler  │  │  Manager   │
└───┬────┘  └────┬─────┘  └──┬─────────┘
    │            │           │
    └────────────┼───────────┘
                 │
        ┌────────▼────────┐
        │  Log Aggregator │
        │   (Centralized) │
        └─────────────────┘
                 │
        ┌────────▼────────┐
        │    Storage      │
        │ (File/Database) │
        └─────────────────┘
```

## Componentes a Implementar

### 1. TracingService.ts (600+ linhas)
**Responsabilidade**: Distributed tracing com OpenTelemetry

**Funcionalidades**:
- Gerar spans para cada operação
- Correlation IDs automáticos
- Context propagation
- Trace visualization support
- Sampling strategies

**Métodos**:
```typescript
- startSpan(name, parentSpan?): Span
- endSpan(span): void
- addSpanEvent(span, event, attributes): void
- addSpanError(span, error): void
- getActiveSpan(): Span | null
- createCorrelationId(): string
- propagateContext(headers): Context
- getTraceId(): string
- exportTraces(): TraceExport[]
```

### 2. RequestLogger.ts (400+ linhas)
**Responsabilidade**: Logging completo de requests/responses

**Funcionalidades**:
- Log de entrada/saída
- Mascaramento de dados sensíveis
- Request duration tracking
- Error capturing
- Audit trail

**Métodos**:
```typescript
- logRequest(req, correlationId): void
- logResponse(res, correlationId, duration): void
- logError(error, correlationId): void
- maskSensitiveData(data): any
- getAuditTrail(correlationId): AuditEntry[]
```

### 3. PerformanceProfiler.ts (500+ linhas)
**Responsabilidade**: Análise de performance

**Funcionalidades**:
- CPU profiling
- Memory profiling
- Database query analysis
- Slow operation detection
- Performance bottlenecks

**Métodos**:
```typescript
- startProfile(operation): ProfileSession
- endProfile(session): ProfileReport
- trackDatabaseQuery(query, duration): void
- detectSlowOperations(): SlowOperation[]
- getBottlenecks(): Bottleneck[]
- generateFlameGraph(): FlameGraph
```

### 4. HealthCheckManager.ts (300+ linhas)
**Responsabilidade**: Health checks de componentes

**Funcionalidades**:
- Database health
- External services health
- Memory/CPU health
- Disk space health
- Overall system health

**Métodos**:
```typescript
- checkDatabase(): HealthStatus
- checkExternalServices(): HealthStatus
- checkMemory(): HealthStatus
- checkCPU(): HealthStatus
- getOverallHealth(): OverallHealth
- registerHealthCheck(name, check): void
```

### 5. LogAggregator.ts (400+ linhas)
**Responsabilidade**: Agregação e análise de logs

**Funcionalidades**:
- Centralizar logs
- Indexação para busca
- Análise de padrões
- Alertas baseados em logs
- Export para ferramentas externas

**Métodos**:
```typescript
- aggregate(logs): void
- search(query, filters): LogEntry[]
- analyzePatterns(): LogPattern[]
- detectAnomalies(): LogAnomaly[]
- exportToElastic(logs): void
- exportToSplunk(logs): void
```

### 6. Observability Models (200+ linhas)
**Arquivo**: src/models/Observability2.ts

**Interfaces e Enums**:
```typescript
// Span
interface Span {
  id: string;
  traceId: string;
  parentId?: string;
  name: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  status: SpanStatus;
  attributes: Record<string, any>;
  events: SpanEvent[];
  errors: SpanError[];
}

// Health Status
interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  component: string;
  responseTime: number;
  lastCheck: Date;
  details?: any;
}

// Performance Profile
interface ProfileReport {
  operation: string;
  duration: number;
  cpuUsage: number;
  memoryUsage: number;
  databaseQueries: number;
  externalCalls: number;
  bottlenecks: Bottleneck[];
}
```

### 7. Observability Jobs (200+ linhas)
**Arquivo**: src/jobs/ObservabilityJobs.ts

**Jobs**:
- TraceExportJob (1 min) - Exportar traces
- HealthCheckJob (30s) - Verificar health
- LogAggregationJob (5 min) - Agregar logs
- ProfileAnalysisJob (10 min) - Analisar profiles

## Integração com OpenTelemetry

```typescript
import { trace, context } from '@opentelemetry/api';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';

// Setup
const provider = new NodeTracerProvider();
const exporter = new JaegerExporter({
  serviceName: 'vou-de-moto',
  endpoint: 'http://localhost:14268/api/traces'
});

provider.addSpanProcessor(new SimpleSpanProcessor(exporter));
provider.register();
```

## Correlation ID Strategy

```
Request → Generate Correlation ID (UUID)
    ↓
All logs tagged with correlation ID
    ↓
All spans tagged with correlation ID
    ↓
All database queries tagged
    ↓
All external calls tagged
    ↓
Response includes correlation ID in header
```

## Métricas Customizadas

```typescript
// Histogram: Request duration
requestDuration: Histogram
  - Buckets: [10, 50, 100, 200, 500, 1000, 2000, 5000]
  - Labels: [method, path, status]

// Counter: Errors by type
errorCounter: Counter
  - Labels: [errorType, severity, component]

// Gauge: Active connections
activeConnections: Gauge
  - Labels: [connectionType]

// Summary: Database query time
dbQueryTime: Summary
  - Quantiles: [0.5, 0.9, 0.95, 0.99]
```

## Log Format Padrão

```json
{
  "timestamp": "2026-01-26T10:30:45.123Z",
  "level": "INFO",
  "correlationId": "uuid-1234-5678",
  "traceId": "trace-uuid",
  "spanId": "span-uuid",
  "service": "matching-service",
  "operation": "findNearbyDrivers",
  "duration": 125,
  "message": "Found 5 drivers",
  "metadata": {
    "userId": "user123",
    "rideId": "ride456"
  }
}
```

## Health Check Endpoints

```
GET /health
  → Overall health status

GET /health/database
  → Database connection health

GET /health/memory
  → Memory usage

GET /health/cpu
  → CPU usage

GET /health/detailed
  → All health checks with details
```

## Ferramentas de Visualização

### Jaeger (Distributed Tracing)
```
docker run -d --name jaeger \
  -p 16686:16686 \
  -p 14268:14268 \
  jaegertracing/all-in-one:latest
```

### Grafana (Metrics)
```
docker run -d --name grafana \
  -p 3000:3000 \
  grafana/grafana:latest
```

### ELK Stack (Logs)
```
docker-compose up -d elasticsearch kibana logstash
```

## Performance Targets

| Métrica | Target |
|---------|--------|
| Trace overhead | < 2ms |
| Log aggregation latency | < 100ms |
| Health check response | < 50ms |
| Memory overhead | < 50MB |
| CPU overhead | < 5% |

## Testes

### Test Coverage
- Tracing: 30+ testes
- Request Logging: 15+ testes
- Performance Profiling: 20+ testes
- Health Checks: 15+ testes
- Log Aggregation: 20+ testes

**Total**: 100+ testes

## Exemplos

### 10 Exemplos Completos

1. **Basic Tracing** - Criar e exportar traces
2. **Correlation ID Flow** - Rastrear request completo
3. **Request/Response Logging** - Log de entrada/saída
4. **Performance Profiling** - Profile de operação lenta
5. **Health Check Setup** - Configurar health checks
6. **Log Aggregation** - Buscar e analisar logs
7. **Error Tracing** - Rastrear erros com context
8. **Database Profiling** - Profile de queries
9. **Multi-Service Tracing** - Trace cross-service
10. **Full Integration** - Todas as funcionalidades juntas

## Documentação

### Guias a Criar
- **TRACING_GUIDE.md** (2,000+ linhas) - Guia de distributed tracing
- **ETAPA6_GUIDE.md** (3,000+ linhas) - Guia técnico completo
- **ETAPA6_COMPLETE.md** (500+ linhas) - Resumo executivo

## Roadmap de Implementação

### Fase 1: Core (2 horas)
1. TracingService
2. Observability Models
3. RequestLogger

### Fase 2: Advanced (2 horas)
4. PerformanceProfiler
5. HealthCheckManager
6. LogAggregator

### Fase 3: Integration (1 hora)
7. ObservabilityJobs
8. Middleware integration
9. Dashboard integration

### Fase 4: Testing & Docs (2 horas)
10. Testes completos
11. Exemplos
12. Documentação

**Total Estimado**: 7 horas

## Dependencies

```json
{
  "@opentelemetry/api": "^1.7.0",
  "@opentelemetry/sdk-trace-node": "^1.18.0",
  "@opentelemetry/exporter-jaeger": "^1.18.0",
  "@opentelemetry/instrumentation-http": "^0.45.0",
  "uuid": "^9.0.0",
  "prom-client": "^15.0.0"
}
```

## Success Criteria

✅ 100% de requests rastreados com correlation ID
✅ Traces exportados para Jaeger
✅ Health checks respondendo < 50ms
✅ Logs centralizados e pesquisáveis
✅ Performance profiling < 2ms overhead
✅ 100+ testes passando
✅ Documentação completa
✅ Exemplos executáveis

---

**Status**: Planejamento completo ✅
**Próximo**: Implementação Fase 1
