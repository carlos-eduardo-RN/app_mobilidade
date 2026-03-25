export function LoadingState({ label = 'Carregando...' }: { label?: string }) {
  return <div className="empty">{label}</div>;
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="card">
      <header>
        <h3>Erro</h3>
      </header>
      <p className="muted">{message}</p>
      {onRetry ? (
        <button className="ghost" onClick={onRetry}>
          Tentar novamente
        </button>
      ) : null}
    </div>
  );
}

export function EmptyState({ label }: { label: string }) {
  return <div className="empty">{label}</div>;
}
