import { clearAuthState, getAuthState } from '../store/authStore';

/** Topbar com usuário logado e atalhos operacionais. */
export function AdminTopbar({ onLogout }: { onLogout: () => void }) {
  const auth = getAuthState();

  return (
    <header className="topbar">
      <div>
        <h2>Central Administrativa</h2>
        <p>Painel operacional em tempo real</p>
      </div>

      <div className="topbar-right">
        <div className="badge ok">online</div>
        <div className="card-inline">
          <strong>{auth.userId ?? 'admin'}</strong>
          <span className="muted">{auth.role ?? 'admin'}</span>
        </div>
        <button
          className="ghost"
          onClick={() => {
            clearAuthState();
            onLogout();
          }}
        >
          Sair
        </button>
      </div>
    </header>
  );
}
