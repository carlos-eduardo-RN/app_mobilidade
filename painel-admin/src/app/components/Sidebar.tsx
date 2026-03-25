import type { Role } from '../types';
import { useLocation, useNavigate } from 'react-router-dom';

type NavItem = {
  id: string;
  label: string;
  path: string;
  enabled: boolean;
};

const navItems: NavItem[] = [
  { id: 'painel', label: 'Painel', path: '/', enabled: true },
  { id: 'corridas', label: 'Corridas', path: '/corridas', enabled: true },
  { id: 'mapa', label: 'Mapa', path: '/mapa', enabled: true },
  { id: 'motoristas', label: 'Motoristas', path: '/motoristas', enabled: true },
  { id: 'passageiros', label: 'Passageiros', path: '/passageiros', enabled: true },
  { id: 'incidentes', label: 'Incidentes', path: '/incidentes', enabled: true },
  { id: 'auditoria', label: 'Auditoria', path: '/auditoria', enabled: true },
  { id: 'relatorios', label: 'Relatorios', path: '/relatorios', enabled: true },
];

function mapRole(role: Role) {
  if (role === 'operator') return 'Operador';
  if (role === 'support') return 'Suporte';
  return 'Administrador';
}

export function Sidebar({
  role,
}: {
  role: Role;
}) {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">VDM</div>
        <div>
          <strong>Painel Admin</strong>
          <span className="muted">Perfil: {mapRole(role)}</span>
        </div>
      </div>
      <nav>
        {navItems.map((item) => (
          <button
            key={item.id}
            className={`nav-item ${
              (item.path === '/' && location.pathname === '/') ||
              (item.path !== '/' && location.pathname === item.path)
                ? 'active'
                : ''
            }`}
            onClick={() => navigate(item.path)}
            disabled={!item.enabled}
            title={item.enabled ? '' : 'Em breve'}
            aria-disabled={!item.enabled}
          >
            {item.label}
          </button>
        ))}
      </nav>
    </aside>
  );
}
