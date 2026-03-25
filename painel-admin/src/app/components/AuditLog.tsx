import type { AuditEvent } from '../types';

export function AuditLog({ events }: { events: AuditEvent[] }) {
  return (
    <div className="card">
      <header>
        <h3>Log de auditoria</h3>
        <span className="muted">Trilha imutavel de operacoes</span>
      </header>
      {events.length === 0 ? (
        <div className="empty">Nenhum evento de auditoria ainda.</div>
      ) : (
        <ul className="feed">
          {events.map((event) => (
            <li key={event.id}>
              <strong>{event.action}</strong>
              <span className="muted">{event.actor_id}</span>
              <p>Alvo: {event.target_id}</p>
              <small>{new Date(event.created_at).toLocaleString()}</small>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
