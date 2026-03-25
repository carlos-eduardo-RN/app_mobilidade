import { useMemo, useState } from 'react';
import { useAsyncData } from '../hooks/useAsyncData';
import {
  getAdminStats,
  listAdminUsers,
  listAdminRides,
  listAdminPayments,
  listAdminLogs,
  type AdminRide,
} from '../services/adminService';
import { MetricCard } from '../components/ui/MetricCard';
import { EmptyState, ErrorState, LoadingState } from '../components/ui/DataState';
import { SimpleLineChart } from '../components/charts/SimpleLineChart';
import { SimpleBarChart } from '../components/charts/SimpleBarChart';

type Period = '7d' | '30d' | '365d';

function normalizeStatus(status: string) {
  return status.toUpperCase();
}

function formatBucket(date: Date, period: Period) {
  if (period === '365d') {
    return `${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
  }
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function makeSeries(rides: AdminRide[], period: Period) {
  const now = new Date();
  const days = period === '7d' ? 7 : period === '30d' ? 30 : 365;
  const start = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

  const filtered = rides.filter((ride) => new Date(ride.createdAt) >= start);
  const rideMap = new Map<string, number>();
  const revenueMap = new Map<string, number>();

  filtered.forEach((ride) => {
    const createdAt = new Date(ride.createdAt);
    const key = formatBucket(createdAt, period);
    rideMap.set(key, (rideMap.get(key) ?? 0) + 1);
    revenueMap.set(key, (revenueMap.get(key) ?? 0) + Number(ride.fare ?? 0));
  });

  const rideSeries = Array.from(rideMap.entries()).map(([label, value]) => ({ label, value }));
  const revenueSeries = Array.from(revenueMap.entries()).map(([label, value]) => ({
    label,
    value: Number(value.toFixed(2)),
  }));

  return { rideSeries, revenueSeries };
}

/** Página principal com cards de métricas e gráficos por período. */
export function DashboardPage() {
  const [period, setPeriod] = useState<Period>('7d');

  const { data, loading, error, reload } = useAsyncData(async () => {
    const [statsRes, usersRes, driversRes, ridesRes, paymentsRes, logsRes] = await Promise.all([
      getAdminStats(),
      listAdminUsers({ limit: 200, page: 1 }),
      listAdminUsers({ status: 'DRIVER', limit: 200, page: 1 }),
      listAdminRides({ limit: 200, page: 1, sortOrder: 'desc' }),
      listAdminPayments({ limit: 200, page: 1, sortOrder: 'desc' }),
      listAdminLogs({ limit: 200, page: 1, sortOrder: 'desc' }),
    ]);

    const [acceptedRes, startedRes, completedRes, canceledRes] =
      await Promise.all([
        listAdminRides({ status: ['accepted'], limit: 1, page: 1 }),
        listAdminRides({ status: ['in_progress'], limit: 1, page: 1 }),
        listAdminRides({ status: ['completed'], limit: 1, page: 1 }),
        listAdminRides({ status: ['cancelled'], limit: 1, page: 1 }),
      ]);

    const rides = ridesRes.data ?? [];
    const payments = paymentsRes.data ?? [];
    const drivers = driversRes.data ?? [];
    const logs = logsRes.data ?? [];

    const verifiedDrivers = drivers.filter((driver) => driver.isVerified).length;
    const unverifiedDrivers = Math.max((statsRes.data.totalDrivers ?? 0) - verifiedDrivers, 0);

    const onlinePayments = payments.filter((payment) => {
      const method = `${payment.method ?? ''}`.toUpperCase();
      return method !== 'CASH' && method !== 'OFFLINE';
    }).length;

    const offlinePayments = payments.filter((payment) => {
      const method = `${payment.method ?? ''}`.toUpperCase();
      return method === 'CASH' || method === 'OFFLINE';
    }).length;

    const withdrawRequests = logs.filter((log) => log.action.toLowerCase().includes('withdraw')).length;

    const totalRevenue = payments.reduce((sum, payment) => sum + Number(payment.amount ?? 0), 0);
    const latestRides = [...rides]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 8);

    return {
      stats: statsRes.data,
      rides,
      latestRides,
      metrics: {
        totalUsers: statsRes.data.totalUsers ?? usersRes.total ?? usersRes.data.length,
        totalDrivers: statsRes.data.totalDrivers,
        verifiedDrivers,
        unverifiedDrivers,
        totalRides: statsRes.data.totalRides,
        acceptedRides: acceptedRes.total ?? 0,
        startedRides: startedRes.total ?? 0,
        completedRides: completedRes.total ?? 0,
        canceledRides: canceledRes.total ?? 0,
        totalRevenue,
        onlinePayments,
        offlinePayments,
        withdrawRequests,
        activeDrivers: statsRes.data.activeDrivers,
      },
    };
  }, [period]);

  const chartData = useMemo(() => makeSeries(data?.rides ?? [], period), [data?.rides, period]);

  if (loading) return <LoadingState label="Carregando dashboard..." />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!data) return <EmptyState label="Nao foi possivel carregar dados do dashboard." />;

  const m = data.metrics;

  return (
    <>
      <section className="section-toolbar">
        <h3>Visao geral do negocio</h3>
        <div className="actions">
          <button className={`ghost ${period === '7d' ? 'active' : ''}`} onClick={() => setPeriod('7d')}>
            7 dias
          </button>
          <button className={`ghost ${period === '30d' ? 'active' : ''}`} onClick={() => setPeriod('30d')}>
            Mes
          </button>
          <button className={`ghost ${period === '365d' ? 'active' : ''}`} onClick={() => setPeriod('365d')}>
            Ano
          </button>
        </div>
      </section>

      <section className="kpi-grid">
        <MetricCard title="Total de Usuarios" value={m.totalUsers} />
        <MetricCard
          title="Total de Motoristas"
          value={m.totalDrivers}
          subtitle={`Verificados: ${m.verifiedDrivers} | Nao verificados: ${m.unverifiedDrivers}`}
        />
        <MetricCard title="Total de Corridas" value={m.totalRides} />
        <MetricCard title="Corridas Aceitas" value={m.acceptedRides} />
        <MetricCard title="Corridas Iniciadas" value={m.startedRides} />
        <MetricCard title="Corridas Concluidas" value={m.completedRides} />
        <MetricCard title="Corridas Canceladas" value={m.canceledRides} />
        <MetricCard title="Faturamento Total" value={`R$ ${m.totalRevenue.toFixed(2)}`} />
        <MetricCard title="Pagamentos Online" value={m.onlinePayments} />
        <MetricCard title="Pagamentos Offline" value={m.offlinePayments} />
        <MetricCard title="Solicitacoes de Saque" value={m.withdrawRequests} />
        <MetricCard title="Motoristas Ativos" value={m.activeDrivers} />
      </section>

      <section className="grid-2">
        <SimpleLineChart title="Corridas por periodo" data={chartData.rideSeries} />
        <SimpleBarChart title="Receita por periodo" data={chartData.revenueSeries} />
      </section>

      <section className="card">
        <header>
          <h3>Ultimas corridas</h3>
        </header>
        {data.latestRides.length === 0 ? (
          <EmptyState label="Nenhuma corrida recente." />
        ) : (
          <div className="table">
            <div className="table-row head table-row-ride">
              <span>ID</span>
              <span>Status</span>
              <span>Motorista</span>
              <span>Passageiro</span>
              <span>Valor</span>
              <span>Criada em</span>
            </div>
            {data.latestRides.map((ride) => (
              <div className="table-row table-row-ride" key={ride.id}>
                <span>{ride.id}</span>
                <span className="pill">{normalizeStatus(ride.status)}</span>
                <span>{ride.driverId ?? '-'}</span>
                <span>{ride.passengerId ?? '-'}</span>
                <span>R$ {Number(ride.fare ?? 0).toFixed(2)}</span>
                <span>{new Date(ride.createdAt).toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
