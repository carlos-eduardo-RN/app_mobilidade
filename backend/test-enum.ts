// Test file to check if RideStatus enum is working
import { RideStatus } from './src/models/Ride';

console.log('REQUESTED:', RideStatus.REQUESTED);
console.log('ACCEPTED:', RideStatus.ACCEPTED);
console.log('DRIVER_ARRIVED:', RideStatus.DRIVER_ARRIVED);
console.log('IN_PROGRESS:', RideStatus.IN_PROGRESS);
console.log('COMPLETED:', RideStatus.COMPLETED);
console.log('CANCELLED:', RideStatus.CANCELLED);