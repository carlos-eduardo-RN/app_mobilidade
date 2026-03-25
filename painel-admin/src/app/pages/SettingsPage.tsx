import { useAsyncData } from '../hooks/useAsyncData';
import { getAdminHealth, listAdminNotifications } from '../services/adminService';
import { EmptyState, ErrorState, LoadingState } from '../components/ui/DataState';

/** Tela de configurações operacionais com status de saúde e notificações. */
export function SettingsPage() {
  const { data, loading, error, reload } = useAsyncData(async () => {
    const [health, notifications] = await Promise.all([
      getAdminHealth(),
      listAdminNotifications(false),
    ]);

    return {
      health: health.data,
      notifications: notifications.data,
    };
  }, []);

  if (loading) return <LoadingState label="Carregando configuracoes..." />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!data) return <EmptyState label="Sem dados de configuracao." />;

  return (
    <section className="grid-2">
      <article className="card">
        <header>
          <h3>Saúde do sistema</h3>
        </header>
        <span className="badge ok">{data.health.status}</span>
        <pre className="json-preview">{JSON.stringify(data.health.services ?? {}, null, 2)}</pre>
      </article>

      <article className="card">
        <header>
          <h3>Notificacoes</h3>
        </header>
        {data.notifications.length === 0 ? (
          <EmptyState label="Nenhuma notificacao pendente." />
        ) : (
          <ul className="feed">
            {data.notifications.map((notification) => (
              <li key={notification.id}>
                <strong>{notification.title ?? 'Notificacao'}</strong>
                <p>{notification.message ?? '-'}</p>
                <small>{notification.createdAt ? new Date(notification.createdAt).toLocaleString() : '-'}</small>
              </li>
            ))}
          </ul>
        )}
      </article>
    </section>
  );
}
