/**
 * ETAPA 3 - Timeout System: Exemplos Práticos
 * 15+ exemplos completos de código prontos para usar
 */

import { TimeoutManager } from '../src/jobs/TimeoutManager';
import { TimeoutType, TimeoutEventListener } from '../src/models/Timeout';
import { DriverAcceptTimeoutFactory } from '../src/jobs/DriverAcceptTimeout';
import { RideInactivityTimeoutFactory } from '../src/jobs/RideInactivityTimeout';

/**
 * Exemplo 1: Timeout Básico
 * O caso de uso mais simples: iniciar e esperar expirar
 */
async function example1_BasicTimeout() {
  console.log('📌 Exemplo 1: Timeout Básico');

  const timeoutManager = new TimeoutManager();

  const result = await timeoutManager.start(
    TimeoutType.DRIVER_ACCEPT,
    'ride-001',
    5000 // 5 segundos
  );

  console.log(`✓ Timeout iniciado: ${result.timeoutId}`);
  console.log(`✓ Status: ${result.state?.status}`);
  console.log(`✓ Expirará em: ${result.state?.expiresAt}`);

  await timeoutManager.destroy();
}

/**
 * Exemplo 2: Cancelar Timeout
 * Cancelar antes de expirar
 */
async function example2_CancelTimeout() {
  console.log('📌 Exemplo 2: Cancelar Timeout');

  const timeoutManager = new TimeoutManager();

  const start = await timeoutManager.start(
    TimeoutType.DRIVER_ACCEPT,
    'ride-002',
    30_000
  );

  console.log(`✓ Timeout iniciado: ${start.timeoutId}`);

  // Cancelar após 2 segundos
  await new Promise(resolve => setTimeout(resolve, 2000));

  const cancel = await timeoutManager.cancel(start.timeoutId, 'driver_accepted');
  console.log(`✓ Cancelado com sucesso`);

  await timeoutManager.destroy();
}

/**
 * Exemplo 3: Estender Timeout
 * Adicionar tempo ao timeout
 */
async function example3_ExtendTimeout() {
  console.log('📌 Exemplo 3: Estender Timeout');

  const timeoutManager = new TimeoutManager();

  const start = await timeoutManager.start(
    TimeoutType.DRIVER_ACCEPT,
    'ride-003',
    5000 // 5 segundos
  );

  console.log(`✓ Timeout inicial: 5000ms`);

  const status1 = timeoutManager.getStatus(start.timeoutId);
  console.log(`✓ Tempo antes de estender: ${status1?.timeRemainingMs}ms`);

  // Estender por 3 segundos
  await timeoutManager.extend({
    timeoutId: start.timeoutId,
    additionalMs: 3000,
    reason: 'Driver solicitou mais tempo'
  });

  const status2 = timeoutManager.getStatus(start.timeoutId);
  console.log(`✓ Tempo após estender: ${status2?.timeRemainingMs}ms`);

  await timeoutManager.destroy();
}

/**
 * Exemplo 4: Event Listeners
 * Reagir a eventos do timeout
 */
async function example4_EventListeners() {
  console.log('📌 Exemplo 4: Event Listeners');

  const timeoutManager = new TimeoutManager();
  const events: string[] = [];

  const listener: TimeoutEventListener = {
    onStarted: async (state) => {
      events.push('started');
      console.log(`✓ onStarted - Timeout iniciado`);
    },

    onExtended: async (state, previousMs) => {
      events.push('extended');
      console.log(`✓ onExtended - Tempo adicionado`);
    },

    onCancelled: async (timeoutId, reason) => {
      events.push('cancelled');
      console.log(`✓ onCancelled - Cancelado: ${reason}`);
    },

    onExpired: async (result) => {
      events.push('expired');
      console.log(`✓ onExpired - Expirou após ${result.totalTimeUsedMs}ms`);
    },

    onCompleted: async (result) => {
      events.push('completed');
      console.log(`✓ onCompleted - Completado: ${result.reason}`);
    }
  };

  const start = await timeoutManager.start(
    TimeoutType.DRIVER_ACCEPT,
    'ride-004',
    2000,
    [listener]
  );

  // Esperar 3 segundos para ver expiração
  await new Promise(resolve => setTimeout(resolve, 3000));

  console.log(`✓ Eventos chamados: ${events.join(', ')}`);

  await timeoutManager.destroy();
}

/**
 * Exemplo 5: Múltiplos Timeouts por Ride
 * Gerenciar vários timeouts de uma corrida
 */
async function example5_MultipleTimeouts() {
  console.log('📌 Exemplo 5: Múltiplos Timeouts');

  const timeoutManager = new TimeoutManager();
  const rideId = 'ride-005';

  // Criar 3 timeouts para diferentes drivers
  const drivers = ['drv-1', 'drv-2', 'drv-3'];
  const timeoutIds: Record<string, string> = {};

  for (const driver of drivers) {
    const result = await timeoutManager.start(
      TimeoutType.DRIVER_ACCEPT,
      rideId,
      10_000
    );
    timeoutIds[driver] = result.timeoutId;
    console.log(`✓ Timeout criado para ${driver}`);
  }

  // Obter todos os timeouts da corrida
  const rideTimeouts = timeoutManager.getRideTimeouts(rideId);
  console.log(`✓ Total de timeouts: ${rideTimeouts.length}`);

  // Cancelar todos
  await timeoutManager.cancelRideTimeouts(rideId, 'driver_found');
  console.log(`✓ Todos os timeouts cancelados`);

  await timeoutManager.destroy();
}

/**
 * Exemplo 6: Driver Accept Timeout
 * Caso específico: timeout de aceitação do driver
 */
async function example6_DriverAcceptTimeout() {
  console.log('📌 Exemplo 6: Driver Accept Timeout');

  const timeoutManager = new TimeoutManager();
  const rideId = 'ride-006';
  const driverId = 'drv-1';

  // Criar listener
  const listener = DriverAcceptTimeoutFactory.createListener(
    rideId,
    driverId,
    {
      onDriverAcceptTimeout: async () => {
        console.log(`✓ Callback: Driver ${driverId} não aceitou em tempo`);
      },
      publishEvent: async (event) => {
        console.log(`✓ Evento: ${event.type} publicado`);
      }
    }
  );

  // Iniciar com 5 segundos (reduzido para demo)
  const result = await timeoutManager.start(
    TimeoutType.DRIVER_ACCEPT,
    rideId,
    5000,
    [listener]
  );

  console.log(`✓ Driver Accept Timeout iniciado`);

  await timeoutManager.destroy();
}

/**
 * Exemplo 7: Ride Inactivity Timeout
 * Caso específico: timeout de inatividade
 */
async function example7_RideInactivityTimeout() {
  console.log('📌 Exemplo 7: Ride Inactivity Timeout');

  const timeoutManager = new TimeoutManager();
  const rideId = 'ride-007';

  // Criar listener
  const listener = RideInactivityTimeoutFactory.createListener(
    rideId,
    {
      onRideInactive: async (rideId, durationMs) => {
        console.log(`✓ Callback: Ride inativa por ${durationMs}ms`);
      },
      publishEvent: async (event) => {
        console.log(`✓ Evento: ${event.type} publicado`);
      }
    }
  );

  // Iniciar com 5 minutos
  const result = await timeoutManager.start(
    TimeoutType.RIDE_INACTIVITY,
    rideId,
    5 * 60 * 1000,
    [listener]
  );

  console.log(`✓ Ride Inactivity Timeout iniciado`);

  await timeoutManager.destroy();
}

/**
 * Exemplo 8: Monitorar Progresso
 * Acompanhar o andamento de um timeout
 */
async function example8_MonitorProgress() {
  console.log('📌 Exemplo 8: Monitorar Progresso');

  const timeoutManager = new TimeoutManager();

  const start = await timeoutManager.start(
    TimeoutType.DRIVER_ACCEPT,
    'ride-008',
    10_000 // 10 segundos
  );

  // Verificar status a cada 2 segundos
  for (let i = 0; i < 3; i++) {
    await new Promise(resolve => setTimeout(resolve, 2000));
    const status = timeoutManager.getStatus(start.timeoutId);
    console.log(`✓ [${i + 1}] Tempo usado: ${status?.timeUsedMs}ms, Restante: ${status?.timeRemainingMs}ms`);
  }

  await timeoutManager.destroy();
}

/**
 * Exemplo 9: Limite de Extensões
 * Mostrar como o sistema respeita máximo de extensões
 */
async function example9_ExtensionLimits() {
  console.log('📌 Exemplo 9: Limite de Extensões');

  const timeoutManager = new TimeoutManager();

  const start = await timeoutManager.start(
    TimeoutType.DRIVER_ACCEPT,
    'ride-009',
    5000
  );

  // DRIVER_ACCEPT tem máximo 2 extensões
  for (let i = 0; i < 4; i++) {
    const result = await timeoutManager.extend({
      timeoutId: start.timeoutId,
      additionalMs: 2000,
      reason: `Extensão ${i + 1}`
    });

    if (result.success) {
      console.log(`✓ Extensão ${i + 1} realizada`);
    } else {
      console.log(`✗ Extensão ${i + 1} falhou: ${result.error}`);
    }
  }

  await timeoutManager.destroy();
}

/**
 * Exemplo 10: Estatísticas
 * Obter métricas do sistema
 */
async function example10_Statistics() {
  console.log('📌 Exemplo 10: Estatísticas');

  const timeoutManager = new TimeoutManager();

  // Criar alguns timeouts
  for (let i = 0; i < 5; i++) {
    await timeoutManager.start(
      TimeoutType.DRIVER_ACCEPT,
      `ride-${i}`,
      10_000
    );
  }

  // Obter estatísticas
  const stats = timeoutManager.getStats();
  console.log(`✓ Total de timeouts: ${stats.totalTimeouts}`);
  console.log(`✓ Total de rides: ${stats.rideCount}`);
  console.log(`✓ Status - PENDING: ${stats.timeoutsByStatus.pending}`);
  console.log(`✓ Status - ACTIVE: ${stats.timeoutsByStatus.active}`);
  console.log(`✓ Status - EXTENDED: ${stats.timeoutsByStatus.extended}`);

  await timeoutManager.destroy();
}

/**
 * Exemplo 11: Cleanup Automático
 * Demonstrar limpeza automática de timeouts expirados
 */
async function example11_AutoCleanup() {
  console.log('📌 Exemplo 11: Cleanup Automático');

  const timeoutManager = new TimeoutManager(2000); // Cleanup a cada 2s

  // Criar timeout que expira rápido
  await timeoutManager.start(
    TimeoutType.DRIVER_ACCEPT,
    'ride-011',
    1000
  );

  console.log(`✓ Timeout criado (expira em 1s)`);

  const stats1 = timeoutManager.getStats();
  console.log(`✓ Antes de expirar: ${stats1.totalTimeouts} timeout(s)`);

  // Esperar expiração + cleanup
  await new Promise(resolve => setTimeout(resolve, 3500));

  const stats2 = timeoutManager.getStats();
  console.log(`✓ Após cleanup: ${stats2.totalTimeouts} timeout(s)`);

  await timeoutManager.destroy();
}

/**
 * Exemplo 12: Adicionar Listener Depois
 * Adicionar listener a um timeout existente
 */
async function example12_AddListenerLater() {
  console.log('📌 Exemplo 12: Adicionar Listener Depois');

  const timeoutManager = new TimeoutManager();

  const start = await timeoutManager.start(
    TimeoutType.DRIVER_ACCEPT,
    'ride-012',
    5000
  );

  console.log(`✓ Timeout criado sem listener`);

  // Adicionar listener depois
  const listener: TimeoutEventListener = {
    onCancelled: async () => {
      console.log(`✓ Listener chamado: Timeout cancelado`);
    }
  };

  const added = timeoutManager.addListener(start.timeoutId, listener);
  console.log(`✓ Listener adicionado: ${added}`);

  await timeoutManager.cancel(start.timeoutId, 'demo');

  await timeoutManager.destroy();
}

/**
 * Exemplo 13: Completar Timeout
 * Completar timeout com sucesso (não expirar)
 */
async function example13_CompleteTimeout() {
  console.log('📌 Exemplo 13: Completar Timeout');

  const timeoutManager = new TimeoutManager();

  const start = await timeoutManager.start(
    TimeoutType.DRIVER_ACCEPT,
    'ride-013',
    30_000
  );

  console.log(`✓ Timeout criado (30s)`);

  // Completar antes de expirar
  const complete = await timeoutManager.complete(
    start.timeoutId,
    'match_found'
  );

  console.log(`✓ Timeout completado com sucesso`);

  await timeoutManager.destroy();
}

/**
 * Exemplo 14: Isolamento de Rides
 * Verificar isolamento entre rides
 */
async function example14_RideIsolation() {
  console.log('📌 Exemplo 14: Isolamento de Rides');

  const timeoutManager = new TimeoutManager();

  // Criar timeouts para múltiplas rides
  const rideIds = ['ride-14a', 'ride-14b', 'ride-14c'];
  const timeoutsByRide: Record<string, string> = {};

  for (const rideId of rideIds) {
    const result = await timeoutManager.start(
      TimeoutType.DRIVER_ACCEPT,
      rideId,
      10_000
    );
    timeoutsByRide[rideId] = result.timeoutId;
  }

  // Cancelar apenas uma ride
  await timeoutManager.cancelRideTimeouts(rideIds[0], 'demo');

  // Verificar isolamento
  for (const rideId of rideIds) {
    const timeouts = timeoutManager.getRideTimeouts(rideId);
    console.log(`✓ ${rideId}: ${timeouts.length} timeout(s)`);
  }

  await timeoutManager.destroy();
}

/**
 * Exemplo 15: Erro Handling
 * Lidar com erros em callbacks
 */
async function example15_ErrorHandling() {
  console.log('📌 Exemplo 15: Erro Handling');

  const timeoutManager = new TimeoutManager();

  const listener: TimeoutEventListener = {
    onStarted: async () => {
      throw new Error('Erro simulado no listener');
    }
  };

  // Mesmo com erro no listener, timeout é criado
  const result = await timeoutManager.start(
    TimeoutType.DRIVER_ACCEPT,
    'ride-015',
    5000,
    [listener]
  );

  console.log(`✓ Timeout criado mesmo com erro no listener`);
  console.log(`✓ Success: ${result.success}`);
  console.log(`✓ TimeoutId: ${result.timeoutId}`);

  await timeoutManager.destroy();
}

// ============================================================
// EXECUÇÃO DOS EXEMPLOS
// ============================================================

async function runAllExamples() {
  console.log('🚀 ETAPA 3 - EXEMPLOS DE TIMEOUT\n');
  console.log('════════════════════════════════════════════════════════\n');

  try {
    await example1_BasicTimeout();
    console.log();
    
    await example2_CancelTimeout();
    console.log();
    
    await example3_ExtendTimeout();
    console.log();
    
    await example4_EventListeners();
    console.log();
    
    await example5_MultipleTimeouts();
    console.log();
    
    await example6_DriverAcceptTimeout();
    console.log();
    
    await example7_RideInactivityTimeout();
    console.log();
    
    await example8_MonitorProgress();
    console.log();
    
    await example9_ExtensionLimits();
    console.log();
    
    await example10_Statistics();
    console.log();
    
    await example11_AutoCleanup();
    console.log();
    
    await example12_AddListenerLater();
    console.log();
    
    await example13_CompleteTimeout();
    console.log();
    
    await example14_RideIsolation();
    console.log();
    
    await example15_ErrorHandling();
    
    console.log('\n════════════════════════════════════════════════════════');
    console.log('✅ Todos os exemplos executados com sucesso!\n');
  } catch (err) {
    console.error('❌ Erro ao executar exemplos:', err);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  runAllExamples().catch(console.error);
}

export {
  example1_BasicTimeout,
  example2_CancelTimeout,
  example3_ExtendTimeout,
  example4_EventListeners,
  example5_MultipleTimeouts,
  example6_DriverAcceptTimeout,
  example7_RideInactivityTimeout,
  example8_MonitorProgress,
  example9_ExtensionLimits,
  example10_Statistics,
  example11_AutoCleanup,
  example12_AddListenerLater,
  example13_CompleteTimeout,
  example14_RideIsolation,
  example15_ErrorHandling,
  runAllExamples
};
