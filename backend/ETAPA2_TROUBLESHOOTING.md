# ETAPA 2 - Troubleshooting & Boas Práticas

## 🔍 Troubleshooting

### Problema 1: Matching nunca encontra motorista

**Sintomas:**
- Corrida fica em `SEARCHING_DRIVER` indefinidamente
- Events mostram múltiplas tentativas sem motorista

**Causas Possíveis:**
1. Nenhum motorista online
2. Raio inicial muito pequeno
3. Motoristas muito longe

**Solução:**

```typescript
// ❌ ERRADO: Raio muito pequeno
await appService.matchingAutomationService.startAutomation(
  rideId,
  passengerId,
  0.5  // 500 metros - muito restritivo!
);

// ✅ CORRETO: Raio adequado
await appService.matchingAutomationService.startAutomation(
  rideId,
  passengerId,
  3    // 3km - raio padrão
);

// ✅ MELHOR: Verificar motoristas antes
const candidates = await appService.matchingService.findCandidates(
  rideId,
  5,    // raio maior para verificar
  10
);

if (candidates.length === 0) {
  console.warn('⚠️ Nenhum motorista disponível!');
  // Informar passageiro
} else {
  // Iniciar matching com confiança
  await appService.matchingAutomationService.startAutomation(rideId, passengerId, 3);
}
```

---

### Problema 2: Timeout muito rápido

**Sintomas:**
- Corrida é cancelada em ~30s
- Nem todas as tentativas são executadas

**Causas Possíveis:**
1. `MATCHING_TIMEOUT_SECONDS` configurado muito baixo
2. Delays muito longos acumulando

**Solução:**

```bash
# ❌ ERRADO: Timeout muito curto
MATCHING_TIMEOUT_SECONDS=30
MATCHING_INITIAL_DELAY_SECONDS=15
# Total: 2 tentativas apenas

# ✅ CORRETO: Timeout adequado
MATCHING_TIMEOUT_SECONDS=60
MATCHING_INITIAL_DELAY_SECONDS=15
MATCHING_MAX_ATTEMPTS=4
# Total: 4 tentativas em ~60s

# ✅ MELHOR: Considerar delays
# LINEAR: 0s, 15s, 30s, 45s = 90s total (excede timeout)
# EXPONENTIAL: 0s, 15s, 30s, 60s = 105s total
# Aumentar timeout ou reduzir max attempts
MATCHING_TIMEOUT_SECONDS=120
MATCHING_MAX_ATTEMPTS=3
```

**Cálculo de Timeout:**

```typescript
function calculateRequiredTimeout(
  strategy: 'LINEAR' | 'EXPONENTIAL' | 'FIBONACCI',
  maxAttempts: number,
  initialDelaySeconds: number
): number {
  let totalTime = 0;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    let delay: number;
    
    if (strategy === 'LINEAR') {
      delay = initialDelaySeconds * attempt;
    } else if (strategy === 'EXPONENTIAL') {
      delay = initialDelaySeconds * Math.pow(2, attempt - 1);
    } else {
      // FIBONACCI
      const fib = [1, 1, 2, 3, 5][attempt - 1] || 5;
      delay = initialDelaySeconds * fib;
    }
    
    totalTime += Math.min(delay, 120); // máx 120s por tentativa
  }
  
  return Math.ceil(totalTime / 1000) + 10; // +10s buffer
}

// Exemplos:
calculateRequiredTimeout('LINEAR', 4, 15);      // ~160 segundos
calculateRequiredTimeout('EXPONENTIAL', 4, 15); // ~120 segundos
calculateRequiredTimeout('FIBONACCI', 4, 15);   // ~105 segundos
```

---

### Problema 3: Rejeição de motorista não inicia reatribuição

**Sintomas:**
- Motorista rejeita corrida
- Corrida é cancelada ao invés de ser reatribuída

**Causas Possíveis:**
1. `handleDriverRejected()` não foi chamado
2. Max attempts já atingido
3. Raio já no máximo

**Solução:**

```typescript
// ❌ ERRADO: Não chamar handleDriverRejected
async rejectRide(req: Request, res: Response) {
  const rideId = req.params.rideId;
  // ... validações
  
  await rideService.recordDriverRejection(rideId, driverId);
  // ❌ Falta: matchingAutomationService.handleDriverRejected()
}

// ✅ CORRETO: Chamar o handler
async rejectRide(req: Request, res: Response) {
  const rideId = req.params.rideId;
  const driverId = req.user.id;
  // ... validações
  
  await rideService.recordDriverRejection(rideId, driverId);
  
  // ✅ Chamar handler de automação
  await matchingAutomationService.handleDriverRejected(rideId, driverId);
  
  res.json({ success: true });
}
```

---

### Problema 4: Memory leak com jobs

**Sintomas:**
- Uso de memória cresce continuamente
- Processo fica lento após horas

**Causas Possíveis:**
1. Jobs finalizados não são limpos
2. States de automação não são deletados
3. Event subscribers acumulam

**Solução:**

```typescript
// ❌ ERRADO: Sem limpeza
async finishRide(rideId: string) {
  // ... lógica
  // ❌ Falta cleanup
}

// ✅ CORRETO: Limpar recursos
async finishRide(rideId: string) {
  // ... lógica
  
  // ✅ Limpar estado de automação
  appService.matchingAutomationService.cleanupAutomationState(rideId);
  
  // ✅ Limpar jobs relacionados
  const pendingJobs = appService.jobScheduler.getPendingJobs();
  for (const job of pendingJobs) {
    if (job.tags?.includes(`matching-${rideId}`)) {
      appService.jobScheduler.cancel(job.jobId);
    }
  }
}

// ✅ Em shutdown, destruir scheduler
process.on('SIGTERM', async () => {
  await appService.destroy();
  process.exit(0);
});
```

---

## ✅ Boas Práticas

### 1. Configurar Parâmetros Adequadamente

```typescript
// ✅ MELHOR: Para ambiente de teste/dev
{
  enabled: true,
  strategy: RetryStrategy.LINEAR,
  maxAttempts: 3,
  initialDelaySeconds: 5,      // Rápido para testes
  maxDelaySeconds: 15,
  matchingTimeoutSeconds: 30,
  expandRadiusKmPerAttempt: 2, // Expande rápido
  maxRadiusKm: 10,
}

// ✅ MELHOR: Para produção
{
  enabled: true,
  strategy: RetryStrategy.EXPONENTIAL,
  maxAttempts: 4,
  initialDelaySeconds: 15,     // Mais tempo
  maxDelaySeconds: 120,
  matchingTimeoutSeconds: 60,
  expandRadiusKmPerAttempt: 1, // Expande gradualmente
  maxRadiusKm: 15,
}
```

---

### 2. Monitorar com Logging

```typescript
// ✅ BOM: Log informativo
Logger.info('Matching automation started', {
  rideId,
  passengerId,
  initialRadiusKm,
  strategy: config.strategy,
  maxAttempts: config.maxAttempts,
});

// ❌ RUIM: Sem contexto
Logger.info('Automation started');

// ✅ BOM: Log de progresso
const state = automationService.getAutomationState(rideId);
Logger.debug('Matching progress', {
  rideId,
  attempt: state.currentAttempt,
  radiusKm: state.currentRadiusKm,
  status: state.status,
  rejectedCount: state.rejectedDriverIds.size,
});
```

---

### 3. Implementar Retry Inteligente

```typescript
// ✅ MELHOR: Implementar retry com validações
async function initiateMatchingWithValidation(
  rideId: string,
  passengerId: string
) {
  // 1. Validar passageiro
  const passenger = await userService.getUserById(passengerId);
  if (!passenger) {
    throw new NotFoundError('Passenger not found');
  }

  // 2. Validar corrida
  const ride = await rideService.getRideById(rideId);
  if (ride.status !== RideStatus.CREATED) {
    throw new StateTransitionError(
      `Cannot start matching from ${ride.status}`,
      ride.status,
      RideStatus.SEARCHING_DRIVER
    );
  }

  // 3. Verificar motoristas disponíveis
  const availableDrivers = await driverService.getOnlineDrivers();
  if (availableDrivers.length === 0) {
    // Informar passageiro
    throw new ConflictError('No drivers available', 'NO_DRIVERS');
  }

  // 4. Iniciar apenas se validações passarem
  await matchingAutomationService.startAutomation(rideId, passengerId, 3);
}
```

---

### 4. Usar Estratégia Correta

```typescript
// Análise de quando usar cada estratégia:

// LINEAR: Quando você quer progressão simples e previsível
// Melhor para: Teste, desenvolvimento, ambientes controlados
RetryStrategy.LINEAR

// EXPONENTIAL: Quando você quer reduzir carga gradualmente
// Melhor para: Produção, ambientes com muita concorrência
RetryStrategy.EXPONENTIAL

// FIBONACCI: Balanço entre os dois
// Melhor para: Casos específicos onde progressão suave é importante
RetryStrategy.FIBONACCI

// ✅ Recomendação por ambiente:
// - DEV:  LINEAR
// - TEST: LINEAR ou FIBONACCI
// - PROD: EXPONENTIAL
```

---

### 5. Implementar Observability

```typescript
// ✅ BOM: Dashboard de métricas
interface MatchingMetrics {
  totalAttempts: number;
  successCount: number;
  failureCount: number;
  averageAttemptsToSuccess: number;
  averageTimeToMatch: number;
  rejectionRate: number;
  timeoutRate: number;
}

// Expor métricas em:
app.get('/metrics/matching', (req, res) => {
  const metrics = calculateMatchingMetrics();
  res.json(metrics);
});

// ✅ Alertar em problemas:
if (metrics.failureRate > 0.2) {
  Logger.error('High matching failure rate', {
    failureRate: metrics.failureRate,
    threshold: 0.2,
  });
  // Notificar ops
}
```

---

### 6. Graceful Degradation

```typescript
// ✅ MELHOR: Se automação falhar, permitir busca manual
async startMatching(req: Request, res: Response) {
  try {
    // Tentar automação
    await matchingAutomationService.startAutomation(rideId, passengerId, 3);
    res.json({ success: true, mode: 'automatic' });
  } catch (error) {
    Logger.warn('Automatic matching failed, fallback to manual', { error });
    
    // ✅ Fallback: Permitir passageiro ver motoristas online
    const availableDrivers = await matchingService.findCandidates(rideId, 10, 20);
    res.json({
      success: true,
      mode: 'manual',
      availableDrivers,
      message: 'Automação temporariamente indisponível. Motoristas disponíveis abaixo.',
    });
  }
}
```

---

### 7. Testing Strategy

```typescript
// ✅ BOM: Testes abrangentes
describe('MatchingAutomation', () => {
  // Sucesso
  it('should match on first attempt');
  it('should match after multiple attempts');
  it('should handle driver rejection');
  
  // Falhas
  it('should timeout without driver');
  it('should handle network errors');
  
  // Edge cases
  it('should handle pause/resume');
  it('should handle concurrent matching');
  it('should cleanup resources');
  
  // Performance
  it('should complete within timeout');
  it('should not leak memory');
});

// Mock para testes
class MockMatchingService {
  async findCandidates(
    rideId: string,
    radiusKm: number,
    limit: number
  ): Promise<any[]> {
    if (radiusKm >= 5) {
      // Simula encontro após raio expandir
      return [{ driverId: 'driver-1', score: 85 }];
    }
    return []; // Primeira tentativa falha
  }
}
```

---

## 🎯 Checklist de Deploy

- [ ] Validar configurações em `.env`
- [ ] Configurar `MATCHING_TIMEOUT_SECONDS` baseado em delays
- [ ] Verificar motoristas online em múltiplas cidades
- [ ] Testes de carga com múltiplas corridas
- [ ] Monitorar memory/CPU na primeira hora
- [ ] Implementar alertas para altos failure rates
- [ ] Setup de cleanup jobs (nightly)
- [ ] Documentar runbook de troubleshooting
- [ ] Treinar support team
- [ ] Ter plano de rollback

---

## 📊 Métricas Importantes

```
✅ Taxa de sucesso de matching: > 95%
✅ Tempo médio para match: < 20s
✅ Taxa de rejeição: < 5%
✅ Taxa de timeout: < 2%
✅ Memory por job: < 1MB
✅ CPU durante peak: < 40%
```

---

**Próximo passo: ETAPA 3 - Timeout Handling!** ⏱️
