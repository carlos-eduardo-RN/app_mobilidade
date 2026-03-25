/**
 * DriverStatus Domain
 * Controla status e disponibilidade do motorista
 */

export enum DriverStatusType {
  OFFLINE = 'OFFLINE',
  ONLINE = 'ONLINE',
  BUSY = 'BUSY',
  ON_BREAK = 'ON_BREAK',
}

export interface DriverStatus {
  driverId: string;
  status: DriverStatusType;
  lastLocationUpdate: Date;
  currentRideId?: string; // Se busy ou em corrida
  updatedAt: Date;
}

export enum DriverAvailability {
  AVAILABLE = 'available',
  UNAVAILABLE = 'unavailable',
  AWAY = 'away',
}

export interface ChangeDriverStatusDTO {
  status: DriverStatusType;
}
