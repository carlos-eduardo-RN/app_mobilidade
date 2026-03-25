# 📊 ETAPA 2 - Matching Automation

## Visão Geral

A **ETAPA 2** implementa **automação completa de busca por motorista** com:
- ✅ Tentativas automáticas e progressivas
- ✅ Expansão gradual do raio de busca
- ✅ Reatribuição ao receber rejeição
- ✅ Múltiplas estratégias de retry (LINEAR, EXPONENCIAL, FIBONACCI)
- ✅ Timeout inteligente com backoff
- ✅ Sistema robusto de background jobs
- ✅ Event-driven com publicação de eventos

---

## 🏗️ Arquitetura

### Componentes Principais

```
┌─────────────────────────────────────────────────────────────┐
│                   Passenger App                              │
│              POST /api/passenger/rides                        │
│              POST /api/passenger/rides/:id/start-matching     │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│            PassengerController                               │
│   → RideService.startAutomatedMatching()                     │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│         MatchingAutomationService ⭐                          │
│  • Gerencia estado da automação                              │
│  • Calcula delays e estratégias                              │
│  • Coordena tentativas de matching                           │
│  • Trata rejeições de motoristas                             │
│  • Publica eventos de progresso                              │
└────────────────────────┬────────────────────────────────────┘
                         │
                    ┌────┴────┐
                    │          │
                    ▼          ▼
         ┌──────────────┐  ┌──────────────┐
         │ MatchingJob  │  │ EventPubl.   │
         └──────┬───────┘  └──────┬───────┘
                │                 │
                ▼                 ▼
         ┌──────────────┐  ┌──────────────┐
         │ JobScheduler │  │ Subscribers  │
         └──────┬───────┘  │ (SMS, Email) │
                │          └──────────────┘
                ▼
         ┌──────────────────┐
         │ Background Jobs  │
         │ (Fila de espera) │
         └──────────────────┘
```

### Classes Principais

#### 1. **JobScheduler** (`src/jobs/JobScheduler.ts`)
Gerencia execução de background jobs com retry automático.

```typescript
interface IJobScheduler {
  schedule(job: IBackgroundJob, delayMs: number, options?: ScheduleOptions): string;
  cancel(jobId: string): boolean;
  getStatus(jobId: string): ScheduledJob | null;
  getPendingJobs(): ScheduledJob[];
  pause(): void;
  resume(): void;
  destroy(): Promise<void>;
}
```

**Recursos:**
- Agendamento com delay customizável
- Retry automático com backoff exponencial
- Timeout por job
- Pause/Resume global
- Cleanup de jobs finalizados
- Logging estruturado

#### 2. **MatchingJob** (`src/jobs/MatchingJob.ts`)
Job que executa tentativa de matching.

```typescript
interface MatchingJobDependencies {
  rideId: string;
  passengerId: string;
  onMatch: (driverId: string) => Promise<void>;
  onFailed: (reason: string) => Promise<void>;
  findBestDriver: (rideId: string, radiusKm: number) => Promise<string | null>;
  getRideById: (rideId: string) => Promise<any>;
}
```

**Fluxo:**
1. Tenta encontrar motorista com raio atual
2. Se encontrado → callback `onMatch`
3. Se não encontrado → expande raio e retorna retry
4. Se raio máximo atingido → callback `onFailed`

#### 3. **MatchingAutomationService** (`src/services/MatchingAutomationService.ts`)
Orquestra toda a automação de matching.

```typescript
class MatchingAutomationService {
  startAutomation(rideId: string, passengerId: string, initialRadiusKm?: number);
  handleDriverRejected(rideId: string, driverId: string);
  pauseAutomation(rideId: string): boolean;
  resumeAutomation(rideId: string): boolean;
  getAutomationState(rideId: string): MatchingAutomationState | null;
  getAutomationResult(rideId: string): MatchingAutomationResult | null;
  cleanupAutomationState(rideId: string): void;
}
```

---

## 📋 Modelos de Dados

### RetryStrategy (Estratégias de Retry)

```typescript
enum RetryStrategy {
  LINEAR = 'LINEAR',           // 15s, 30s, 45s, 60s
  EXPONENTIAL = 'EXPONENTIAL', // 15s, 30s, 60s, 120s
  FIBONACCI = 'FIBONACCI',     // 15s, 15s, 30s, 45s, 75s
}
```

### AutomationConfig

```typescript
interface AutomationConfig {
  enabled: boolean;                        // Ativar/desativar automação
  strategy: RetryStrategy;                 // Estratégia de retry
  maxAttempts: number;                     // Máx tentativas (default: 4)
  initialDelaySeconds: number;             // Delay inicial (default: 15s)
  maxDelaySeconds: number;                 // Delay máximo (default: 120s)
  matchingTimeoutSeconds: number;          // Timeout total (default: 60s)
  expandRadiusKmPerAttempt: number;        // Expandir raio por tentativa (default: 1km)
  maxRadiusKm: number;                     // Raio máximo (default: 15km)
}
```

### MatchingAutomationState

```typescript
interface MatchingAutomationState {
  rideId: string;
  passengerId: string;
  currentAttempt: number;              // Tentativa atual
  lastAttemptAt?: Date;                // Timestamp da última tentativa
  nextRetryAt?: Date;                  // Quando próxima tentativa será
  currentRadiusKm: number;             // Raio atual de busca
  rejectedDriverIds: Set<string>;      // Motoristas que rejeitaram
  status: 'PENDING' | 'IN_PROGRESS' | 'MATCHED' | 'TIMEOUT' | 'FAILED' | 'PAUSED';
  createdAt: Date;
}
```

### Novos Eventos (EventType)

```typescript
// ETAPA 2: Matching Automation Events
MATCHING_STARTED = 'matching_started'        // Automação iniciada
MATCHING_ATTEMPT = 'matching_attempt'        // Tentativa realizada
MATCHING_FAILED = 'matching_failed'          // Automação falhou
DRIVER_ASSIGNED = 'driver_assigned'          // Motorista atribuído
DRIVER_REJECTED = 'driver_rejected'          // Motorista rejeitou
```

---

## 🔄 Fluxo Completo

### Cenário 1: Sucesso na Primeira Tentativa

```
1. Passageiro cria corrida
   └─ RideService.createRide() → Status: CREATED

2. Passageiro inicia matching
   └─ RideService.startAutomatedMatching()
   └─ Status: CREATED → SEARCHING_DRIVER
   └─ Evento: RIDE_MATCHING_STARTED

3. MatchingAutomationService.startAutomation()
   └─ Cria estado de automação
   └─ Evento: MATCHING_STARTED
   └─ Agenda primeira tentativa (imediato)

4. MatchingJob.execute() (Tentativa 1)
   └─ MatchingService.findBestDriver(rideId, 3km)
   └─ Encontra driverId = 'driver-1' ✅
   └─ Chama onMatch(driverId)

5. handleMatchFound()
   └─ RideService.assignDriverToRide(rideId, driverId)
   └─ Status: SEARCHING_DRIVER → DRIVER_ASSIGNED
   └─ Evento: DRIVER_ASSIGNED
   └─ automationState.status = 'MATCHED'

6. Resultado
   └─ Corrida pronta para aceitar/rejeitar
   └─ Passageiro recebe notificação com motorista
```

### Cenário 2: Sucesso Após Múltiplas Tentativas

```
1-3. [igual ao cenário 1, mas sem motorista no raio inicial]

4. MatchingJob.execute() (Tentativa 1 - Raio 3km)
   └─ MatchingService.findBestDriver(rideId, 3km)
   └─ Nenhum motorista encontrado ❌
   └─ nextRadiusKm = 3 + 1 = 4km
   └─ shouldRetry = true
   └─ nextRetryIn = 15000ms (conforme estratégia)
   └─ Evento: MATCHING_ATTEMPT

5. JobScheduler agenda próxima tentativa
   └─ Aguarda 15 segundos

6. MatchingJob.execute() (Tentativa 2 - Raio 4km)
   └─ MatchingService.findBestDriver(rideId, 4km)
   └─ Encontra driverId = 'driver-2' ✅
   └─ [continua como cenário 1, passo 5+]

7. Resultado
   └─ Corrida com motorista após 2 tentativas
   └─ Duração total: ~15s
```

### Cenário 3: Falha - Sem Motoristas Disponíveis

```
1-3. [igual anterior]

4-5. Tentativa 1-3: Sem motoristas em raio crescente (3, 4, 5km)

6. MatchingJob.execute() (Tentativa 4 - Raio 5km)
   └─ currentAttempt = 4 (máximo)
   └─ Nenhum motorista encontrado ❌
   └─ reachedMaxRadius = true
   └─ shouldRetry = false (máximo de tentativas)
   └─ shouldRetry = true ⚠️ (mas falha permanente próxima)

7. handleMatchingFailed()
   └─ automationState.status = 'FAILED'
   └─ Evento: MATCHING_FAILED
   └─ RideService.cancelRide(rideId, 'Matching timeout')

8. Resultado
   └─ Corrida cancelada após ~60s
   └─ Passageiro recebe notificação de timeout
```

### Cenário 4: Motorista Rejeita Corrida

```
1-5. [motorista é encontrado e atribuído, Tentativa 1]

6. Motorista vê notificação e **rejeita** ❌
   └─ DriverController.rejectRide(rideId, driverId)
   └─ Evento: RIDE_DRIVER_REJECTED
   └─ MatchingAutomationService.handleDriverRejected()

7. handleDriverRejected()
   └─ rejectedDriverIds.add(driverId)
   └─ Evento: DRIVER_REJECTED
   └─ scheduleMatchingAttempt() → Tentativa 2

8. MatchingJob.execute() (Tentativa 2)
   └─ findBestDriver() filtra motorista rejeitado
   └─ Procura próximo melhor motorista ✅
   └─ [continua como sucesso]

9. Resultado
   └─ Novo motorista encontrado
   └─ Corrida reatribuída
```

---

## 📊 Diagrama de Delays

### Estratégia LINEAR

```
Tentativa │ Delay  │ Delay Acumulado │ Raio
────────────────────────────────────────────
    1     │  0s    │      0s          │ 3km
    2     │ 15s    │     15s          │ 4km
    3     │ 30s    │     45s          │ 5km
    4     │ 45s    │     90s          │ 6km (timeout em 60s)
```

### Estratégia EXPONENTIAL

```
Tentativa │ Delay  │ Delay Acumulado │ Raio
────────────────────────────────────────────
    1     │  0s    │      0s          │ 3km
    2     │ 15s    │     15s          │ 4km
    3     │ 30s    │     45s          │ 5km
    4     │ 60s    │    105s          │ (timeout em 60s)
```

### Estratégia FIBONACCI

```
Tentativa │ Delay  │ Delay Acumulado │ Raio
────────────────────────────────────────────
    1     │  0s    │      0s          │ 3km
    2     │ 15s    │     15s          │ 4km
    3     │ 15s    │     30s          │ 5km
    4     │ 30s    │     60s          │ 6km (timeout)
```

---

## 🔌 Integração com Controladores

### PassengerController

```typescript
async startMatching(req: Request, res: Response) {
  const { rideId } = req.params;
  const userId = req.user.id;

  try {
    const ride = await this.appService.rideService.getRideById(rideId);

    if (ride.passengerId !== userId) {
      throw new ConflictError('Not ride owner', 'UNAUTHORIZED');
    }

    // ✨ NOVO: Iniciar automação
    await this.appService.rideService.startAutomatedMatching(rideId);
    await this.appService.matchingAutomationService.startAutomation(
      rideId,
      userId,
      3 // raio inicial em km
    );

    res.json({ success: true, message: 'Matching started' });
  } catch (error: any) {
    // ... error handling
  }
}
```

### DriverController

```typescript
async rejectRide(req: Request, res: Response) {
  const { rideId } = req.params;
  const driverId = req.user.id;

  try {
    const ride = await this.appService.rideService.getRideById(rideId);

    if (ride.driverId !== driverId) {
      throw new ConflictError('Not assigned driver', 'UNAUTHORIZED');
    }

    await this.appService.rideService.recordDriverRejection(rideId, driverId);

    // ✨ NOVO: Registrar rejeição e reatribuir
    await this.appService.matchingAutomationService.handleDriverRejected(
      rideId,
      driverId
    );

    res.json({ success: true, message: 'Ride rejected' });
  } catch (error: any) {
    // ... error handling
  }
}
```

---

## ⚙️ Configuração via .env

```bash
# ETAPA 2: Matching Automation
MATCHING_AUTOMATION_ENABLED=true
MATCHING_RETRY_STRATEGY=EXPONENTIAL

# Tentativas e Timeouts
MATCHING_MAX_ATTEMPTS=4
MATCHING_INITIAL_DELAY_SECONDS=15
MATCHING_MAX_DELAY_SECONDS=120
MATCHING_TIMEOUT_SECONDS=60

# Raio de Busca
MATCHING_EXPAND_RADIUS_KM=1
MATCHING_MAX_RADIUS_KM=15
```

---

## 🧪 Testes

### Rodando Testes

```bash
npm test -- tests/matchingAutomation.test.ts

# Com cobertura
npm test -- --coverage tests/matchingAutomation.test.ts
```

### Casos de Teste

✅ `Should start matching automation` - Iniciar automação  
✅ `Should publish MATCHING_STARTED event` - Evento de início  
✅ `Should pause and resume automation` - Pause/Resume  
✅ `Should expand radius on failed attempts` - Expansão de raio  
✅ `Should record driver rejection` - Rejeição  
✅ `Integration: Full matching flow with success` - Fluxo completo  
✅ `JobScheduler: Schedule and execute` - Job scheduling  
✅ `JobScheduler: Pause and resume` - Pause/Resume jobs  

---

## 📈 Monitoramento e Logging

### Logs Automáticos

```
[INFO] MatchingAutomationService initialized
[INFO] Matching automation started { rideId, passengerId, initialRadiusKm }
[INFO] Scheduling matching attempt { rideId, attempt, delayMs, radiusKm }
[INFO] MatchingJob executing { jobId, rideId, attempt, radiusKm }
[INFO] MatchingJob: Driver found { jobId, rideId, driverId, radiusKm }
[INFO] Driver matched and assigned { rideId, driverId, attemptNumber }
[INFO] Driver rejected { rideId, driverId, totalRejected }
[ERROR] Matching failed { rideId, reason, attemptNumber, radiusKm }
```

### Endpoints de Debug (Admin)

```
GET /api/admin/automation/:rideId
  → Retorna estado de automação
  Response: {
    rideId,
    passengerId,
    currentAttempt,
    status,
    currentRadiusKm,
    rejectedDrivers: string[],
    nextRetryAt?: Date
  }

GET /api/admin/jobs
  → Retorna todos os jobs agendados
  Response: {
    pending: ScheduledJob[],
    running: ScheduledJob[],
    completed: ScheduledJob[]
  }
```

---

## 🚀 Deployment

### Em Produção

1. **Validar configurações**
   ```bash
   npm run validate-config
   ```

2. **Iniciar servidor**
   ```bash
   npm start
   ```

3. **Monitorar jobs**
   - Dashboard de jobs em `/metrics/jobs`
   - Alertas se retry % > 20%

4. **Graceful shutdown**
   ```typescript
   process.on('SIGTERM', async () => {
     await appService.destroy();
     server.close();
   });
   ```

---

## 📝 Próximas Etapas

**ETAPA 3 - Timeout Handling:**
- Driver accept timeout (30s)
- Matching timeout avançado (com countdown)
- Ride inactivity timeout (5m)
- Cleanup jobs para rides expiradas

---

## 📚 Referências

- [Models/Matching.ts](src/models/Matching.ts) - Tipos
- [Jobs/JobScheduler.ts](src/jobs/JobScheduler.ts) - Scheduler
- [Jobs/MatchingJob.ts](src/jobs/MatchingJob.ts) - Job de matching
- [Services/MatchingAutomationService.ts](src/services/MatchingAutomationService.ts) - Serviço
- [Tests/matchingAutomation.test.ts](tests/matchingAutomation.test.ts) - Testes

---

**✅ ETAPA 2 - Matching Automation COMPLETA!**
