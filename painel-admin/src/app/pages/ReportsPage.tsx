import { useState } from 'react';
import { useAsyncData } from '../hooks/useAsyncData';
import { exportAdminData, getAdminStats, listAdminLogs } from '../services/adminService';
import { EmptyState, ErrorState, LoadingState } from '../components/ui/DataState';
import { MetricCard } from '../components/ui/MetricCard';

/** Tela de relatórios com exportação e auditoria. */
export function ReportsPage() {
  const [exporting, setExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState<string | null>(null);

  const { data, loading, error, reload } = useAsyncData(async () => {
    const [stats, logs] = await Promise.all([
      getAdminStats(),
      listAdminLogs({ page: 1, limit: 50, sortOrder: 'desc' }),
    ]);
    return { stats: stats.data, logs: logs.data };
  }, []);

  async function handleExport() {
    setExporting(true);
    setExportMessage(null);
    try {
      const result = await exportAdminData({
        format: 'csv',
        type: 'dashboard',
        fileName: `relatorio_admin_${Date.now()}`,
      });
      setExportMessage(`Exportacao criada: ${result.data.fileName ?? result.data.id}`);
    } catch (exportError) {
      setExportMessage(
        exportError instanceof Error ? exportError.message : 'Falha ao exportar dados'
      );
    } finally {
      setExporting(false);
    }
  }

  if (loading) return <LoadingState label="Carregando relatorios..." />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!data) return <EmptyState label="Sem dados para relatorios." />;

  return (
    <section className="card">
      <header>
        <h3>Relatorios</h3>
        <span className="muted">Indicadores e exportacao via /api/admin/export</span>
      </header>

      <section className="kpi-grid">
        <MetricCard title="Total de usuarios" value={data.stats.totalUsers} />
        <MetricCard title="Total de motoristas" value={data.stats.totalDrivers} />
        <MetricCard title="Total de corridas" value={data.stats.totalRides} />
        <MetricCard title="Corridas em andamento" value={data.stats.ongoingRides} />
      </section>

      <div className="actions">
        <button className="primary" disabled={exporting} onClick={handleExport}>
          {exporting ? 'Exportando...' : 'Exportar CSV'}
        </button>
        {exportMessage ? <span className="muted">{exportMessage}</span> : null}
      </div>

      <div className="table">
        <div className="table-row head table-row-logs">
          <span>Acao</span>
          <span>Admin</span>
          <span>Entidade</span>
          <span>Criado em</span>
        </div>
        {data.logs.map((log) => (
          <div className="table-row table-row-logs" key={log.id}>
            <span>{log.action}</span>
            <span>{log.adminId}</span>
            <span>{log.entityType ?? '-'}</span>
            <span>{new Date(log.createdAt).toLocaleString()}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
