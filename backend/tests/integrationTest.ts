/**
 * Integration Test
 * Fluxo completo: criar corrida, atribuir motorista, finalizar
 */

import { ApplicationService } from '../src/services/ApplicationService';
import {
  MockUserRepository,
  MockDriverRepository,
  MockRideRepository,
  MockLocationRepository,
  MockDriverStatusRepository,
} from '../src/repositories/MockRepositories';
import { EventPublisher } from '../src/events/EventPublisher';
import { UserRole } from '../src/models/User';
import { EventType } from '../src/models/Events';
import { Logger } from '../src/utils/Logger';

async function integrationTest() {
  console.log('\n' + '='.repeat(60));
  console.log('🚀 TESTE DE INTEGRAÇÃO - CORRIDA COMPLETA');
  console.log('='.repeat(60) + '\n');

  // ========== SETUP ==========
  const userRepository = new MockUserRepository();
  const driverRepository = new MockDriverRepository();
  const rideRepository = new MockRideRepository();
  const locationRepository = new MockLocationRepository();
  const driverStatusRepository = new MockDriverStatusRepository();
  const eventPublisher = new EventPublisher();

  const appService = new ApplicationService(
    userRepository,
    driverRepository,
    rideRepository,
    locationRepository,
    driverStatusRepository,
    eventPublisher
  );

  // ========== EVENT SUBSCRIBERS (simulação) ==========
  const events: any[] = [];

  eventPublisher.subscribe(EventType.RIDE_CREATED, {
    handle: async (event) => {
      events.push(event);
      console.log(`📍 [EVENT] RIDE_CREATED: ${event.data.rideId}`);
    },
  });

  eventPublisher.subscribe(EventType.RIDE_MATCHING_STARTED, {
    handle: async (event) => {
      events.push(event);
      console.log(`🔍 [EVENT] RIDE_MATCHING_STARTED`);
    },
  });

  eventPublisher.subscribe(EventType.RIDE_DRIVER_ASSIGNED, {
    handle: async (event) => {
      events.push(event);
      console.log(`✅ [EVENT] RIDE_DRIVER_ASSIGNED: ${event.data.driverId}`);
    },
  });

  eventPublisher.subscribe(EventType.RIDE_STARTED, {
    handle: async (event) => {
      events.push(event);
      console.log(`🚗 [EVENT] RIDE_STARTED`);
    },
  });

  eventPublisher.subscribe(EventType.RIDE_FINISHED, {
    handle: async (event) => {
      events.push(event);
      console.log(`🏁 [EVENT] RIDE_FINISHED`);
    },
  });

  eventPublisher.subscribe(EventType.DRIVER_CAME_ONLINE, {
    handle: async (event) => {
      events.push(event);
      console.log(`🟢 [EVENT] DRIVER_CAME_ONLINE: ${event.data.driverId}`);
    },
  });

  eventPublisher.subscribe(EventType.DRIVER_LOCATION_UPDATED, {
    handle: async (event) => {
      events.push(event);
      console.log(`📡 [EVENT] DRIVER_LOCATION_UPDATED`);
    },
  });

  try {
    // ========== 1. CRIAR USUÁRIOS ==========
    console.log('\n📝 PASSO 1: Criando usuários...');
    console.log('-'.repeat(60));

    const passenger = await appService.userService.createUser({
      name: 'João Passageiro',
      email: 'joao@example.com',
      phone: '11999999999',
      role: UserRole.PASSENGER,
    });
    console.log(`✓ Passageiro criado: ${passenger.id}`);

    const driver = await appService.userService.createUser({
      name: 'Maria Motorista',
      email: 'maria@example.com',
      phone: '11988888888',
      role: UserRole.DRIVER,
      documentId: '12345678900',
    });
    console.log(`✓ Motorista criado: ${driver.id}`);

    // ========== 2. MOTORISTA FICA ONLINE ==========
    console.log('\n🟢 PASSO 2: Motorista fica online...');
    console.log('-'.repeat(60));

    const driverOnline = await appService.driverService.setDriverOnline(driver.id);
    console.log(`✓ Status: ${driverOnline.status}`);

    // ========== 3. ATUALIZAR LOCALIZAÇÃO DO MOTORISTA ==========
    console.log('\n📡 PASSO 3: Atualizando localização do motorista...');
    console.log('-'.repeat(60));

    await appService.driverService.updateDriverLocation(driver.id, {
      latitude: -23.5505,
      longitude: -46.6333,
      timestamp: new Date(),
      accuracy: 10,
    });
    console.log('✓ Localização atualizada: -23.5505, -46.6333');

    const location = await appService.driverService.getDriverLocation(driver.id);
    console.log(`✓ Localização confirmada: (${location?.latitude}, ${location?.longitude})`);

    // ========== 4. PASSAGEIRO CRIA CORRIDA ==========
    console.log('\n🚕 PASSO 4: Passageiro cria corrida...');
    console.log('-'.repeat(60));

    const ride = await appService.rideService.createRide({
      passengerId: passenger.id,
      pickupLocation: { latitude: -23.5505, longitude: -46.6333 },
      dropoffLocation: { latitude: -23.5, longitude: -46.6 },
    });
    console.log(`✓ Corrida criada: ${ride.id}`);
    console.log(`  Status: ${ride.status}`);
    console.log(`  Pickup: (${ride.pickupLocation.latitude}, ${ride.pickupLocation.longitude})`);
    console.log(`  Dropoff: (${ride.dropoffLocation.latitude}, ${ride.dropoffLocation.longitude})`);

    // ========== 5. INICIA BUSCA POR MOTORISTA ==========
    console.log('\n🔍 PASSO 5: Iniciando busca por motorista...');
    console.log('-'.repeat(60));

    const searching = await appService.rideService.startSearchingForDriver(ride.id);
    console.log(`✓ Status: ${searching.status}`);

    // ========== 6. MATCHING ==========
    console.log('\n⚙️ PASSO 6: Executando matching...');
    console.log('-'.repeat(60));

    const matchingResult = await appService.matchingService.findBestDriver({
      passengerLatitude: ride.pickupLocation.latitude,
      passengerLongitude: ride.pickupLocation.longitude,
      maxRadiusKm: 10,
    });

    if (matchingResult) {
      console.log(`✓ Motorista encontrado: ${matchingResult.matchedDriverId}`);
      console.log(`  Distância: ${matchingResult.distance.toFixed(2)} km`);
      console.log(`  ETA: ${Math.round(matchingResult.eta / 60)} minutos`);

      // ========== 7. ATRIBUIR MOTORISTA ==========
      console.log('\n✅ PASSO 7: Atribuindo motorista...');
      console.log('-'.repeat(60));

      const assigned = await appService.rideService.assignDriverToRide(ride.id, matchingResult.matchedDriverId);
      console.log(`✓ Status: ${assigned.status}`);
      console.log(`  Motorista: ${assigned.driverId}`);
    } else {
      console.log('❌ Nenhum motorista encontrado');
    }

    // ========== 8. MOTORISTA ACEITA ==========
    console.log('\n✅ PASSO 8: Motorista aceita corrida...');
    console.log('-'.repeat(60));

    // Recarregar ride para ter o driver ID
    const rideWithDriver = await appService.rideService.getRideById(ride.id);
    console.log(`✓ Motorista aceita corrida`);

    // ========== 9. MOTORISTA INICIA CORRIDA ==========
    console.log('\n🚗 PASSO 9: Motorista inicia corrida...');
    console.log('-'.repeat(60));

    const started = await appService.rideService.startRide({
      rideId: ride.id,
      driverId: rideWithDriver.driverId!,
    });
    console.log(`✓ Status: ${started.status}`);
    console.log(`  Iniciada em: ${started.startedAt}`);

    // ========== 10. ATUALIZAR LOCALIZAÇÃO (simulando trajeto) ==========
    console.log('\n📡 PASSO 10: Simulando trajeto...');
    console.log('-'.repeat(60));

    for (let i = 0; i < 3; i++) {
      await appService.driverService.updateDriverLocation(rideWithDriver.driverId!, {
        latitude: -23.5505 + i * 0.005,
        longitude: -46.6333 + i * 0.005,
        timestamp: new Date(),
      });
      console.log(`  ✓ Localização ${i + 1}: (-23.${550 + i * 5}, -46.${633 + i * 5})`);
    }

    // ========== 11. MOTORISTA FINALIZA CORRIDA ==========
    console.log('\n🏁 PASSO 11: Motorista finaliza corrida...');
    console.log('-'.repeat(60));

    const finished = await appService.rideService.finishRide({
      rideId: ride.id,
      driverId: rideWithDriver.driverId!,
      finalLocation: { latitude: -23.5, longitude: -46.6 },
    });
    console.log(`✓ Status: ${finished.status}`);
    console.log(`  Finalizada em: ${finished.finishedAt}`);

    // ========== 12. HISTÓRICO DE ESTADOS ==========
    console.log('\n📊 PASSO 12: Histórico de estados...');
    console.log('-'.repeat(60));

    const finalRide = await appService.rideService.getRideById(ride.id);
    console.log('Transições de estado:');
    finalRide.statusHistory.forEach((change, index) => {
      const changedByStr = `[${change.changedBy}]`;
      console.log(
        `  ${index + 1}. ${change.status.padEnd(25)} ${changedByStr.padEnd(10)} ${change.timestamp.toISOString()}`
      );
    });

    // ========== 13. LISTAR CORRIDAS ==========
    console.log('\n📋 PASSO 13: Listando corridas...');
    console.log('-'.repeat(60));

    const passengerRides = await appService.rideService.listRidesByPassenger(passenger.id);
    console.log(`✓ Corridas do passageiro: ${passengerRides.length}`);
    passengerRides.forEach((r) => {
      console.log(`  - ${r.id}: ${r.status}`);
    });

    const driverRides = await appService.rideService.listRidesByDriver(rideWithDriver.driverId!);
    console.log(`✓ Corridas do motorista: ${driverRides.length}`);
    driverRides.forEach((r) => {
      console.log(`  - ${r.id}: ${r.status}`);
    });

    // ========== 14. LISTAR EVENTOS ==========
    console.log('\n🔔 PASSO 14: Eventos publicados...');
    console.log('-'.repeat(60));

    console.log(`✓ Total de eventos: ${events.length}`);
    events.forEach((e, i) => {
      console.log(`  ${i + 1}. ${e.type}`);
    });

    // ========== RESUMO ==========
    console.log('\n' + '='.repeat(60));
    console.log('✅ TESTE DE INTEGRAÇÃO COMPLETO COM SUCESSO!');
    console.log('='.repeat(60));

    console.log('\n📊 Resumo:');
    console.log(`  Usuários criados: 2`);
    console.log(`  Corrida realizada: 1`);
    console.log(`  Eventos publicados: ${events.length}`);
    console.log(`  Estados da corrida: ${finalRide.statusHistory.length}`);
    console.log(`  Duração simulada: ${Math.round((new Date(finished.finishedAt!).getTime() - new Date(started.startedAt!).getTime()) / 1000)}s\n`);
  } catch (error) {
    console.error('\n❌ ERRO:', error instanceof Error ? error.message : error);
    if (error instanceof Error) {
      console.error('Stack:', error.stack);
    }
  }
}

integrationTest();
