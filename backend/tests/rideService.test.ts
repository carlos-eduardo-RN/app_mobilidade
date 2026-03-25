/**
 * Tests - Ride Service
 */

import { MockUserRepository, MockRideRepository, MockDriverRepository, MockLocationRepository, MockDriverStatusRepository } from '../src/repositories/MockRepositories';
import { RideService } from '../src/services/RideService';
import { DriverService } from '../src/services/DriverService';
import { MatchingService } from '../src/services/MatchingService';
import { UserService } from '../src/services/UserService';
import { EventPublisher } from '../src/events/EventPublisher';
import { UserRole } from '../src/models/User';
import { RideStatus } from '../src/models/Ride';
import { DriverStatusType } from '../src/models/DriverStatus';

async function testRideService() {
  console.log('\n=== Testing RideService ===\n');

  const userRepository = new MockUserRepository();
  const rideRepository = new MockRideRepository();
  const driverRepository = new MockDriverRepository();
  const locationRepository = new MockLocationRepository();
  const driverStatusRepository = new MockDriverStatusRepository();
  const eventPublisher = new EventPublisher();

  const userService = new UserService(userRepository);
  const matchingService = new MatchingService(driverRepository, locationRepository);
  const driverService = new DriverService(driverRepository, driverStatusRepository, locationRepository, eventPublisher);
  const rideService = new RideService(rideRepository, userRepository, eventPublisher, driverService, matchingService);

  try {
    // Test 1: Create Passenger User
    console.log('Test 1: Creating passenger user...');
    const passenger = await userService.createUser({
      name: 'João Passageiro',
      email: 'joao@passenger.com',
      phone: '11999999999',
      role: UserRole.PASSENGER,
    });
    console.log('✓ Passenger created:', passenger.id);

    // Test 2: Create Driver User
    console.log('\nTest 2: Creating driver user...');
    const driver = await userService.createUser({
      name: 'Maria Motorista',
      email: 'maria@driver.com',
      phone: '11988888888',
      role: UserRole.DRIVER,
      documentId: '12345678900',
    });
    console.log('✓ Driver created:', driver.id);

    // Test 3: Create Ride
    console.log('\nTest 3: Creating ride...');
    const ride = await rideService.createRide({
      passengerId: passenger.id,
      pickupLocation: { latitude: -23.5505, longitude: -46.6333 },
      dropoffLocation: { latitude: -23.5, longitude: -46.6 },
    });
    console.log('✓ Ride created:', ride.id, 'Status:', ride.status);

    // Test 4: Start Searching for Driver
    console.log('\nTest 4: Starting search for driver...');
    const searching = await rideService.startSearchingForDriver(ride.id);
    console.log('✓ Ride status changed to:', searching.status);

    // Test 5: Assign Driver
    console.log('\nTest 5: Assigning driver...');
    
    // Primeiro, colocar motorista online
    await driverService.setDriverOnline(driver.id);
    await driverService.updateDriverLocation(driver.id, {
      latitude: -23.55,
      longitude: -46.63,
      timestamp: new Date(),
    });

    const assigned = await rideService.assignDriverToRide(ride.id, driver.id);
    console.log('✓ Driver assigned. Status:', assigned.status, 'Driver:', assigned.driverId);

    // Test 6: Start Ride
    console.log('\nTest 6: Starting ride...');
    const started = await rideService.startRide({
      rideId: ride.id,
      driverId: driver.id,
    });
    console.log('✓ Ride started. Status:', started.status);

    // Test 7: Finish Ride
    console.log('\nTest 7: Finishing ride...');
    const finished = await rideService.finishRide({
      rideId: ride.id,
      driverId: driver.id,
      finalLocation: { latitude: -23.5, longitude: -46.6 },
    });
    console.log('✓ Ride finished. Status:', finished.status);

    // Test 8: State History
    console.log('\nTest 8: Checking state history...');
    const finalRide = await rideService.getRideById(ride.id);
    console.log('✓ State transitions:', finalRide.statusHistory.map((h) => h.status).join(' -> '));

    console.log('\n✓ All RideService tests passed!\n');
  } catch (error) {
    console.error('✗ Test failed:', error instanceof Error ? error.message : error);
  }
}

testRideService();
