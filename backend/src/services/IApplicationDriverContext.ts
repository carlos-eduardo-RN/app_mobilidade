import { DriverService } from './DriverService';
import { RideService } from './RideService';

export interface IApplicationDriverContext {
  driverService: DriverService;
  rideService: RideService;
}