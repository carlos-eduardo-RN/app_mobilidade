import { NavLink } from 'react-router-dom';
import { NAV_ITEMS } from './navigation';

/** Sidebar fixa do painel administrativo. */
export function AdminSidebar() {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">VDM</div>
        <div>
          <strong>Painel Admin</strong>
          <span className="muted">Gestao de mobilidade</span>
        </div>
      </div>

      <nav className="menu-stack">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
