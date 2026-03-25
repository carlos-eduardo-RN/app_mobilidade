/**
 * RideAcceptTimeoutJob
 * Cancela corrida se motorista nao aceitar no tempo limite
 */

import { Logger } from '../utils/Logger';
import { RideService } from '../services/RideService';

export class RideAcceptTimeoutJob {
  constructor(private rideService: RideService) {}

  async execute(rideId: string): Promise<void> {
    Logger.debug('RideAcceptTimeoutJob', 'Executing', { rideId });

    const result = await this.rideService.cancelRideSafely(rideId, 'no_drivers_available', {
      cancelledBy: 'system',
    });

    Logger.info('RideAcceptTimeoutJob', 'Ride timeout handled', {
      rideId,
      changed: result.changed,
      status: result.ride.status,
    });
  }
}
