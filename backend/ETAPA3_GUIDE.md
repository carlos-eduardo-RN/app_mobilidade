# ETAPA 3 - Timeout Handling
## Sistema Completo de Timeouts com Precisão e Observabilidade

### 📋 Índice
1. [Visão Geral](#visão-geral)
2. [Arquitetura](#arquitetura)
3. [Componentes](#componentes)
4. [Guia de Uso](#guia-de-uso)
5. [Configuração](#configuração)
6. [Exemplos](#exemplos)
7. [Troubleshooting](#troubleshooting)

---

## Visão Geral

ETAPA 3 implementa um sistema robusto de timeouts para o Vou de Moto, cobrindo:

- **Driver Accept Timeout (30s)**: Detecta quando um driver não aceita uma corrida
- **Matching Timeout (60s)**: Timeout geral do processo de matching automático
- **Ride Inactivity Timeout (5min)**: Detecta corridas inativas

### 🎯 Objetivos

```
✓ Precisão de timing (millisegundos)
✓ Observabilidade total (eventos publicados)
✓ Extensibilidade (adicionar timeouts facilmente)
✓ Cleanup automático (sem memory leaks)
✓ Resiliência (retry, fallback)
✓ Integração perfeita (event-driven)
```

---

## Arquitetura

### 🏗️ Stack de Componentes

```
┌─────────────────────────────────────────────────────┐
│                   ApplicationService                 │
│         (Orquestra todos os serviços)               │
└──────────────────┬──────────────────────────────────┘
                   │
        ┌──────────┴────────────┐
        ▼                       ▼
   TimeoutManager         MatchingAutomationService
   (ETAPA 3)                   (ETAPA 2)
        │                       │
  ┌─────┴─────────┬────────┐   │
  ▼               ▼        ▼   │
Start         Extend     Cancel  │
  │               │        │    │
  └───┬───────────┴────────┘    │
      │                         │
      ├─ Driver Accept Job ◄────┤
      ├─ Matching Job ◄─────────┤
      └─ Inactivity Job ◄───────┘
      
  EventPublisher (eventos)
  └─ DRIVER_ACCEPT_TIMEOUT
  └─ MATCHING_TIMEOUT
  └─ RIDE_INACTIVITY_TIMEOUT
```

### 📦 Arquivos Principais

```
src/
├── models/
│   ├── Timeout.ts              # Tipos e interfaces
│   ├── Errors.ts               # TimeoutError class
│   └── Events.ts               # Novos eventos
├── jobs/
│   ├── TimeoutManager.ts        # Gerenciador central
│   ├── DriverAcceptTimeout.ts   # Job de driver accept
│   ├── RideInactivityTimeout.ts # Job de inatividade
│   └── interfaces.ts            # (estendido)
└── services/
    ├── MatchingTimeoutMixin.ts  # Mixin para matching
    ├── RideTimeoutMixin.ts      # Mixin para rides
    └── ApplicationService.ts    # (integração)

tests/
└── timeout.test.ts              # 30+ testes
```

---

## Componentes

### 1. TimeoutManager (Central)

Gerenciador completo de timeouts com:

```typescript
// Inicializar
const timeoutManager = new TimeoutManager(cleanupIntervalMs = 60_000);

// Iniciar timeout
const result = await timeoutManager.start(
  type: TimeoutType,          // DRIVER_ACCEPT, MATCHING, RIDE_INACTIVITY
  rideId: string,             // ID da corrida
  durationMs?: number,        // Duração (usa default se omitido)
  listeners?: TimeoutEventListener[] // Callbacks personalizados
);

// Cancelar
await timeoutManager.cancel(timeoutId, reason);

// Estender
await timeoutManager.extend({
  timeoutId,
  additionalMs,
  reason,
  maxExtensions
});

// Completar
await timeoutManager.complete(timeoutId, reason);

// Status
const state = timeoutManager.getStatus(timeoutId);
const rideTimeouts = timeoutManager.getRideTimeouts(rideId);
```

**Recursos:**
- ✅ Precisão de millisegundos
- ✅ Múltiplos timeouts por ride
- ✅ Extensões personalizáveis
- ✅ Event listeners
- ✅ Cleanup automático
- ✅ Memory safe

### 2. DriverAcceptTimeout

Detecta quando driver não aceita em 30s:

```typescript
// Factory cria listener
const listener = DriverAcceptTimeoutFactory.createListener(
  rideId,
  driverId,
  {
    onDriverAcceptTimeout: async (rideId, driverId) => {
      // Rejeitar driver e tentar próximo
    },
    publishEvent: async (event) => {
      // Publicar DRIVER_ACCEPT_TIMEOUT
    }
  }
);

// Usar com TimeoutManager
const result = await timeoutManager.start(
  TimeoutType.DRIVER_ACCEPT,
  rideId,
  30_000, // 30 segundos
  [listener]
);
```

**Cenários:**
- Timeout Padrão: 30s (2 extensões máx)
- Timeout Estendido: 45s para drivers VIP
- Peak Hours: 20s (1 extensão)
- Remote: 60s (4 extensões)

### 3. RideInactivityTimeout

Detecta corridas inativas por 5 minutos:

```typescript
// Factory cria listener
const listener = RideInactivityTimeoutFactory.createListener(
  rideId,
  {
    onRideInactive: async (rideId, durationMs) => {
      // Cancelar corrida ou notificar
    },
    publishEvent: async (event) => {
      // Publicar RIDE_INACTIVITY_TIMEOUT
    }
  }
);

// Usar com TimeoutManager
const result = await timeoutManager.start(
  TimeoutType.RIDE_INACTIVITY,
  rideId,
  300_000, // 5 minutos
  [listener]
);
```

**Cenários:**
- Standard: 5 min (5 extensões)
- Small City: 3 min (3 extensões)
- Remote: 10 min (8 extensões)
- Passenger Waiting: 2 min (2 extensões)
- In Progress: 30 min (10 extensões)

---

## Guia de Uso

### Cenário 1: Iniciar Driver Accept Timeout

```typescript
// Em RideService ao atribuir driver
async handleDriverAssignment(rideId: string, driverId: string) {
  // Registrar atribuição...
  
  // Iniciar timeout de 30s
  const timeoutId = await this.rideTimeoutMixin.startDriverAcceptTimeout(
    rideId,
    driverId
  );
  
  // Se driver aceitar antes de 30s
  await this.rideTimeoutMixin.cancelDriverAcceptTimeout(
    rideId,
    driverId,
    'driver_accepted'
  );
  
  // Se precisar de mais tempo
  await this.rideTimeoutMixin.extendDriverAcceptTimeout(
    rideId,
    driverId,
    15 // +15 segundos
  );
}
```

### Cenário 2: Rastrear Inatividade

```typescript
// Ao criar corrida
async createRide(dto: CreateRideDTO) {
  const ride = await this.rideService.create(dto);
  
  // Iniciar inactivity timeout
  await this.rideTimeoutMixin.startRideInactivityTimeout(ride.id);
  
  return ride;
}

// Ao atualizar corrida
async updateRide(rideId: string) {
  // Atualizar atividade
  this.rideTimeoutMixin.updateRideActivity(rideId);
  
  // Registrar mudança...
}

// Ao finalizar corrida
async finishRide(rideId: string) {
  // Cancelar timeout
  await this.rideTimeoutMixin.cancelRideInactivityTimeout(
    rideId,
    'ride_completed'
  );
}
```

### Cenário 3: Estender Timeouts

```typescript
// Passageiro solicita mais tempo para driver chegar
async extendDriverWait(rideId: string, driverId: string) {
  const extended = await this.rideTimeoutMixin.extendDriverAcceptTimeout(
    rideId,
    driverId,
    30 // +30 segundos
  );
  
  if (extended) {
    return {
      success: true,
      message: 'Timeout estendido por 30 segundos'
    };
  }
  
  return {
    success: false,
    message: 'Máximo de extensões atingido'
  };
}
```

---

## Configuração

### Variáveis de Ambiente

```bash
# Cleanup
TIMEOUT_CLEANUP_INTERVAL_MS=60000

# Driver Accept Timeout
DRIVER_ACCEPT_TIMEOUT_ENABLED=true
DRIVER_ACCEPT_TIMEOUT_SECONDS=30
DRIVER_ACCEPT_MAX_EXTENSIONS=2

# Ride Inactivity Timeout
RIDE_INACTIVITY_TIMEOUT_ENABLED=true
RIDE_INACTIVITY_TIMEOUT_SECONDS=300
RIDE_INACTIVITY_MAX_EXTENSIONS=5

# Matching Timeout (ETAPA 2)
MATCHING_TIMEOUT_ENABLED=true
MATCHING_TIMEOUT_SECONDS=60
```

### Configuração em Código

```typescript
// Aplicação
const timeoutManager = new TimeoutManager(
  60_000 // cleanup a cada 60s
);

// RideTimeoutMixin
const rideTimeoutMixin = new RideTimeoutMixin(
  timeoutManager,
  eventPublisher,
  rideService,
  {
    driverAcceptTimeoutEnabled: true,
    driverAcceptTimeoutSeconds: 30,
    rideInactivityTimeoutEnabled: true,
    rideInactivityTimeoutSeconds: 300,
    maxDriverAcceptExtensions: 2,
    maxInactivityExtensions: 5
  }
);
```

---

## Exemplos

### Exemplo 1: Timeout Básico

```typescript
// Iniciar
const result = await timeoutManager.start(
  TimeoutType.DRIVER_ACCEPT,
  'ride-123',
  30_000
);

if (result.success) {
  console.log(`Timeout iniciado: ${result.timeoutId}`);
  console.log(`Status: ${result.state.status}`);
  console.log(`Expirará em: ${result.state.expiresAt}`);
}

// Verificar status
const status = timeoutManager.getStatus(result.timeoutId);
console.log(`Tempo restante: ${status.timeRemainingMs}ms`);
```

### Exemplo 2: Com Event Listeners

```typescript
const listener: TimeoutEventListener = {
  onStarted: async (state) => {
    console.log(`⏱️  Timeout iniciado: ${state.timeoutId}`);
  },
  
  onExtended: async (state, previousMs) => {
    const added = state.totalAllocatedMs - previousMs;
    console.log(`⏰ Estendido por ${added}ms`);
  },
  
  onExpired: async (result) => {
    console.log(`⚠️  Timeout expirou!`);
    console.log(`Duração: ${result.totalTimeUsedMs}ms`);
  },
  
  onCancelled: async (timeoutId, reason) => {
    console.log(`✅ Cancelado: ${reason}`);
  }
};

await timeoutManager.start(
  TimeoutType.DRIVER_ACCEPT,
  'ride-123',
  30_000,
  [listener]
);
```

### Exemplo 3: Gerenciar Múltiplos Timeouts

```typescript
// 3 drivers atribuídos em sequência
const drivers = ['drv-1', 'drv-2', 'drv-3'];

for (const driverId of drivers) {
  const timeoutId = await timeoutManager.start(
    TimeoutType.DRIVER_ACCEPT,
    rideId,
    30_000,
    [listener]
  );
  
  // Rastrear
  driverTimeouts.set(driverId, timeoutId);
}

// Obter todos
const allTimeouts = timeoutManager.getRideTimeouts(rideId);
console.log(`${allTimeouts.length} timeouts ativos`);

// Cancelar todos ao finalizar
await timeoutManager.cancelRideTimeouts(rideId, 'ride_completed');
```

---

## Troubleshooting

### ❌ Timeout não expira

**Causa**: Cleanup interval muito alto
**Solução**: 
```bash
TIMEOUT_CLEANUP_INTERVAL_MS=30000  # Aumentar frequência
```

### ❌ Memory leak

**Causa**: Timeouts não cancelados
**Solução**: 
```typescript
// Sempre cancelar ou completar
await timeoutManager.cancel(timeoutId, reason);
// OU
await timeoutManager.complete(timeoutId, reason);
```

### ❌ Extensões não funcionam

**Causa**: Máximo de extensões atingido
**Solução**:
```typescript
// Verificar erro
const result = await timeoutManager.extend({...});
if (!result.success) {
  console.log('Erro:', result.error);
  // Pode ser: "Max extensions reached"
}
```

---

## Estatísticas

- **Código**: 600+ linhas (TimeoutManager)
- **Testes**: 30+ casos cobertos
- **Configurações**: 8 variáveis de ambiente
- **Eventos**: 3 novos tipos de evento
- **Listeners**: 4 callbacks personalizáveis
- **Precisão**: Millisegundos

---

## Próximos Passos

✅ ETAPA 3 está completa!

**ETAPA 4** (Futuro):
- Tracking de métricas de timeout
- Dashboard de observabilidade
- Alertas automáticos
- Análise de tendências

---

**Status**: ✅ Pronto para Produção
**Última Atualização**: 2026-01-24
**Versão**: 3.0.0
