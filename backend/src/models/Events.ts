/**
 * Events Domain
 * Canonical domain events for rides, drivers and users.
 */

export enum EventType {
  // User Events
  USER_CREATED = 'user_created',
  USER_UPDATED = 'user_updated',

  // Driver Events
  DRIVER_CAME_ONLINE = 'driver_came_online',
  DRIVER_WENT_OFFLINE = 'driver_went_offline',
  DRIVER_LOCATION_UPDATED = 'driver_location_updated',

  // Canonical Ride Events
  RIDE_CREATED = 'ride_created',
  RIDE_MATCHING_STARTED = 'ride_matching_started',
  DRIVER_FOUND = 'driver_found',
  DRIVER_ACCEPTED = 'driver_accepted',
  RIDE_STARTED = 'ride_started',
  RIDE_COMPLETED = 'ride_completed',
  RIDE_CANCELLED = 'ride_cancelled',
  RIDE_ERROR = 'ride_error',

  // Legacy / compatibility events
  RIDE_MATCHING_FAILED = 'ride_matching_failed',
  RIDE_DRIVER_ASSIGNED = 'ride_driver_assigned',
  RIDE_DRIVER_ACCEPTED = 'ride_driver_accepted',
  RIDE_DRIVER_REJECTED = 'ride_driver_rejected',
  RIDE_DRIVER_APPROACHING = 'ride_driver_approaching',
  RIDE_FINISHED = 'ride_finished',

  // Matching orchestration diagnostics
  MATCHING_STARTED = 'matching_started',
  MATCHING_ATTEMPT = 'matching_attempt',
  MATCHING_FAILED = 'matching_failed',
  DRIVER_ASSIGNED = 'driver_assigned',
  DRIVER_REJECTED = 'driver_rejected',

  // Timeout Events
  MATCHING_TIMEOUT = 'matching_timeout',
  DRIVER_ACCEPT_TIMEOUT = 'driver_accept_timeout',
  RIDE_INACTIVITY_TIMEOUT = 'ride_inactivity_timeout',
}

export interface DomainEvent {
  id: string;
  type: EventType;
  aggregateId: string;
  aggregateType: 'ride' | 'driver' | 'user';
  timestamp: Date;
  data: Record<string, unknown>;
  metadata?: {
    source?: string;
    userId?: string;
    traceId?: string;
  };
}

export interface EventPublisher {
  publish(event: DomainEvent): Promise<void>;
  subscribe(eventType: EventType, handler: EventHandler): void;
}

export interface EventHandler {
  handle(event: DomainEvent): Promise<void>;
}
