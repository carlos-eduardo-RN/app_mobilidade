import { useMemo, useState } from 'react';
import { useAsyncData } from '../hooks/useAsyncData';
import { listAdminRides } from '../services/adminService';
import { EmptyState, ErrorState, LoadingState } from '../components/ui/DataState';

/** Tela de categorias usando agrupamento por cidade/categoria das corridas. */
export function CategoriesPage() {
  const [category, setCategory] = useState('');

  const { data, loading, error, reload } = useAsyncData(
    () => listAdminRides({ page: 1, limit: 200, city: category || undefined, sortOrder: 'desc' }),
    [category]
  );

  const grouped = useMemo(() => {
    const counter = new Map<string, number>();
    (data?.data ?? []).forEach((ride) => {
      const key = 'categoria_nao_informada';
      counter.set(key, (counter.get(key) ?? 0) + 1);
    });
    return Array.from(counter.entries()).map(([name, total]) => ({ name, total }));
  }, [data?.data]);

  return (
    <section className="card">
      <header>
        <h3>Categorias</h3>
        <span className="muted">Filtro por categoria/cidade aplicado em /api/admin/rides</span>
      </header>

      <div className="filters-row">
        <input placeholder="Categoria/Cidade" value={category} onChange={(event) => setCategory(event.target.value)} />
        <button className="ghost" onClick={reload}>Aplicar</button>
      </div>

      {loading ? <LoadingState /> : null}
      {error ? <ErrorState message={error} onRetry={reload} /> : null}
      {!loading && !error && grouped.length === 0 ? <EmptyState label="Nenhuma categoria encontrada." /> : null}

      {!loading && !error && grouped.length > 0 ? (
        <div className="table">
          <div className="table-row head table-row-categories">
            <span>Categoria</span>
            <span>Total de corridas</span>
          </div>
          {grouped.map((item) => (
            <div className="table-row table-row-categories" key={item.name}>
              <span>{item.name}</span>
              <span>{item.total}</span>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
