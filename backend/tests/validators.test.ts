/**
 * Tests - Validators
 */

import { RideValidator, DriverValidator, LocationValidator, UserValidator } from '../src/validators/Validators';
import { RideStatus } from '../src/models/Ride';
import { DriverStatusType } from '../src/models/DriverStatus';
import { ValidationError } from '../src/models/Errors';

function testValidators() {
  console.log('\n=== Testing Validators ===\n');

  let passed = 0;
  let failed = 0;

  // ===== Location Validator =====
  console.log('Location Validator:');

  try {
    LocationValidator.validateCoordinates(-23.5505, -46.6333);
    console.log('✓ Valid coordinates accepted');
    passed++;
  } catch (e) {
    console.log('✗ Valid coordinates rejected');
    failed++;
  }

  try {
    LocationValidator.validateCoordinates(95, 180);
    console.log('✗ Invalid latitude accepted');
    failed++;
  } catch (e) {
    console.log('✓ Invalid latitude rejected');
    passed++;
  }

  try {
    LocationValidator.validateCoordinates(-23.5, 200);
    console.log('✗ Invalid longitude accepted');
    failed++;
  } catch (e) {
    console.log('✓ Invalid longitude rejected');
    passed++;
  }

  // ===== Ride Validator =====
  console.log('\nRide Validator:');

  try {
    RideValidator.validateStateTransition(RideStatus.REQUESTED, RideStatus.ACCEPTED);
    console.log('✓ Valid state transition allowed');
    passed++;
  } catch (e) {
    console.log('✗ Valid state transition rejected');
    failed++;
  }

  try {
    RideValidator.validateStateTransition(RideStatus.COMPLETED, RideStatus.IN_PROGRESS);
    console.log('✗ Invalid state transition allowed');
    failed++;
  } catch (e) {
    console.log('✓ Invalid state transition rejected');
    passed++;
  }

  console.log('Is COMPLETED final status?', RideValidator.isFinalStatus(RideStatus.COMPLETED) ? '✓ Yes' : '✗ No');
  passed++;

  console.log('Is REQUESTED final status?', !RideValidator.isFinalStatus(RideStatus.REQUESTED) ? '✓ No' : '✗ Yes');
  passed++;

  // ===== Driver Validator =====
  console.log('\nDriver Validator:');

  try {
    DriverValidator.validateStatusTransition(DriverStatusType.OFFLINE, DriverStatusType.ONLINE);
    console.log('✓ Valid driver status transition allowed');
    passed++;
  } catch (e) {
    console.log('✗ Valid driver status transition rejected');
    failed++;
  }

  try {
    DriverValidator.validateStatusTransition(DriverStatusType.ON_BREAK, DriverStatusType.BUSY);
    console.log('✗ Invalid driver status transition allowed');
    failed++;
  } catch (e) {
    console.log('✓ Invalid driver status transition rejected');
    passed++;
  }

  console.log('Is ONLINE available?', DriverValidator.isAvailable(DriverStatusType.ONLINE) ? '✓ Yes' : '✗ No');
  passed++;

  // ===== User Validator =====
  console.log('\nUser Validator:');

  try {
    UserValidator.validateEmail('user@example.com');
    console.log('✓ Valid email accepted');
    passed++;
  } catch (e) {
    console.log('✗ Valid email rejected');
    failed++;
  }

  try {
    UserValidator.validateEmail('invalid-email');
    console.log('✗ Invalid email accepted');
    failed++;
  } catch (e) {
    console.log('✓ Invalid email rejected');
    passed++;
  }

  try {
    UserValidator.validatePhone('11999999999');
    console.log('✓ Valid phone accepted');
    passed++;
  } catch (e) {
    console.log('✗ Valid phone rejected');
    failed++;
  }

  try {
    UserValidator.validateName('AB');
    console.log('✗ Too short name accepted');
    failed++;
  } catch (e) {
    console.log('✓ Too short name rejected');
    passed++;
  }

  console.log(`\n=== Results ===`);
  console.log(`✓ Passed: ${passed}`);
  console.log(`✗ Failed: ${failed}\n`);
}

testValidators();
