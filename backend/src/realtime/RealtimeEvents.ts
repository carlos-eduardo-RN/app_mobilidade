/**
 * Realtime Events
 * Eventos que devem ser propagados em tempo real aos clientes
 * Abstratos de implementação (polling, WebSocket, FCM, etc)
 */

import { RideStatus } from '../models/Ride';
import { Location } from '../models/Location';

/**
 * Evento que uma corrida sofreu mudança de status
 */
export interface RideStatusChangedEvent {
  type: 'RIDE_STATUS_CHANGED';
  rideId: string;
  newStatus: RideStatus;
  previousStatus: RideStatus;
  timestamp: Date;
  changedBy?: string; // 'system', 'passenger', 'driver'
}

/**
 * Evento que o motorista atualizou localização
 */
export interface DriverLocationUpdatedEvent {
  type: 'DRIVER_LOCATION_UPDATED';
  rideId: string;
  driverId: string;
  location: {
    latitude: number;
    longitude: number;
    timestamp: Date;
    accuracy?: number;
  };
}

/**
 * Evento que corrida foi atribuída a um motorista
 */
export interface RideAssignedEvent {
  type: 'RIDE_ASSIGNED';
  rideId: string;
  driverId: string;
  timestamp: Date;
}

/**
 * Evento que corrida foi cancelada
 */
export interface RideCancelledEvent {
  type: 'RIDE_CANCELLED';
  rideId: string;
  cancelledBy: 'passenger' | 'driver' | 'system';
  reason?: string;
  timestamp: Date;
}

/**
 * Union de todos os eventos realtime
 */
export type RealtimeEvent =
  | RideStatusChangedEvent
  | DriverLocationUpdatedEvent
  | RideAssignedEvent
  | RideCancelledEvent;
