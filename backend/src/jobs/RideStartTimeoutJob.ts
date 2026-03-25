/**
 * RideStartTimeoutJob
 * Cancela corrida se o motorista nao iniciar apos aceitar
 */

import { Logger } from '../utils/Logger';
import { RideService } from '../services/RideService';

export class RideStartTimeoutJob {
  constructor(private rideService: RideService) {}

  async execute(rideId: string): Promise<void> {
    Logger.debug('RideStartTimeoutJob', 'Executing', { rideId });

    const result = await this.rideService.cancelRideSafely(rideId, 'driver_start_timeout', {
      cancelledBy: 'system',
    });

    Logger.info('RideStartTimeoutJob', 'Ride start timeout handled', {
      rideId,
      changed: result.changed,
      status: result.ride.status,
    });
  }
}
