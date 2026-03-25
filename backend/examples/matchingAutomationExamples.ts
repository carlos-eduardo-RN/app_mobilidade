/**
 * ETAPA 2 - Exemplos Práticos de Uso
 * Demonstra como usar a Matching Automation em diferentes cenários
 */

// ============================================================
// EXEMPLO 1: Iniciar Automação Básica
// ============================================================

import { ApplicationService } from '../src/services/ApplicationService';
import { EventType, DomainEvent } from '../src/models/Events';

async function exemplo1_BasicAutomation(appService: ApplicationService) {
  console.log('\n=== EXEMPLO 1: Automação Básica ===\n');

  const rideId = 'ride-123';
  const passengerId = 'passenger-456';

  // 1. Passageiro cria uma corrida
  const ride = await appService.rideService.createRide({
    passengerId,
    pickupLocation: {
      latitude: -23.5505,
      longitude: -46.6333, // Av. Paulista, São Paulo
    },
    dropoffLocation: {
      latitude: -23.55,
      longitude: -46.63, // Próximo
    },
  });

  console.log(`✓ Corrida criada: ${ride.id}`);
  console.log(`  Status: ${ride.status}`);

  // 2. Iniciar automação de matching
  await appService.rideService.startAutomatedMatching(ride.id);
  console.log(`✓ Automação iniciada`);

  // 3. Começar busca automática
  await appService.matchingAutomationService.startAutomation(
    ride.id,
    passengerId,
    3 // raio inicial: 3km
  );

  console.log(`✓ Matching automation começou`);
  console.log(`  Raio inicial: 3km`);
  console.log(`  Estratégia: EXPONENTIAL`);
  console.log(`  Max tentativas: 4`);

  // 4. Monitorar estado
  const state = appService.matchingAutomationService.getAutomationState(ride.id);
  console.log(`\n✓ Estado atual:`);
  console.log(`  Status: ${state?.status}`);
  console.log(`  Tentativas: ${state?.currentAttempt}`);
  console.log(`  Raio: ${state?.currentRadiusKm}km`);
  console.log(`  Motoristas rejeitados: ${state?.rejectedDriverIds.size}`);

  return ride.id;
}

// ============================================================
// EXEMPLO 2: Cenário com Sucesso
// ============================================================

async function exemplo2_SuccessfulMatching(
  appService: ApplicationService,
  rideId: string
) {
  console.log('\n=== EXEMPLO 2: Matching com Sucesso ===\n');

  // Simular encontro de motorista após 2 tentativas
  console.log('⏳ Aguardando resultado de matching...');
  await new Promise((resolve) => setTimeout(resolve, 5000));

  const state = appService.matchingAutomationService.getAutomationState(rideId);

  if (state?.status === 'MATCHED') {
    console.log('✓ Motorista encontrado!');
    console.log(`  Tentativas realizadas: ${state.currentAttempt}`);
    console.log(`  Raio final: ${state.currentRadiusKm}km`);
    console.log(`  Status: ${state.status}`);

    const result = appService.matchingAutomationService.getAutomationResult(
      rideId
    );
    console.log(`\n✓ Resultado:`);
    console.log(`  Matched: ${result?.matched}`);
    console.log(`  Duracao: ${result?.totalDurationSeconds}s`);
  } else {
    console.log(`⏳ Ainda buscando... Status: ${state?.status}`);
  }
}

// ============================================================
// EXEMPLO 3: Rejeição de Motorista e Reatribuição
// ============================================================

async function exemplo3_DriverRejection(
  appService: ApplicationService,
  rideId: string
) {
  console.log('\n=== EXEMPLO 3: Rejeição e Reatribuição ===\n');

  const stateBefore = appService.matchingAutomationService.getAutomationState(
    rideId
  );
  console.log(`✓ Estado anterior:`);
  console.log(`  Status: ${stateBefore?.status}`);
  console.log(`  Tentativas: ${stateBefore?.currentAttempt}`);
  console.log(`  Motoristas rejeitados: ${stateBefore?.rejectedDriverIds.size}`);

  // Simular rejeição de motorista
  const driverId = 'driver-rejected-123';
  console.log(`\n⏳ Motorista ${driverId} rejeita corrida...`);

  await appService.matchingAutomationService.handleDriverRejected(
    rideId,
    driverId
  );

  console.log(`✓ Rejeição registrada`);

  const stateAfter = appService.matchingAutomationService.getAutomationState(
    rideId
  );
  console.log(`\n✓ Estado posterior:`);
  console.log(`  Status: ${stateAfter?.status}`);
  console.log(`  Tentativas: ${stateAfter?.currentAttempt}`);
  console.log(`  Motoristas rejeitados: ${stateAfter?.rejectedDriverIds.size}`);
  console.log(`  Próxima tentativa em: ${stateAfter?.nextRetryAt}`);
}

// ============================================================
// EXEMPLO 4: Monitorar com Subscribers
// ============================================================

async function exemplo4_EventSubscribers(appService: ApplicationService) {
  console.log('\n=== EXEMPLO 4: Monitorar Eventos ===\n');

  const rideId = 'ride-456';

  // Subscrever a eventos
  appService.matchingAutomationService['deps'].eventPublisher.subscribe(
    EventType.MATCHING_STARTED,
    {
      handle: async (event: DomainEvent) => {
        console.log(`📣 [MATCHING_STARTED]`);
        console.log(`   Ride: ${event.data.passengerId}`);
        console.log(`   Raio inicial: ${event.data.initialRadiusKm}km`);
      }
    }
  );

  appService.matchingAutomationService['deps'].eventPublisher.subscribe(
    EventType.MATCHING_ATTEMPT,
    {
      handle: async (event: DomainEvent) => {
        console.log(`📣 [MATCHING_ATTEMPT]`);
        console.log(`   Tentativa: ${event.data.attemptNumber}`);
        console.log(`   Raio: ${event.data.radiusKm}km`);
      }
    }
  );

  appService.matchingAutomationService['deps'].eventPublisher.subscribe(
    EventType.DRIVER_ASSIGNED,
    {
      handle: async (event: DomainEvent) => {
        console.log(`📣 [DRIVER_ASSIGNED] ✅`);
        console.log(`   Driver: ${event.data.driverId}`);
        console.log(`   Tentativa: ${event.data.attemptNumber}`);
      }
    }
  );

  appService.matchingAutomationService['deps'].eventPublisher.subscribe(
    EventType.MATCHING_FAILED,
    {
      handle: async (event: DomainEvent) => {
        console.log(`📣 [MATCHING_FAILED] ❌`);
        console.log(`   Motivo: ${event.data.reason}`);
        console.log(`   Tentativas: ${event.data.attemptNumber}`);
      }
    }
  );

  console.log('✓ Subscribers registrados');
  console.log('  Aguarde eventos de matching...');
}

// ============================================================
// EXEMPLO 5: Pause e Resume
// ============================================================

async function exemplo5_PauseResume(
  appService: ApplicationService,
  rideId: string
) {
  console.log('\n=== EXEMPLO 5: Pause e Resume ===\n');

  let state = appService.matchingAutomationService.getAutomationState(rideId);
  console.log(`✓ Status inicial: ${state?.status}`);

  // Pausar automação
  const paused = appService.matchingAutomationService.pauseAutomation(rideId);
  console.log(`✓ Pause executado: ${paused}`);

  state = appService.matchingAutomationService.getAutomationState(rideId);
  console.log(`  Status: ${state?.status}`);

  // Aguardar
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Retomar automação
  const resumed = appService.matchingAutomationService.resumeAutomation(rideId);
  console.log(`\n✓ Resume executado: ${resumed}`);

  state = appService.matchingAutomationService.getAutomationState(rideId);
  console.log(`  Status: ${state?.status}`);
}

// ============================================================
// EXEMPLO 6: Job Scheduler - Estado dos Jobs
// ============================================================

async function exemplo6_JobSchedulerStatus(appService: ApplicationService) {
  console.log('\n=== EXEMPLO 6: Job Scheduler Status ===\n');

  const pendingStatuses = appService.jobScheduler.getPendingJobs();

  console.log(`✓ Jobs Pendentes: ${pendingStatuses.length}`);

  for (const status of pendingStatuses) {
    console.log(`\n  Status: ${status}`);
  }

  if (pendingStatuses.length === 0) {
    console.log('\n  Nenhum job pendente');
  }
}

// ============================================================
// EXEMPLO 7: Cleanup e Shutdown
// ============================================================

async function exemplo7_CleanupShutdown(appService: ApplicationService) {
  console.log('\n=== EXEMPLO 7: Cleanup e Shutdown ===\n');

  // Limpar estado de automação
  console.log('⏳ Limpando estados de automação...');
  appService.matchingAutomationService.cleanupAutomationState('ride-123');
  console.log('✓ Estado de automação limpo');

  // Destruir aplicação
  console.log('\n⏳ Encerrando ApplicationService...');
  await appService.destroy();
  console.log('✓ ApplicationService destruído');

  console.log('\n✓ Shutdown completo');
}

// ============================================================
// EXEMPLO 8: Diferentes Estratégias de Retry
// ============================================================

async function exemplo8_RetryStrategies(appService: ApplicationService) {
  console.log('\n=== EXEMPLO 8: Estratégias de Retry ===\n');

  const strategies = ['LINEAR', 'EXPONENTIAL', 'FIBONACCI'];
  const maxAttempts = 4;

  for (const strategy of strategies) {
    console.log(`\n📊 Estratégia: ${strategy}`);
    console.log('   Tentativa │ Delay  │ Acumulado');
    console.log('   ──────────────────────────────');

    let accumulated = 0;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      let delay: number;

      if (strategy === 'LINEAR') {
        delay = 15 * attempt;
      } else if (strategy === 'EXPONENTIAL') {
        delay = 15 * Math.pow(2, attempt - 1);
      } else {
        // FIBONACCI
        const fib = [1, 1, 2, 3, 5][attempt - 1] || 5;
        delay = 15 * fib;
      }

      delay = Math.min(delay, 120); // max 120s
      accumulated += delay;

      console.log(
        `       ${attempt}      │ ${delay.toString().padStart(3)}s  │ ${accumulated}s`
      );
    }
  }
}

// ============================================================
// EXEMPLO 9: Fluxo Completo Simulado
// ============================================================

async function exemplo9_CompleteFlow(appService: ApplicationService) {
  console.log('\n=== EXEMPLO 9: Fluxo Completo Simulado ===\n');

  const rideId = 'ride-complete-flow';
  const passengerId = 'passenger-sim';
  const driverId1 = 'driver-sim-1';
  const driverId2 = 'driver-sim-2';

  console.log('📍 PASSO 1: Passageiro cria corrida');
  const ride = await appService.rideService.createRide({
    passengerId,
    pickupLocation: { latitude: -23.5505, longitude: -46.6333 },
    dropoffLocation: { latitude: -23.55, longitude: -46.63 },
  });
  console.log(`   ✓ Corrida criada: ${ride.id}`);

  console.log('\n📍 PASSO 2: Passageiro inicia matching');
  await appService.rideService.startAutomatedMatching(ride.id);
  await appService.matchingAutomationService.startAutomation(
    ride.id,
    passengerId,
    3
  );
  console.log(`   ✓ Automação iniciada`);

  console.log('\n📍 PASSO 3: Aguardar tentativa 1');
  await new Promise((resolve) => setTimeout(resolve, 1000));
  let state = appService.matchingAutomationService.getAutomationState(ride.id);
  console.log(`   ✓ Tentativa 1 executada, sem motoristas`);
  console.log(`     Raio: ${state?.currentRadiusKm}km`);

  console.log('\n📍 PASSO 4: Aguardar tentativa 2');
  await new Promise((resolve) => setTimeout(resolve, 2000));
  state = appService.matchingAutomationService.getAutomationState(ride.id);
  console.log(`   ✓ Tentativa 2 executada, motorista encontrado!`);
  console.log(`     Raio: ${state?.currentRadiusKm}km`);
  console.log(`     Status: ${state?.status}`);

  console.log('\n✓ Fluxo completo finalizado');
}

// ============================================================
// EXEMPLO 10: Tratamento de Erros
// ============================================================

async function exemplo10_ErrorHandling(appService: ApplicationService) {
  console.log('\n=== EXEMPLO 10: Tratamento de Erros ===\n');

  try {
    console.log('🔴 Tentando acessar corrida inexistente...');
    await appService.rideService.getRideById('ride-nao-existe');
  } catch (error: any) {
    console.log(`✓ Erro capturado: ${error.message}`);
    console.log(`  Tipo: ${error.constructor.name}`);
  }

  try {
    console.log('\n🔴 Tentando fazer matching inválido...');
    await appService.rideService.startAutomatedMatching('ride-nao-existe');
  } catch (error: any) {
    console.log(`✓ Erro capturado: ${error.message}`);
    console.log(`  Código: ${error.code}`);
  }

  console.log('\n✓ Tratamento de erros funcionando');
}

// ============================================================
// Exportar todos os exemplos
// ============================================================

export {
  exemplo1_BasicAutomation,
  exemplo2_SuccessfulMatching,
  exemplo3_DriverRejection,
  exemplo4_EventSubscribers,
  exemplo5_PauseResume,
  exemplo6_JobSchedulerStatus,
  exemplo7_CleanupShutdown,
  exemplo8_RetryStrategies,
  exemplo9_CompleteFlow,
  exemplo10_ErrorHandling,
};
