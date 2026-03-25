import { useState } from 'react';
import { useAsyncData } from '../hooks/useAsyncData';
import { listAdminUsers } from '../services/adminService';
import { EmptyState, ErrorState, LoadingState } from '../components/ui/DataState';

/** Tela de motoristas com filtros de busca e status. */
export function DriversPage() {
  const [search, setSearch] = useState('');

  const { data, loading, error, reload } = useAsyncData(
    () => listAdminUsers({ status: 'DRIVER', search, page: 1, limit: 100, sortOrder: 'desc' }),
    [search]
  );

  return (
    <section className="card">
      <header>
        <h3>Motoristas</h3>
        <span className="muted">Consulta de motoristas via /api/admin/users</span>
      </header>

      <div className="filters-row">
        <input placeholder="Buscar motorista" value={search} onChange={(event) => setSearch(event.target.value)} />
        <button className="ghost" onClick={reload}>Atualizar</button>
      </div>

      {loading ? <LoadingState /> : null}
      {error ? <ErrorState message={error} onRetry={reload} /> : null}
      {!loading && !error && data && data.data.length === 0 ? <EmptyState label="Nenhum motorista encontrado." /> : null}

      {!loading && !error && data && data.data.length > 0 ? (
        <div className="table">
          <div className="table-row head table-row-users">
            <span>ID</span>
            <span>Email</span>
            <span>Telefone</span>
            <span>Verificacao</span>
            <span>Criado em</span>
          </div>
          {data.data.map((driver) => (
            <div className="table-row table-row-users" key={driver.id}>
              <span>{driver.id}</span>
              <span>{driver.email ?? '-'}</span>
              <span>{driver.phone ?? '-'}</span>
              <span className="pill">{driver.isVerified ? 'Verificado' : 'Nao verificado'}</span>
              <span>{driver.createdAt ? new Date(driver.createdAt).toLocaleString() : '-'}</span>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
