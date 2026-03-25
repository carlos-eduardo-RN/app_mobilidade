import { EventPublisher } from '../events/EventPublisher';
import { DomainEvent, EventHandler, EventType } from '../models/Events';
import { Ride } from '../models/Ride';
import { RideService } from '../services/RideService';
import { buildRideEvent, RealtimeGateway } from './gateway';

export class RealtimeBridge {
  constructor(
    private eventPublisher: EventPublisher,
    private rideService: RideService,
    private gateway: RealtimeGateway
  ) {}

  attach(): void {
    const rideStateHandler: EventHandler = {
      handle: async (event: DomainEvent) => {
        const ride = await this.rideService.getRideById(event.aggregateId);
        const driverId = this.resolveDriverId(ride, event);
        const cancelReason = this.resolveCancelReason(ride, event);
        const statusPayload = this.buildStatusPayload(ride, {
          driverId,
          cancelReason,
        });
        const payload = buildRideEvent(ride.id, ride.version ?? 1, 'ride_status_changed', {
          ride_id: ride.id,
          rideId: ride.id,
          status: ride.status,
          passenger_id: ride.passengerId,
          passengerId: ride.passengerId,
          driver_id: driverId,
          driverId,
          cancel_reason: cancelReason,
          cancelReason,
          updated_at: ride.lastStatusUpdate.toISOString(),
          updatedAt: ride.lastStatusUpdate.toISOString(),
        });

        await this.gateway.publishRideEvent(ride.id, payload);

        if (driverId) {
          await this.gateway.publishUserEvent(driverId, {
            type: 'ride_status_changed',
            ...statusPayload,
          });
        }

        if (event.type === EventType.RIDE_CANCELLED && driverId) {
          await this.gateway.publishUserEvent(driverId, {
            type: 'ride_cancelled',
            ...statusPayload,
          });
        }
      },
    };

    const rideOfferHandler: EventHandler = {
      handle: async (event: DomainEvent) => {
        const driverId = event.data.driverId;
        if (typeof driverId !== 'string' || driverId.length === 0) {
          return;
        }

        const ride = await this.rideService.getRideById(event.aggregateId);
        const statusPayload = this.buildStatusPayload(ride, {
          driverId,
          cancelReason: ride.cancelReason ?? null,
        });
        await this.gateway.publishUserEvent(driverId, {
          type: 'ride_assigned',
          ...statusPayload,
          ride: this.serializeRide(ride),
        });
      },
    };

    const locationHandler: EventHandler = {
      handle: async (event: DomainEvent) => {
        const rideId = event.data.rideId;
        if (typeof rideId !== 'string' || !rideId) {
          return;
        }

        const ride = await this.rideService.getRideById(rideId);
        const payload = buildRideEvent(ride.id, ride.version ?? 1, 'driver_location_update', {
          driver_id: event.data.driverId,
          latitude: event.data.latitude,
          longitude: event.data.longitude,
          accuracy: event.data.accuracy,
          timestamp: event.data.timestamp,
        });

        await this.gateway.publishRideEvent(ride.id, payload);
      },
    };

    const rideStateEvents: EventType[] = [
      EventType.RIDE_CREATED,
      EventType.RIDE_MATCHING_STARTED,
      EventType.DRIVER_ACCEPTED,
      EventType.RIDE_STARTED,
      EventType.RIDE_COMPLETED,
      EventType.RIDE_CANCELLED,
    ];

    rideStateEvents.forEach((type) => this.eventPublisher.subscribe(type, rideStateHandler));
    this.eventPublisher.subscribe(EventType.DRIVER_FOUND, rideOfferHandler);
    this.eventPublisher.subscribe(EventType.DRIVER_LOCATION_UPDATED, locationHandler);
  }

  private serializeRide(ride: Ride): Record<string, unknown> {
    return {
      id: ride.id,
      passengerId: ride.passengerId,
      driverId: ride.driverId ?? null,
      status: ride.status,
      pickupLocation: ride.pickupLocation,
      dropoffLocation: ride.dropoffLocation,
      createdAt: ride.createdAt.toISOString(),
      lastStatusUpdate: ride.lastStatusUpdate.toISOString(),
      cancelReason: ride.cancelReason ?? null,
    };
  }

  private buildStatusPayload(
    ride: Ride,
    overrides: {
      driverId?: string | null;
      cancelReason?: string | null;
    } = {}
  ): Record<string, unknown> {
    const driverId = overrides.driverId ?? ride.driverId ?? null;
    const cancelReason = overrides.cancelReason ?? ride.cancelReason ?? null;

    return {
      rideId: ride.id,
      status: ride.status,
      driverId,
      cancelReason,
    };
  }

  private resolveDriverId(ride: Ride, event: DomainEvent): string | null {
    if (typeof event.data.driverId === 'string' && event.data.driverId.length > 0) {
      return event.data.driverId;
    }

    return ride.driverId ?? null;
  }

  private resolveCancelReason(ride: Ride, event: DomainEvent): string | null {
    if (typeof event.data.cancelReason === 'string' && event.data.cancelReason.length > 0) {
      return event.data.cancelReason;
    }

    if (typeof event.data.reason === 'string' && event.data.reason.length > 0) {
      return event.data.reason;
    }

    return ride.cancelReason ?? null;
  }
}
