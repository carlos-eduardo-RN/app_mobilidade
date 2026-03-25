import { Fragment } from 'react';
import { MapContainer, TileLayer, CircleMarker, Tooltip } from 'react-leaflet';
import type { RideSnapshot } from '../types';

export function MapPanel({ rides }: { rides: RideSnapshot[] }) {
  const center = rides.length
    ? [rides[0].driver?.lat ?? 0, rides[0].driver?.lng ?? 0]
    : [0, 0];

  return (
    <div className="card map-card">
      <header>
        <h3>Mapa em tempo real</h3>
        <span className="muted">
          Posicoes atualizadas apenas por eventos do backend
        </span>
      </header>
      <div className="map-wrapper">
        <MapContainer center={center as [number, number]} zoom={13}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="&copy; OpenStreetMap"
          />
          {rides.map((ride) => (
            <Fragment key={ride.ride_id}>
              {ride.driver && (
                <CircleMarker
                  center={[ride.driver.lat, ride.driver.lng]}
                  radius={8}
                  pathOptions={{ color: '#00d4a6' }}
                >
                  <Tooltip direction="top" offset={[0, -8]}>
                    Motorista {ride.driver.id}
                  </Tooltip>
                </CircleMarker>
              )}
              {ride.passenger && (
                <CircleMarker
                  center={[ride.passenger.lat, ride.passenger.lng]}
                  radius={6}
                  pathOptions={{ color: '#ffd166' }}
                >
                  <Tooltip direction="top" offset={[0, -8]}>
                    Passageiro {ride.passenger.id}
                  </Tooltip>
                </CircleMarker>
              )}
            </Fragment>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
