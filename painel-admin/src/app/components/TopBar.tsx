import type { SystemHealth } from '../types';

export function TopBar({
  connectionStatus,
  systemHealth,
  onLogout,
}: {
  connectionStatus: 'disconnected' | 'connecting' | 'connected';
  systemHealth: SystemHealth | null;
  onLogout: () => void;
}) {
  const statusTone = connectionStatus === 'connected' ? 'ok' : 'warn';
  const connectionLabel =
    connectionStatus === 'connected'
      ? 'conectado'
      : connectionStatus === 'connecting'
        ? 'conectando'
        : 'desconectado';
  const systemStatus = systemHealth?.status ?? 'unknown';
  const systemLabel =
    systemStatus === 'ok'
      ? 'ok'
      : systemStatus === 'degraded'
        ? 'degradado'
        : systemStatus === 'down'
          ? 'fora'
          : 'desconhecido';

  return (
    <header className="topbar">
      <div>
        <h2>Central de Operacoes</h2>
        <p>Visibilidade e controle em tempo real</p>
      </div>
      <div className="topbar-right">
        <div className={`badge ${statusTone}`}>
          {connectionLabel}
        </div>
        <div className={`badge ${systemStatus}`}>
          {systemLabel}
        </div>
        <button className="ghost" onClick={onLogout}>
          Sair
        </button>
      </div>
    </header>
  );
}
