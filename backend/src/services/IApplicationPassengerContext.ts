import { RideService } from './RideService';
import { MatchingService } from './MatchingService';

export interface IApplicationPassengerContext {
  rideService: RideService;
  matchingService: MatchingService;
}