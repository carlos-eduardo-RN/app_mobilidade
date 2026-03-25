# Arquitetura do Sistema - VouDeMoto Backend

## Visão Geral

O VouDeMoto é uma plataforma de compartilhamento de corridas de moto, construída com arquitetura moderna, escalável e de alta disponibilidade.

## Stack Tecnológica

### Backend
- **Runtime**: Node.js 20 (TypeScript)
- **Framework**: Express.js
- **ORM**: TypeORM
- **Validação**: Joi
- **Autenticação**: JWT + Refresh Tokens

### Bancos de Dados
- **Principal**: PostgreSQL 16 (relacional)
  - Extensões: PostGIS (geolocalização), pg_stat_statements
- **Cache**: Redis 7 (in-memory)
  - Configuração: Sentinel para HA
- **NoSQL**: MongoDB (documentos, opcional)
  - Uso: Analytics, logs não estruturados

### Infraestrutura
- **Orquestração**: Kubernetes (EKS na AWS)
- **CI/CD**: GitHub Actions + ArgoCD
- **IaC**: Helm Charts + Terraform
- **Cloud Provider**: AWS (multi-region)

### Observabilidade
- **Métricas**: Prometheus + Grafana
- **Logs**: Loki + Promtail
- **Tracing**: Jaeger (OpenTelemetry)
- **Error Tracking**: Sentry
- **APM**: Custom metrics + OpenTelemetry

### Segurança
- **SSL/TLS**: Cert-Manager + Let's Encrypt
- **WAF**: ModSecurity + OWASP Core Rules
- **Secrets**: AWS Secrets Manager + Kubernetes Secrets
- **Network**: Network Policies + Security Groups
- **Compliance**: LGPD, PCI-DSS (Stripe)

---

## Arquitetura de Alto Nível

```
┌─────────────────────────────────────────────────────────────────┐
│                         INTERNET                                 │
└────────────────────────┬────────────────────────────────────────┘
                         │
                    ┌────▼─────┐
                    │ Route53  │ (DNS + Health Checks)
                    └────┬─────┘
                         │
              ┌──────────▼──────────┐
              │   CloudFront CDN    │ (Static Assets)
              └──────────┬──────────┘
                         │
              ┌──────────▼──────────┐
              │  Application Load   │ (Multi-AZ)
              │     Balancer        │
              └──────────┬──────────┘
                         │
         ┌───────────────┼───────────────┐
         │               │               │
    ┌────▼────┐    ┌────▼────┐    ┌────▼────┐
    │  AZ-1   │    │  AZ-2   │    │  AZ-3   │
    │         │    │         │    │         │
    │ K8s     │    │ K8s     │    │ K8s     │
    │ Cluster │    │ Cluster │    │ Cluster │
    │         │    │         │    │         │
    │ Backend │    │ Backend │    │ Backend │
    │ Pods x2 │    │ Pods x2 │    │ Pods x2 │
    └────┬────┘    └────┬────┘    └────┬────┘
         │              │              │
         └──────────────┼──────────────┘
                        │
            ┌───────────┼───────────┐
            │           │           │
       ┌────▼────┐ ┌────▼────┐ ┌───▼─────┐
       │ RDS     │ │ Redis   │ │ MongoDB │
       │ Primary │ │ Sentinel│ │ Replica │
       │ +       │ │ Cluster │ │ Set     │
       │ Replicas│ │ (3 node)│ │ (3 node)│
       └─────────┘ └─────────┘ └─────────┘
```

---

## Componentes Detalhados

### 1. API Gateway Layer

#### NGINX Ingress Controller
```yaml
Propósito: Roteamento de tráfego, SSL termination, rate limiting
Configuração:
  - Rate Limiting: 100 req/s por IP
  - Connection Limiting: 10 conexões simultâneas
  - WAF: ModSecurity ativado
  - Timeouts: Connect 30s, Send 60s, Read 60s
  - SSL: TLS 1.3, certificados Let's Encrypt
  - CORS: Configurado para app.voudemoto.com
```

#### Rate Limiting
```yaml
Endpoints Públicos: 100 req/s (burst 500)
Autenticação: 5 req/s (burst 15)
Uploads: 10 req/minute por usuário
WebSockets: 50 conexões por IP
```

---

### 2. Application Layer

#### Backend Pods
```yaml
Deployment: voudemoto-backend
Replicas: 6-30 (auto-scaling)
Distribuição: 2 pods por AZ (3 AZs)
Resources:
  Requests: 500m CPU, 1Gi Memory
  Limits: 2000m CPU, 2Gi Memory
Health Checks:
  Startup: /health (30 tentativas, 5s interval)
  Liveness: /health (60s initial, 10s period)
  Readiness: /health/ready (30s initial, 5s period)
```

#### Auto-Scaling (HPA)
```yaml
Métricas:
  - CPU: Target 70%
  - Memory: Target 80%
  - Custom: http_requests_per_second > 100
Behavior:
  Scale Up: Rápido (50% ou +3 pods a cada 60s)
  Scale Down: Conservador (10% ou -1 pod a cada 5min)
Min Replicas: 6
Max Replicas: 30
```

#### Graceful Shutdown
```typescript
1. Recebe SIGTERM do Kubernetes
2. Para de aceitar novas requisições (readiness probe fail)
3. Aguarda 15s (preStop hook)
4. Finaliza requisições em andamento
5. Fecha conexões com DB/Redis
6. Processo termina (30s grace period total)
```

---

### 3. Data Layer

#### PostgreSQL (RDS Multi-AZ)

**Configuração**:
```yaml
Instância: db.r6g.xlarge (4 vCPU, 32GB RAM)
Engine: PostgreSQL 16.1
Storage: 500GB GP3 (3000 IOPS, 125 MB/s)
Backup: Automático diário, retenção 30 dias
Multi-AZ: Habilitado (failover automático)
Replicas de Leitura: 2 (cross-AZ)
Encryption: AES-256 (at rest + in transit)
```

**Otimizações**:
```sql
-- Connection Pooling
max_connections = 200
shared_buffers = 8GB
effective_cache_size = 24GB
work_mem = 128MB

-- Query Performance
random_page_cost = 1.1  -- SSD
effective_io_concurrency = 200

-- Logging
log_min_duration_statement = 1000  -- Log queries > 1s

-- Extensions
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
```

**Schemas**:
```
public: Tabelas principais (users, drivers, rides, etc.)
analytics: Métricas e agregações
audit: Logs de auditoria
```

#### Redis Sentinel (Alta Disponibilidade)

**Topologia**:
```yaml
Sentinels: 3 instâncias (quorum 2)
Redis Master: 1 instância (16GB)
Redis Replicas: 2 instâncias (16GB cada)
Persistence: RDB + AOF
Eviction Policy: allkeys-lru
Max Memory: 14GB (with reserve)
```

**Uso**:
```typescript
// Session Storage
"session:{userId}" → User session data (TTL 15min)

// Cache
"cache:user:{id}" → User profile (TTL 30min)
"cache:driver:location:{id}" → Driver location (TTL 10s)
"cache:nearbyDrivers:{lat}:{lng}" → Nearby drivers (TTL 10s)

// Rate Limiting
"ratelimit:{ip}:{endpoint}" → Request count

// Locks
"lock:ride:{rideId}" → Distributed lock
```

#### MongoDB Replica Set (Analytics)

**Configuração**:
```yaml
Replica Set: 3 nós (1 primary + 2 secondaries)
Instância: t3.medium (2 vCPU, 4GB RAM)
Storage: 200GB GP3
Read Preference: secondaryPreferred (analytics)
Write Concern: majority
```

**Collections**:
```javascript
analytics.events: Eventos de negócio
analytics.user_behavior: Comportamento de usuários
analytics.realtime_metrics: Métricas em tempo real
logs.application: Logs não estruturados
```

---

### 4. Observability Stack

#### Prometheus (Métricas)

**Configuração**:
```yaml
Retention: 15 dias
Scrape Interval: 15s
Scrape Timeout: 10s
Storage: 100GB PVC
Targets:
  - Backend Pods (metrics endpoint)
  - PostgreSQL Exporter
  - Redis Exporter
  - Node Exporter
  - kube-state-metrics
```

**Métricas Custom**:
```typescript
// Counter
http_requests_total{method, route, status_code}
cache_operations_total{operation, status}

// Histogram
http_request_duration_seconds{method, route}
database_query_duration_seconds{operation, table}

// Gauge
http_requests_active{method, route}
websocket_connections_active{type}
db_connection_pool_active
db_connection_pool_max
```

#### Loki (Logs)

**Configuração**:
```yaml
Retention: 7 dias
Storage: 50GB PVC
Index: boltdb-shipper
Compactor: Habilitado
Ruler: Integrado com AlertManager
```

**Log Pipeline**:
```
Application → Winston → JSON → Promtail → Loki → Grafana
                ↓
          trace_id + span_id (correlação)
```

#### Jaeger (Tracing)

**Configuração**:
```yaml
Storage: Badger (20GB PVC)
Sampling: 100% (development), 10% (production)
Retention: 7 dias
Ports:
  - 16686: UI
  - 14268: Jaeger collector (HTTP)
  - 4317: OTLP (gRPC)
  - 4318: OTLP (HTTP)
```

**Instrumentação**:
```typescript
// Automatic
- HTTP requests (incoming/outgoing)
- Express routes
- Database queries (PostgreSQL, MongoDB)
- Redis operations

// Manual
- Business logic spans
- External API calls
- Background jobs
```

#### Grafana (Visualização)

**Datasources**:
- Prometheus: Métricas
- Loki: Logs
- Jaeger: Traces

**Dashboards**:
1. Backend Overview (requests, errors, latency)
2. Database Performance (queries, connections, locks)
3. Cache Metrics (hit rate, memory, evictions)
4. Infrastructure (CPU, memory, disk, network)
5. Business Metrics (rides, payments, users)

---

### 5. Security Layer

#### Network Policies

```yaml
default-deny-all: Bloqueia todo tráfego por padrão

allow-ingress-to-backend:
  From: ingress-nginx namespace
  To: backend pods
  Port: 3000

allow-backend-to-postgres:
  From: backend pods
  To: postgres pods
  Port: 5432

allow-backend-to-redis:
  From: backend pods
  To: redis pods
  Port: 6379

allow-backend-egress:
  To: DNS (UDP 53), HTTPS (443), Prometheus (9090), Jaeger (14268)
```

#### RBAC (Role-Based Access Control)

```yaml
Roles:
  voudemoto-backend:
    Permissions: Read secrets/configmaps (específicos)
    Scope: Namespace

  voudemoto-monitoring:
    Permissions: Read pods/services/nodes, metrics API
    Scope: Cluster

  voudemoto-developer:
    Permissions: Read pods/logs/deployments (NO secrets)
    Scope: Cluster

  voudemoto-devops:
    Permissions: Full admin
    Scope: Cluster
```

#### Secrets Management

```yaml
AWS Secrets Manager:
  - database-url
  - database-replica-url
  - redis-password
  - jwt-secret
  - jwt-refresh-secret
  - stripe-api-key
  - sentry-dsn

Kubernetes Secrets:
  - voudemoto-secrets (encrypted at rest)
  - tls-certificates (auto-renewed by cert-manager)
```

---

## Fluxo de Requisição

### 1. Request HTTP Típico

```
1. Cliente → CloudFront (cache de assets estáticos)
2. CloudFront → ALB (health check + routing)
3. ALB → NGINX Ingress
   - SSL termination
   - Rate limiting check
   - WAF rules
   - CORS headers
4. NGINX → Backend Pod
   - Tracing middleware (cria span)
   - Metrics middleware (inicia timer)
   - Auth middleware (valida JWT)
   - Controller handler
5. Backend → PostgreSQL
   - Connection pool (max 20 conexões)
   - Query execution (com retry)
   - Trace database span
6. Backend → Redis (se cache)
   - Cache check (getOrSet pattern)
   - Se miss, busca DB e seta cache
7. Backend → Response
   - Metrics middleware (registra latência, status)
   - Tracing middleware (finaliza span)
   - Logger (log request com trace_id)
8. Response → Cliente
   - NGINX adiciona headers de segurança
   - ALB tracking
   - CloudFront (se cacheable)
```

### 2. WebSocket Connection

```
1. Cliente → wss://api.voudemoto.com/ws
2. ALB → NGINX Ingress (upgrade connection)
3. NGINX → Backend Pod (sticky session)
4. Backend mantém conexão persistente
5. Redis Pub/Sub para broadcast entre pods
   - Canal: "ride:{rideId}:updates"
   - Pub: Pod que processa update
   - Sub: Todos os pods com conexões ativas
```

### 3. Background Job (Exemplo: Notificações)

```
1. API recebe evento (ex: corrida concluída)
2. Publica mensagem no Redis Stream
   - Stream: "notifications:queue"
   - Consumer Group: "notification-workers"
3. Worker consome mensagem
   - Processa lógica de negócio
   - Envia push via Firebase Cloud Messaging
   - Salva notificação no banco
4. Se falhar: Retry com exponential backoff (3x)
5. Se falhar 3x: Move para DLQ (Dead Letter Queue)
```

---

## Padrões de Design

### 1. Repository Pattern
```typescript
// Abstração de acesso a dados
UserRepository.findById(id)
RideRepository.findActiveByDriver(driverId)
```

### 2. Service Layer
```typescript
// Lógica de negócio isolada
RideService.createRide(userId, data)
PaymentService.processPayment(rideId)
```

### 3. Middleware Chain
```typescript
// Express middleware pipeline
[
  tracingMiddleware,    // OpenTelemetry
  metricsMiddleware,    // Prometheus
  authMiddleware,       // JWT validation
  validationMiddleware, // Joi schemas
  controller,           // Business logic
  errorMiddleware       // Error handling
]
```

### 4. Circuit Breaker
```typescript
// Proteção contra falhas em cascata
const payment = await circuitBreaker.execute(() =>
  stripe.charges.create(data)
);
```

### 5. Cache-Aside
```typescript
// Pattern de cache
@Cacheable({
  keyGenerator: (userId) => CacheKey.user(userId),
  ttl: CacheTTL.USER_PROFILE
})
async getUserProfile(userId: string) {
  return this.userRepository.findById(userId);
}
```

---

## Capacidade e Limites

### Throughput
- **Target**: 1,000 req/s
- **Peak**: 5,000 req/s (com auto-scaling)
- **Sustained**: 2,000 req/s

### Latência
- **p50**: <50ms
- **p95**: <100ms
- **p99**: <200ms

### Concorrência
- **Conexões simultâneas**: 10,000+
- **WebSockets ativos**: 5,000+
- **Background jobs/min**: 10,000+

### Dados
- **Users**: 1M+ (projetado para 10M)
- **Rides/dia**: 100,000+
- **Database size**: 500GB (com crescimento)
- **Logs/dia**: 100GB

---

## Disaster Recovery

### RTO (Recovery Time Objective)
- **Crítico**: 15 minutos
- **Alto**: 1 hora
- **Médio**: 4 horas

### RPO (Recovery Point Objective)
- **Database**: 5 minutos (replicação contínua)
- **Arquivos**: 1 hora (backup incremental)

### Estratégias
1. **Multi-AZ**: Failover automático em 5min
2. **Multi-Region**: Failover manual em 30min
3. **Backups**: Diários + PITR (Point-In-Time Recovery)
4. **Testes**: Drills trimestrais de DR

---

## Custos (Estimativa Mensal)

### AWS Infrastructure
- **EKS Cluster**: $150/mês
- **EC2 Instances (6x r6g.xlarge)**: $900/mês
- **RDS (db.r6g.xlarge Multi-AZ)**: $800/mês
- **ElastiCache (Redis)**: $200/mês
- **S3 (backups + logs)**: $100/mês
- **CloudFront**: $50/mês
- **Route53**: $10/mês
- **ALB**: $30/mês
- **Data Transfer**: $200/mês

**Total Infrastructure**: ~$2,440/mês

### SaaS Services
- **GitHub Actions**: $50/mês
- **Sentry**: $50/mês
- **PagerDuty**: $30/mês
- **Stripe (2.9% + $0.30 por transação)**: Variável

**Total Estimado**: ~$2,600-3,000/mês

### Otimizações
- Savings Plans: -20% (~$500/mês)
- Spot Instances para dev/staging: -50%
- Reserved Instances para RDS: -30%

---

## Próximas Melhorias

### Q1 2026
1. ✅ Implementar Service Mesh (Istio)
2. ✅ Adicionar Chaos Engineering (Litmus)
3. ✅ GraphQL API (além de REST)
4. ✅ Machine Learning para previsão de demanda

### Q2 2026
1. ⏳ Migração para arquitetura de eventos (Event Sourcing)
2. ⏳ Implementar CQRS (Command Query Responsibility Segregation)
3. ⏳ Multi-region activo-activo
4. ⏳ Edge computing para baixa latência

### Q3 2026
1. ⏳ Certificação ISO 27001
2. ⏳ Expansão internacional
3. ⏳ API Pública para parceiros
4. ⏳ Plataforma multi-tenant

---

## Referências

- [Operations Manual](./OPERATIONS_MANUAL.md)
- [DR Plan](./DR_PLAN.md)
- [LGPD Compliance](./LGPD_COMPLIANCE.md)
- [API Documentation](./API_DOCUMENTATION.md)
- [Runbooks](./runbooks/)

---

**Autor**: DevOps Team  
**Data**: 28 de janeiro de 2026  
**Versão**: 1.0  
**Próxima Revisão**: 28 de abril de 2026
