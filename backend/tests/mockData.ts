/**
 * Mock Data
 * Dados de exemplo para testes e desenvolvimento
 */

import { User, UserRole } from '../src/models/User';
import { Ride, RideStatus } from '../src/models/Ride';
import { v4 as uuidv4 } from 'uuid';

// ========== USUÁRIOS MOCK ==========

export const mockPassenger: User = {
  id: 'passenger_1',
  role: UserRole.PASSENGER,
  name: 'João Silva',
  email: 'joao@example.com',
  phone: '11999999999',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

export const mockDriver: User = {
  id: 'driver_1',
  role: UserRole.DRIVER,
  name: 'Maria Oliveira',
  email: 'maria@example.com',
  phone: '11988888888',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

export const mockAdmin: User = {
  id: 'admin_1',
  role: UserRole.ADMIN,
  name: 'Admin System',
  email: 'admin@voudmoto.com',
  phone: '1133333333',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

// ========== LOCALIZAÇÕES MOCK ==========

export const mockLocations = {
  saopaulo_centro: {
    latitude: -23.5505,
    longitude: -46.6333,
    address: 'Avenida Paulista, São Paulo',
  },
  saopaulo_vila: {
    latitude: -23.5,
    longitude: -46.6,
    address: 'Vila Mariana, São Paulo',
  },
  saopaulo_pinheiros: {
    latitude: -23.56,
    longitude: -46.67,
    address: 'Pinheiros, São Paulo',
  },
  saopaulo_ibirapuera: {
    latitude: -23.59,
    longitude: -46.66,
    address: 'Ibirapuera, São Paulo',
  },
};

// ========== CORRIDAS MOCK ==========

export function createMockRide(
  passengerId: string = mockPassenger.id,
  driverId?: string,
  status: RideStatus = RideStatus.CREATED
): Ride {
  const now = new Date();

  return {
    id: uuidv4(),
    passengerId,
    driverId,
    status,
    pickupLocation: mockLocations.saopaulo_centro,
    dropoffLocation: mockLocations.saopaulo_vila,
    createdAt: now,
    lastStatusUpdate: now,
    statusHistory: [
      {
        status: RideStatus.CREATED,
        timestamp: now,
        changedBy: 'system',
      },
    ],
  };
}

export const mockFinishedRide: Ride = {
  id: 'ride_finished_1',
  passengerId: mockPassenger.id,
  driverId: mockDriver.id,
  status: RideStatus.COMPLETED,
  pickupLocation: mockLocations.saopaulo_centro,
  dropoffLocation: mockLocations.saopaulo_vila,
  createdAt: new Date('2024-01-20T10:00:00'),
  startedAt: new Date('2024-01-20T10:15:00'),
  finishedAt: new Date('2024-01-20T10:45:00'),
  lastStatusUpdate: new Date('2024-01-20T10:45:00'),
  statusHistory: [
    {
      status: RideStatus.REQUESTED,
      timestamp: new Date('2024-01-20T10:00:00'),
      changedBy: 'system',
    },
    {
      status: RideStatus.SEARCHING_DRIVER,
      timestamp: new Date('2024-01-20T10:01:00'),
      changedBy: 'system',
    },
    {
      status: RideStatus.DRIVER_ASSIGNED,
      timestamp: new Date('2024-01-20T10:02:00'),
      changedBy: 'system',
    },
    {
      status: RideStatus.IN_PROGRESS,
      timestamp: new Date('2024-01-20T10:15:00'),
      changedBy: 'driver',
    },
    {
      status: RideStatus.COMPLETED,
      timestamp: new Date('2024-01-20T10:45:00'),
      changedBy: 'driver',
    },
  ],
};

export const mockCancelledRide: Ride = {
  id: 'ride_cancelled_1',
  passengerId: mockPassenger.id,
  status: RideStatus.CANCELLED,
  pickupLocation: mockLocations.saopaulo_centro,
  dropoffLocation: mockLocations.saopaulo_vila,
  createdAt: new Date('2024-01-20T11:00:00'),
  lastStatusUpdate: new Date('2024-01-20T11:05:00'),
  cancelReason: 'Motorista demorando muito',
  statusHistory: [
    {
      status: RideStatus.REQUESTED,
      timestamp: new Date('2024-01-20T11:00:00'),
      changedBy: 'system',
    },
    {
      status: RideStatus.CANCELLED,
      timestamp: new Date('2024-01-20T11:05:00'),
      changedBy: 'passenger',
      reason: 'Motorista demorando muito',
    },
  ],
};

// ========== CENÁRIOS DE TESTE ==========

export const testScenarios = {
  /**
   * Cenário: Corrida bem-sucedida
   * Fluxo: criada → buscando → atribuída → em andamento → finalizada
   */
  successfulRide: async (services: any) => {
    console.log('🚗 Testando cenário: Corrida bem-sucedida');

    // 1. Criar corrida
    const ride = await services.rideService.createRide({
      passengerId: mockPassenger.id,
      pickupLocation: mockLocations.saopaulo_centro,
      dropoffLocation: mockLocations.saopaulo_vila,
    });
    console.log('✓ Corrida criada:', ride.id);

    // 2. Iniciar busca
    const searching = await services.rideService.startSearchingForDriver(ride.id);
    console.log('✓ Iniciada busca por motorista');

    // 3. Atribuir motorista
    const assigned = await services.rideService.assignDriverToRide(ride.id, mockDriver.id);
    console.log('✓ Motorista atribuído:', mockDriver.id);

    // 4. Iniciar corrida
    const started = await services.rideService.startRide({
      rideId: ride.id,
      driverId: mockDriver.id,
    });
    console.log('✓ Corrida iniciada');

    // 5. Finalizar corrida
    const finished = await services.rideService.finishRide({
      rideId: ride.id,
      driverId: mockDriver.id,
      finalLocation: mockLocations.saopaulo_vila,
    });
    console.log('✓ Corrida finalizada');

    return finished;
  },

  /**
   * Cenário: Passageiro cancela
   * Fluxo: criada → buscando → cancelada
   */
  passengerCancels: async (services: any) => {
    console.log('❌ Testando cenário: Passageiro cancela');

    // 1. Criar corrida
    const ride = await services.rideService.createRide({
      passengerId: mockPassenger.id,
      pickupLocation: mockLocations.saopaulo_centro,
      dropoffLocation: mockLocations.saopaulo_vila,
    });

    // 2. Iniciar busca
    await services.rideService.startSearchingForDriver(ride.id);

    // 3. Passageiro cancela
    const cancelled = await services.rideService.cancelRide({
      rideId: ride.id,
      cancelledBy: 'passenger',
      reason: 'Mudei de ideia',
    });
    console.log('✓ Corrida cancelada pelo passageiro');

    return cancelled;
  },

  /**
   * Cenário: Driver fica online/offline
   */
  driverStatus: async (services: any) => {
    console.log('🔄 Testando cenário: Status do motorista');

    // 1. Ficar online
    let status = await services.driverService.setDriverOnline(mockDriver.id);
    console.log('✓ Motorista online:', status.status);

    // 2. Atualizar localização
    await services.driverService.updateDriverLocation(mockDriver.id, {
      latitude: mockLocations.saopaulo_centro.latitude,
      longitude: mockLocations.saopaulo_centro.longitude,
      timestamp: new Date(),
    });
    console.log('✓ Localização atualizada');

    // 3. Verificar disponibilidade
    const available = await services.driverService.isDriverAvailable(mockDriver.id);
    console.log('✓ Disponível?', available);

    // 4. Ficar offline
    status = await services.driverService.setDriverOffline(mockDriver.id);
    console.log('✓ Motorista offline:', status.status);

    return status;
  },
};

// ========== TOKENS DE TESTE ==========

export const testTokens = {
  passenger: `${mockPassenger.id}:passenger`,
  driver: `${mockDriver.id}:driver`,
  admin: `${mockAdmin.id}:admin`,
};

// ========== HEADERS DE TESTE ==========

export const testHeaders = {
  asPassenger: {
    'Authorization': `Bearer ${testTokens.passenger}`,
    'Content-Type': 'application/json',
  },
  asDriver: {
    'Authorization': `Bearer ${testTokens.driver}`,
    'Content-Type': 'application/json',
  },
  asAdmin: {
    'Authorization': `Bearer ${testTokens.admin}`,
    'Content-Type': 'application/json',
  },
};
