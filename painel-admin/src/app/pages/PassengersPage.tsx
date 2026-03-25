import type { RideSnapshot } from '../types';

type PassengerInfo = {
  id: string;
  totalRides: number;
  completedRides: number;
  canceledRides: number;
  lastRideDate: string;
};

export function PassengersPage({ rides }: { rides: RideSnapshot[] }) {
  const passengerMap = new Map<string, PassengerInfo>();

  rides.forEach((ride) => {
    if (!ride.passenger_id) return;
    const existing = passengerMap.get(ride.passenger_id) ?? {
      id: ride.passenger_id,
      totalRides: 0,
      completedRides: 0,
      canceledRides: 0,
      lastRideDate: new Date().toISOString(),
    };

    existing.totalRides += 1;
    if (ride.state === 'completed') {
      existing.completedRides += 1;
    } else if (ride.state === 'cancelled') {
      existing.canceledRides += 1;
    }
    existing.lastRideDate = ride.updated_at;
    passengerMap.set(ride.passenger_id, existing);
  });

  const passengers = Array.from(passengerMap.values());

  return (
    <div className="card">
      <header>
        <h3>Passageiros</h3>
        <span className="muted">Informacoes de passageiros e historico de uso</span>
      </header>
      {passengers.length === 0 ? (
        <div className="empty">Nenhum passageiro registrado.</div>
      ) : (
        <div className="table">
          <div className="table-row head">
            <span>ID do Passageiro</span>
            <span>Total de Corridas</span>
            <span>Concluidas</span>
            <span>Canceladas</span>
            <span>Ultima Corrida</span>
          </div>
          {passengers.map((passenger) => (
            <div className="table-row" key={passenger.id}>
              <span>{passenger.id}</span>
              <span>{passenger.totalRides}</span>
              <span style={{ color: 'var(--accent)' }}>
                {passenger.completedRides}
              </span>
              <span style={{ color: 'var(--danger)' }}>
                {passenger.canceledRides}
              </span>
              <span>{new Date(passenger.lastRideDate).toLocaleDateString()}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
