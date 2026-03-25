import { useAsyncData } from '../hooks/useAsyncData';
import { listAdminLogs } from '../services/adminService';
import { EmptyState, ErrorState, LoadingState } from '../components/ui/DataState';

/** Tela de saques baseada em logs/auditoria de eventos financeiros. */
export function WithdrawalsPage() {
  const { data, loading, error, reload } = useAsyncData(
    () => listAdminLogs({ page: 1, limit: 100, type: ['WITHDRAWAL', 'WALLET_WITHDRAWAL'] }),
    []
  );

  return (
    <section className="card">
      <header>
        <h3>Saques</h3>
        <span className="muted">Eventos de saque via /api/admin/logs</span>
      </header>

      {loading ? <LoadingState /> : null}
      {error ? <ErrorState message={error} onRetry={reload} /> : null}
      {!loading && !error && data && data.data.length === 0 ? (
        <EmptyState label="Nenhuma solicitacao de saque encontrada." />
      ) : null}

      {!loading && !error && data && data.data.length > 0 ? (
        <div className="table">
          <div className="table-row head table-row-withdrawals">
            <span>ID</span>
            <span>Acao</span>
            <span>Admin</span>
            <span>Entidade</span>
            <span>Criado em</span>
          </div>
          {data.data.map((item) => (
            <div className="table-row table-row-withdrawals" key={item.id}>
              <span>{item.id}</span>
              <span className="pill">{item.action}</span>
              <span>{item.adminId}</span>
              <span>{item.entityType ?? '-'}</span>
              <span>{new Date(item.createdAt).toLocaleString()}</span>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
