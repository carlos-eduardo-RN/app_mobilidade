# ETAPA 2 - Debug & Observabilidade

## 🔍 Tools de Debug

### 1. Logger Estruturado

```typescript
// ✅ BOM: Logging com contexto
Logger.info('Matching attempt started', {
  rideId,
  attempt: 2,
  radiusKm: 4,
  strategy: 'EXPONENTIAL',
  timestamp: new Date().toISOString(),
});

// ✅ BOM: Diferentes níveis
Logger.debug('Detailed info for dev');    // DEBUG
Logger.info('Important business event');   // INFO
Logger.warn('Potentially problematic');    // WARN
Logger.error('Error occurred', error);     // ERROR

// Filtrar por nível
Logger.setLevel('DEBUG');   // Show all
Logger.setLevel('INFO');    // Hide DEBUG
Logger.setLevel('WARN');    // Hide DEBUG, INFO
Logger.setLevel('ERROR');   // Only errors
```

### 2. Rastreamento de Corridas

```typescript
// Estrutura de logs por rideId
async function debugRide(rideId: string, appService: ApplicationService) {
  console.log(`\n=== DEBUG: Ride ${rideId} ===\n`);

  // 1. Estado atual da corrida
  const ride = await appService.rideService.getRideById(rideId);
  console.log('Corrida:', {
    id: ride.id,
    status: ride.status,
    passengerId: ride.passengerId,
    driverId: ride.driverId,
    createdAt: ride.createdAt,
    lastStatusUpdate: ride.lastStatusUpdate,
  });

  // 2. Histórico de status
  console.log('\nHistórico de Status:');
  for (const change of ride.statusHistory) {
    console.log(`  ${change.timestamp.toISOString()} │ ${change.status}`);
    if (change.reason) console.log(`    Motivo: ${change.reason}`);
  }

  // 3. Estado de automação
  const automationState =
    appService.matchingAutomationService.getAutomationState(rideId);
  if (automationState) {
    console.log('\nAutomação:', {
      status: automationState.status,
      currentAttempt: automationState.currentAttempt,
      currentRadiusKm: automationState.currentRadiusKm,
      rejectedDriverIds: Array.from(automationState.rejectedDriverIds),
      nextRetryAt: automationState.nextRetryAt,
    });
  } else {
    console.log('\nAutomação: Nenhuma em andamento');
  }

  // 4. Jobs relacionados
  const pendingJobs = appService.jobScheduler.getPendingJobs();
  const rideJobs = pendingJobs.filter((job) =>
    job.tags?.includes(`matching-${rideId}`)
  );
  console.log(`\nJobs Agendados: ${rideJobs.length}`);
  for (const job of rideJobs) {
    console.log(`  ${job.jobId}:`);
    console.log(`    Status: ${job.status}`);
    console.log(`    Agendado para: ${job.scheduledFor}`);
    console.log(`    Tentativa: ${job.attempt}/${job.maxRetries}`);
  }

  // 5. Eventos da corrida
  const events = appService.matchingAutomationService['deps'].eventPublisher
    .getEventHistoryFor(rideId);
  console.log(`\nEventos: ${events.length}`);
  for (const event of events.slice(-5)) {
    // Últimos 5
    console.log(`  ${event.timestamp} │ ${event.eventType}`);
  }
}

// Uso:
await debugRide('ride-123', appService);
```

### 3. Rastreamento de Motorista

```typescript
async function debugDriver(driverId: string, appService: ApplicationService) {
  console.log(`\n=== DEBUG: Driver ${driverId} ===\n`);

  // 1. Status do motorista
  const driverStatus = await appService.driverService.getDriverStatus(driverId);
  console.log('Status:', {
    status: driverStatus.status,
    currentRideId: driverStatus.currentRideId,
    lastUpdatedAt: driverStatus.lastUpdatedAt,
  });

  // 2. Localização atual
  const location = await appService.driverService.getDriverLocation(driverId);
  console.log('Localização:', {
    latitude: location.latitude,
    longitude: location.longitude,
    accuracy: location.accuracy,
    bearing: location.bearing,
    speed: location.speed,
  });

  // 3. Corridas ativas
  const rides = await appService.rideService.listRidesByDriver(driverId);
  console.log(`\nCorridas: ${rides.length}`);
  for (const ride of rides.filter((r) => !['FINISHED', 'CANCELLED'].includes(r.status))) {
    console.log(`  ${ride.id}:`);
    console.log(`    Status: ${ride.status}`);
    console.log(`    Passageiro: ${ride.passengerId}`);
  }
}

await debugDriver('driver-123', appService);
```

---

## 📊 Endpoints de Observabilidade

### Admin Endpoints (Implementar)

```typescript
// GET /api/admin/automation/:rideId
// Retorna estado de automação
router.get('/admin/automation/:rideId', authMiddleware, async (req, res) => {
  const { rideId } = req.params;
  
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const state = appService.matchingAutomationService.getAutomationState(rideId);
  
  if (!state) {
    return res.status(404).json({ error: 'Automation state not found' });
  }

  res.json({
    rideId: state.rideId,
    passengerId: state.passengerId,
    status: state.status,
    currentAttempt: state.currentAttempt,
    currentRadiusKm: state.currentRadiusKm,
    rejectedDriverIds: Array.from(state.rejectedDriverIds),
    nextRetryAt: state.nextRetryAt,
    createdAt: state.createdAt,
    uptime: Date.now() - state.createdAt.getTime(),
  });
});

// GET /api/admin/jobs
// Lista jobs pendentes
router.get('/admin/jobs', authMiddleware, async (req, res) => {
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const jobs = appService.jobScheduler.getPendingJobs();

  res.json({
    totalPending: jobs.length,
    byStatus: {
      pending: jobs.filter((j) => j.status === 'PENDING').length,
      running: jobs.filter((j) => j.status === 'RUNNING').length,
      retrying: jobs.filter((j) => j.status === 'RETRYING').length,
    },
    jobs: jobs.map((j) => ({
      jobId: j.jobId,
      status: j.status,
      attempt: j.attempt,
      maxRetries: j.maxRetries,
      scheduledFor: j.scheduledFor,
      tags: j.tags,
    })),
  });
});

// GET /api/admin/metrics/matching
// Métricas de matching
router.get('/admin/metrics/matching', authMiddleware, async (req, res) => {
  // Calcular e retornar métricas
  const metrics = calculateMatchingMetrics();
  res.json(metrics);
});
```

---

## 🎯 Simulação de Cenários

### Script de Teste Completo

```typescript
// tests/debugScenarios.ts

export async function testScenario1_SuccessfulMatch(
  appService: ApplicationService
) {
  console.log('\n=== CENÁRIO 1: Matching com Sucesso ===\n');

  const passengerId = 'passenger-test-1';
  const driverId = 'driver-test-1';

  // 1. Criar passageiro e motorista
  const passenger = await appService.userService.createUser({
    name: 'Passageiro Teste 1',
    email: 'passenger1@test.com',
    phone: '+5511999999999',
    role: 'PASSENGER',
  });

  const driver = await appService.userService.createUser({
    name: 'Motorista Teste 1',
    email: 'driver1@test.com',
    phone: '+5511988888888',
    role: 'DRIVER',
  });

  // 2. Colocar motorista online
  await appService.driverService.setDriverOnline(driver.id);
  await appService.driverService.updateDriverLocation(driver.id, {
    latitude: -23.55,
    longitude: -46.63,
    accuracy: 10,
  });

  // 3. Criar corrida
  const ride = await appService.rideService.createRide({
    passengerId: passenger.id,
    pickupLocation: {
      latitude: -23.5505,
      longitude: -46.6333,
    },
    dropoffLocation: {
      latitude: -23.55,
      longitude: -46.63,
    },
  });

  console.log(`✓ Corrida criada: ${ride.id}`);

  // 4. Iniciar automação
  await appService.rideService.startAutomatedMatching(ride.id);
  await appService.matchingAutomationService.startAutomation(
    ride.id,
    passenger.id,
    3
  );

  console.log(`✓ Automação iniciada`);

  // 5. Aguardar resultado
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // 6. Verificar resultado
  const finalRide = await appService.rideService.getRideById(ride.id);
  console.log(`✓ Status final: ${finalRide.status}`);
  console.log(`✓ Motorista atribuído: ${finalRide.driverId}`);

  // 7. Debug info
  await debugRide(ride.id, appService);

  return { ride, passenger, driver };
}

export async function testScenario2_DriverRejection(
  appService: ApplicationService
) {
  console.log('\n=== CENÁRIO 2: Rejeição de Motorista ===\n');

  const { ride, passenger, driver } = await testScenario1_SuccessfulMatch(
    appService
  );

  // Motorista rejeita
  console.log(`\n⏳ Motorista ${driver.id} rejeitando corrida...`);

  await appService.rideService.recordDriverRejection(ride.id, driver.id);
  await appService.matchingAutomationService.handleDriverRejected(
    ride.id,
    driver.id
  );

  console.log(`✓ Rejeição registrada`);

  // Aguardar reatribuição
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Verificar se foi reatribuído
  const updatedRide = await appService.rideService.getRideById(ride.id);
  console.log(`✓ Status: ${updatedRide.status}`);

  await debugRide(ride.id, appService);
}

export async function testScenario3_NoDriversAvailable(
  appService: ApplicationService
) {
  console.log('\n=== CENÁRIO 3: Sem Motoristas ===\n');

  const passenger = await appService.userService.createUser({
    name: 'Passageiro Sem Motorista',
    email: 'passenger-lonely@test.com',
    phone: '+5511977777777',
    role: 'PASSENGER',
  });

  // Criar corrida SEM motorista online
  const ride = await appService.rideService.createRide({
    passengerId: passenger.id,
    pickupLocation: {
      latitude: -23.5505,
      longitude: -46.6333,
    },
    dropoffLocation: {
      latitude: -23.55,
      longitude: -46.63,
    },
  });

  console.log(`✓ Corrida criada sem motoristas: ${ride.id}`);

  // Iniciar automação
  await appService.rideService.startAutomatedMatching(ride.id);
  await appService.matchingAutomationService.startAutomation(
    ride.id,
    passenger.id,
    3
  );

  // Aguardar timeout
  console.log('⏳ Aguardando timeout (60s)...');
  await new Promise((resolve) => setTimeout(resolve, 65000));

  // Verificar se foi cancelada
  const finalRide = await appService.rideService.getRideById(ride.id);
  console.log(`✓ Status final: ${finalRide.status}`);
  console.log(`✓ Motivo: ${finalRide.cancelReason}`);

  await debugRide(ride.id, appService);
}
```

---

## 🐛 Common Issues e Soluções

### Issue 1: Logs não aparecem

```bash
# ✅ Solução: Verificar log level
LOG_LEVEL=DEBUG npm start

# ✅ Verificar no código
Logger.setLevel('DEBUG');

# ✅ Usar console.log para debug imediato
console.log('Debug info:', data);  // Aparece independente do level
```

### Issue 2: Estado fica congelado

```typescript
// ✅ Verificar se automation está paused
const state = appService.matchingAutomationService.getAutomationState(rideId);
if (state?.status === 'PAUSED') {
  console.log('⚠️ Automation is paused');
  appService.matchingAutomationService.resumeAutomation(rideId);
}

// ✅ Verificar se scheduler está pausado
// (não há método público, mas pode verificar nos logs)
```

### Issue 3: Memory leak suspeito

```typescript
// ✅ Limpar estados de teste
beforeEach(() => {
  const allRides = appService.rideRepository.findAll();
  for (const ride of allRides) {
    appService.matchingAutomationService.cleanupAutomationState(ride.id);
  }
});

// ✅ Limpar scheduler em shutdown
process.on('SIGTERM', async () => {
  await appService.jobScheduler.destroy();
});
```

---

## 📈 Monitoramento de Produção

### Health Check

```typescript
app.get('/health', (req, res) => {
  const health = {
    status: 'OK',
    timestamp: new Date(),
    services: {
      jobScheduler: {
        pendingJobs: appService.jobScheduler.getPendingJobs().length,
        status: 'OK',
      },
      eventPublisher: {
        eventCount: appService.matchingAutomationService['deps'].eventPublisher.getEventHistory()
          .length,
        status: 'OK',
      },
    },
    warnings: [] as string[],
  };

  // Alertar se muitos jobs pendentes
  if (health.services.jobScheduler.pendingJobs > 1000) {
    health.warnings.push('Too many pending jobs');
  }

  // Alertar se muitos eventos
  if (health.services.eventPublisher.eventCount > 10000) {
    health.warnings.push('Event history too large');
  }

  const statusCode = health.warnings.length > 0 ? 200 : 200; // Always 200 for health
  res.status(statusCode).json(health);
});
```

### Alertas

```typescript
function checkMetrics(metrics: MatchingMetrics) {
  const alerts: string[] = [];

  if (metrics.failureRate > 0.2) {
    alerts.push(`❌ High failure rate: ${metrics.failureRate.toFixed(2)}`);
  }

  if (metrics.rejectionRate > 0.1) {
    alerts.push(`⚠️ High rejection rate: ${metrics.rejectionRate.toFixed(2)}`);
  }

  if (metrics.averageTimeToMatch > 45) {
    alerts.push(`⏱️ Slow matching: ${metrics.averageTimeToMatch.toFixed(0)}s`);
  }

  if (alerts.length > 0) {
    Logger.error('ALERTS', { alerts });
    // Enviar para sistema de alertas (PagerDuty, Slack, etc)
  }

  return alerts;
}
```

---

## 🎬 Exemplo Completo de Debugging

```typescript
async function fullDebug(rideId: string, appService: ApplicationService) {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║  FULL DEBUG REPORT                     ║');
  console.log('╚════════════════════════════════════════╝\n');

  // 1. Ride Info
  const ride = await appService.rideService.getRideById(rideId);
  console.log('📍 CORRIDA');
  console.log(`   ID: ${ride.id}`);
  console.log(`   Status: ${ride.status}`);
  console.log(`   Passageiro: ${ride.passengerId}`);
  console.log(`   Motorista: ${ride.driverId || 'não atribuído'}`);
  console.log(`   Criada há: ${Date.now() - ride.createdAt.getTime()}ms`);

  // 2. Automation State
  const state = appService.matchingAutomationService.getAutomationState(rideId);
  if (state) {
    console.log('\n⚙️  AUTOMAÇÃO');
    console.log(`   Status: ${state.status}`);
    console.log(`   Tentativa: ${state.currentAttempt}`);
    console.log(`   Raio: ${state.currentRadiusKm}km`);
    console.log(`   Motoristas rejeitados: ${state.rejectedDriverIds.size}`);
    console.log(`   Próxima retry: ${state.nextRetryAt}`);
  }

  // 3. Jobs
  const jobs = appService.jobScheduler.getPendingJobs();
  console.log('\n🔧 JOBS');
  console.log(`   Total pendentes: ${jobs.length}`);
  for (const job of jobs.filter((j) => j.tags?.includes(`matching-${rideId}`))) {
    console.log(`   - ${job.jobId.slice(0, 8)}... ${job.status}`);
  }

  // 4. Events
  const events = appService.matchingAutomationService['deps'].eventPublisher
    .getEventHistoryFor(rideId);
  console.log('\n📣 EVENTOS');
  for (const event of events.slice(-5)) {
    console.log(`   - ${event.eventType}`);
  }

  // 5. Recommendations
  console.log('\n💡 RECOMENDAÇÕES');
  if (state?.status === 'IN_PROGRESS' && Date.now() - state.createdAt.getTime() > 60000) {
    console.log('   ⚠️  Automação rodando há mais de 1 minuto');
  }
  if (jobs.length > 100) {
    console.log('   ⚠️  Muitos jobs pendentes');
  }
}

await fullDebug('ride-123', appService);
```

---

**Debug tools pronto! Agora você tem visibilidade total do que está acontecendo! 🔍**
