import { useState } from 'react';
import { useAsyncData } from '../hooks/useAsyncData';
import {
  cancelAdminRide,
  getAdminRideById,
  listAdminLogs,
  listAdminRides,
  type ActionLog,
  type AdminRide,
} from '../services/adminService';
import { EmptyState, ErrorState, LoadingState } from '../components/ui/DataState';

/** Tela de corridas com filtros por data, status e categoria/cidade. */
export function RidesPage() {
  const [status, setStatus] = useState('');
  const [city, setCity] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [busyRideId, setBusyRideId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [selectedRide, setSelectedRide] = useState<AdminRide | null>(null);
  const [selectedRideLogs, setSelectedRideLogs] = useState<ActionLog[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelWithRefund, setCancelWithRefund] = useState(false);

  const { data, loading, error, reload } = useAsyncData(
    () =>
      listAdminRides({
        page: 1,
        limit: 50,
        sortOrder: 'desc',
        status: status ? [status] : undefined,
        city: city || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      }),
    [status, city, startDate, endDate]
  );

  async function handleCancelRide(rideId: string) {
    const reason = cancelReason.trim();
    if (reason.length < 5) {
      setActionMessage('Informe um motivo de pelo menos 5 caracteres para cancelar a corrida.');
      return;
    }

    setBusyRideId(rideId);
    setActionMessage(null);
    try {
      const response = await cancelAdminRide(rideId, reason, cancelWithRefund);
      setActionMessage(response.message || 'Corrida cancelada com sucesso.');
      setCancelReason('');
      setCancelWithRefund(false);
      await reload();
      if (selectedRide?.id === rideId) {
        await handleOpenDetails(rideId);
      }
    } catch (cancelError) {
      setActionMessage(cancelError instanceof Error ? cancelError.message : 'Falha ao cancelar corrida.');
    } finally {
      setBusyRideId(null);
    }
  }

  async function handleOpenDetails(rideId: string) {
    setDetailLoading(true);
    setActionMessage(null);
    try {
      const [rideResponse, logsResponse] = await Promise.all([
        getAdminRideById(rideId),
        listAdminLogs({
          page: 1,
          limit: 200,
          sortOrder: 'desc',
        }),
      ]);

      setSelectedRide(rideResponse.data);
      setSelectedRideLogs(
        logsResponse.data.filter((log) => log.entityId === rideId || log.action.toLowerCase().includes(rideId.toLowerCase()))
      );
    } catch (detailError) {
      setActionMessage(
        detailError instanceof Error ? detailError.message : 'Falha ao carregar detalhes da corrida.'
      );
      setSelectedRide(null);
      setSelectedRideLogs([]);
    } finally {
      setDetailLoading(false);
    }
  }

  return (
    <section className="card">
      <header>
        <h3>Corridas</h3>
        <span className="muted">Filtros por data, status e categoria/cidade via /api/admin/rides</span>
      </header>

      <div className="filters-row filters-grid">
        <select value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="">Todos status</option>
          <option value="requested">Solicitada</option>
          <option value="accepted">Aceita</option>
          <option value="driver_arrived">Motorista chegou</option>
          <option value="in_progress">Em andamento</option>
          <option value="completed">Concluida</option>
          <option value="cancelled">Cancelada</option>
        </select>
        <input placeholder="Categoria/Cidade" value={city} onChange={(event) => setCity(event.target.value)} />
        <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
        <input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
        <button className="ghost" onClick={reload}>Aplicar</button>
      </div>
      {actionMessage ? <span className="muted">{actionMessage}</span> : null}

      {loading ? <LoadingState /> : null}
      {error ? <ErrorState message={error} onRetry={reload} /> : null}
      {!loading && !error && data && data.data.length === 0 ? <EmptyState label="Nenhuma corrida encontrada." /> : null}

      {!loading && !error && data && data.data.length > 0 ? (
        <div className="split-grid">
          <div className="table">
            <div className="table-row head table-row-ride">
              <span>ID</span>
              <span>Status</span>
              <span>Motorista</span>
              <span>Passageiro</span>
              <span>Valor</span>
              <span>Criada em</span>
              <span>Ações</span>
            </div>
            {data.data.map((ride) => (
              <div className="table-row table-row-ride" key={ride.id}>
                <span>{ride.id}</span>
                <span className="pill">{ride.status}</span>
                <span>{ride.driverId ?? '-'}</span>
                <span>{ride.passengerId ?? '-'}</span>
                <span>R$ {Number(ride.fare ?? 0).toFixed(2)}</span>
                <span>{new Date(ride.createdAt).toLocaleString()}</span>
                <span className="actions">
                  <button className="ghost" disabled={busyRideId === ride.id} onClick={() => handleOpenDetails(ride.id)}>
                    Detalhes
                  </button>
                  <button className="ghost" disabled={busyRideId === ride.id} onClick={() => handleCancelRide(ride.id)}>
                    Cancelar
                  </button>
                </span>
              </div>
            ))}
          </div>

          <aside className="card detail-card">
            <header>
              <h3>Detalhe da corrida</h3>
              <span className="muted">GET /api/admin/rides/:rideId</span>
            </header>
            {detailLoading ? <LoadingState label="Carregando detalhes..." /> : null}
            {!detailLoading && !selectedRide ? <EmptyState label="Selecione uma corrida para visualizar." /> : null}
            {!detailLoading && selectedRide ? (
              <>
                <div className="detail-grid">
                  <span>ID</span>
                  <strong>{selectedRide.id}</strong>
                  <span>Status</span>
                  <strong>{selectedRide.status}</strong>
                  <span>Passageiro</span>
                  <strong>{selectedRide.passengerId ?? '-'}</strong>
                  <span>Motorista</span>
                  <strong>{selectedRide.driverId ?? '-'}</strong>
                  <span>Valor</span>
                  <strong>R$ {Number(selectedRide.fare ?? 0).toFixed(2)}</strong>
                  <span>Criada em</span>
                  <strong>{new Date(selectedRide.createdAt).toLocaleString()}</strong>
                </div>

                <div className="cancel-box">
                  <h4>Cancelar corrida</h4>
                  <textarea
                    rows={3}
                    placeholder="Motivo do cancelamento administrativo"
                    value={cancelReason}
                    onChange={(event) => setCancelReason(event.target.value)}
                  />
                  <label className="check-row">
                    <input
                      type="checkbox"
                      checked={cancelWithRefund}
                      onChange={(event) => setCancelWithRefund(event.target.checked)}
                    />
                    Aplicar reembolso automaticamente
                  </label>
                  <button
                    className="ghost"
                    disabled={busyRideId === selectedRide.id}
                    onClick={() => handleCancelRide(selectedRide.id)}
                  >
                    {busyRideId === selectedRide.id ? 'Cancelando...' : 'Confirmar cancelamento'}
                  </button>
                </div>

                <div className="audit-box">
                  <h4>Histórico da corrida</h4>
                  {selectedRideLogs.length === 0 ? (
                    <span className="muted">Nenhum log encontrado para esta corrida.</span>
                  ) : (
                    <ul className="audit-list">
                      {selectedRideLogs.map((log) => (
                        <li key={log.id}>
                          <strong>{log.action}</strong>
                          <span className="muted">Admin: {log.adminId}</span>
                          <span className="muted">{new Date(log.createdAt).toLocaleString()}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </>
            ) : null}
          </aside>
        </div>
      ) : null}
    </section>
  );
}
