import type { RideSnapshot, RideState, Role } from '../types';
import type { RealtimeGateway } from '../gateway/realtimeGateway';

function canAct(role: Role) {
  return role === 'admin' || role === 'operator';
}

const rideStateLabels: Record<RideState, string> = {
  requested: 'solicitada',
  accepted: 'aceita',
  driver_arrived: 'motorista chegou',
  in_progress: 'em andamento',
  completed: 'concluida',
  cancelled: 'cancelada',
};

export function RideTable({
  rides,
  role,
  gateway,
}: {
  rides: RideSnapshot[];
  role: Role;
  gateway: RealtimeGateway;
}) {
  return (
    <div className="card">
      <header>
        <h3>Corridas ativas</h3>
        <span className="muted">Somente acoes administrativas validadas</span>
      </header>
      {rides.length === 0 ? (
        <div className="empty">Nenhuma corrida ativa no momento.</div>
      ) : (
        <div className="table">
          <div className="table-row head">
            <span>Corrida</span>
            <span>Status</span>
            <span>Motorista</span>
            <span>Passageiro</span>
            <span>Atualizado</span>
            <span>Acoes</span>
          </div>
          {rides.map((ride) => (
            <div className="table-row" key={ride.ride_id}>
              <span>{ride.ride_id}</span>
              <span className={`pill ${ride.state}`}>
                {rideStateLabels[ride.state] ?? ride.state}
              </span>
              <span>{ride.driver_id ?? '-'}</span>
              <span>{ride.passenger_id ?? '-'}</span>
              <span>{new Date(ride.updated_at).toLocaleTimeString()}</span>
              <span className="actions">
                <button
                  className="ghost"
                  disabled={!canAct(role)}
                  onClick={() => {
                    const reason = window.prompt('Motivo do cancelamento');
                    if (!reason) return;
                    gateway.send('admin_cancel_ride', {
                      ride_id: ride.ride_id,
                      reason,
                    });
                  }}
                >
                  Cancelar
                </button>
                <button
                  className="ghost"
                  disabled={!canAct(role)}
                  onClick={() => {
                    const driverId = window.prompt('Novo id do motorista');
                    if (!driverId) return;
                    gateway.send('admin_reassign_driver', {
                      ride_id: ride.ride_id,
                      new_driver_id: driverId,
                      reason: 'admin_reassign',
                    });
                  }}
                >
                  Reatribuir
                </button>
                <button
                  className="ghost"
                  disabled={!canAct(role)}
                  onClick={() => {
                    const reason = window.prompt('Motivo para encerrar');
                    if (!reason) return;
                    gateway.send('admin_force_complete', {
                      ride_id: ride.ride_id,
                      reason,
                    });
                  }}
                >
                  Encerrar
                </button>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
