export type Role = 'admin' | 'operator' | 'support';

export type RideState =
  | 'requested'
  | 'accepted'
  | 'driver_arrived'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export type RideSnapshot = {
  ride_id: string;
  state: RideState;
  version: number;
  driver_id?: string;
  passenger_id?: string;
  driver?: { id: string; lat: number; lng: number; heading?: number };
  passenger?: { id: string; lat: number; lng: number };
  updated_at: string;
};

export type AuditEvent = {
  id: string;
  actor_role: Role;
  actor_id: string;
  action: string;
  target_id: string;
  created_at: string;
};

export type Incident = {
  id: string;
  ride_id?: string;
  severity: 'low' | 'medium' | 'high';
  title: string;
  details: string;
  created_at: string;
};

export type SystemHealth = {
  status: 'ok' | 'degraded' | 'down';
  updated_at: string;
  notes?: string;
};

export type RealtimeEvent =
  | { event: 'ride_assigned'; payload: RideSnapshot }
  | { event: 'ride_status_changed'; payload: RideSnapshot }
  | {
      event: 'driver_location_update';
      payload: {
        ride_id: string;
        driver_id: string;
        latitude: number;
        longitude: number;
        heading?: number;
        timestamp: string;
      };
    }
  | { event: 'audit_event'; payload: AuditEvent }
  | { event: 'incident_created'; payload: Incident }
  | { event: 'system_health'; payload: SystemHealth };
