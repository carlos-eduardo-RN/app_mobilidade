import { Outlet } from 'react-router-dom';
import { AdminSidebar } from './AdminSidebar';
import { AdminTopbar } from './AdminTopbar';

/** Layout principal com sidebar fixa, topbar e área de conteúdo. */
export function AdminLayout({ onLogout }: { onLogout: () => void }) {
  return (
    <div className="app-shell">
      <AdminSidebar />
      <div className="app-main">
        <AdminTopbar onLogout={onLogout} />
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
