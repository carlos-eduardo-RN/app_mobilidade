import type { Incident } from '../types';

const severityLabels: Record<Incident['severity'], string> = {
  low: 'baixa',
  medium: 'media',
  high: 'alta',
};

export function IncidentFeed({ incidents }: { incidents: Incident[] }) {
  return (
    <div className="card">
      <header>
        <h3>Incidentes</h3>
        <span className="muted">Escalacoes e anomalias</span>
      </header>
      {incidents.length === 0 ? (
        <div className="empty">Nenhum incidente reportado.</div>
      ) : (
        <ul className="feed">
          {incidents.map((incident) => (
            <li key={incident.id}>
              <strong>{incident.title}</strong>
              <span className={`pill ${incident.severity}`}>
                {severityLabels[incident.severity] ?? incident.severity}
              </span>
              <p>{incident.details}</p>
              <small>{new Date(incident.created_at).toLocaleString()}</small>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
