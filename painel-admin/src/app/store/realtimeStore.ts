import { RealtimeGateway } from '../gateway/realtimeGateway';
import type { AuditEvent, Incident, RideSnapshot, RideState, SystemHealth } from '../types';

export type RealtimeSnapshot = {
  rides: Map<string, RideSnapshot>;
  auditEvents: AuditEvent[];
  incidents: Incident[];
  systemHealth: SystemHealth | null;
  connectionStatus: 'disconnected' | 'connecting' | 'connected';
};

const state: RealtimeSnapshot = {
  rides: new Map(),
  auditEvents: [],
  incidents: [],
  systemHealth: null,
  connectionStatus: 'disconnected',
};

const listeners = new Set<() => void>();

export function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getSnapshot(): RealtimeSnapshot {
  return state;
}

function emitChange() {
  listeners.forEach((listener) => listener());
}

function normalizeRideState(status: string | undefined): RideState {
  switch ((status ?? '').toLowerCase()) {
    case 'accepted':
      return 'accepted';
    case 'driver_arrived':
      return 'driver_arrived';
    case 'in_progress':
      return 'in_progress';
    case 'completed':
      return 'completed';
    case 'cancelled':
      return 'cancelled';
    case 'requested':
    default:
      return 'requested';
  }
}

function upsertRideFromEvent(payload: any) {
  if (!payload) return;

  const rideId = payload.ride_id as string | undefined;
  const data = payload.data as Record<string, any> | undefined;
  if (!rideId || !data) return;

  const prev = state.rides.get(rideId);
  const next: RideSnapshot = {
    ride_id: rideId,
    state: normalizeRideState(data.status),
    version: Number(payload.version ?? prev?.version ?? 0),
    driver_id: (data.driver_id as string | null | undefined) ?? prev?.driver_id,
    passenger_id: (data.passenger_id as string | null | undefined) ?? prev?.passenger_id,
    driver: prev?.driver,
    passenger: prev?.passenger,
    updated_at: (data.updated_at as string | undefined) ??
      (payload.timestamp as string | undefined) ??
      prev?.updated_at ??
      new Date().toISOString(),
  };

  state.rides.set(rideId, next);
  emitChange();
}

export function bindGateway(gateway: RealtimeGateway) {
  gateway.onStatusChange((status) => {
    state.connectionStatus = status;
    emitChange();
  });

  gateway.on('ride_assigned', (payload: any) => {
    upsertRideFromEvent(payload);
  });

  gateway.on('ride_status_changed', (payload: any) => {
    upsertRideFromEvent(payload);
  });

  gateway.on('driver_location_update', (payload: any) => {
    const rideId = payload?.ride_id as string | undefined;
    const data = payload?.data as Record<string, any> | undefined;
    if (!rideId || !data) return;

    const ride = state.rides.get(rideId);
    if (!ride) return;

    state.rides.set(rideId, {
      ...ride,
      driver: {
        id: (data.driver_id as string | undefined) ?? ride.driver_id ?? 'driver',
        lat: Number(data.latitude ?? 0),
        lng: Number(data.longitude ?? 0),
        heading: data.heading ? Number(data.heading) : undefined,
      },
      updated_at: (data.timestamp as string | undefined) ?? ride.updated_at,
    });
    emitChange();
  });

  gateway.on('audit_event', (payload: AuditEvent) => {
    state.auditEvents = [payload, ...state.auditEvents].slice(0, 200);
    emitChange();
  });

  gateway.on('incident_created', (payload: Incident) => {
    state.incidents = [payload, ...state.incidents].slice(0, 200);
    emitChange();
  });

  gateway.on('system_health', (payload: SystemHealth) => {
    state.systemHealth = payload;
    emitChange();
  });
}
