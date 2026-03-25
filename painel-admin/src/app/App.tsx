import { useEffect, useRef, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AdminLayout } from './layout/AdminLayout';
import { DashboardPage } from './pages/DashboardPage';
import { UsersPage } from './pages/UsersPage';
import { DriversPage } from './pages/DriversPage';
import { RidesPage } from './pages/RidesPage';
import { PaymentsPage } from './pages/PaymentsPage';
import { WithdrawalsPage } from './pages/WithdrawalsPage';
import { CategoriesPage } from './pages/CategoriesPage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';
import { getAuthState, setAuthState, clearAuthState } from './store/authStore';
import type { Role } from './types';
import { RealtimeGateway } from './gateway/realtimeGateway';
import { bindGateway } from './store/realtimeStore';

function mapRole(role?: string | null): Role {
  const normalized = (role ?? '').toUpperCase();
  if (normalized === 'SUPPORT') return 'support';
  if (normalized === 'OPERATOR') return 'operator';
  return 'admin';
}

export function App() {
  const [auth, setAuth] = useState(getAuthState());
  const [credentials, setCredentials] = useState({ email: '', password: '' });
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginBusy, setLoginBusy] = useState(false);
  const realtimeGatewayRef = useRef<RealtimeGateway | null>(null);
  const realtimeBoundRef = useRef(false);

  useEffect(() => {
    const realtimeUrl = import.meta.env.VITE_REALTIME_URL ?? '';

    if (!auth.token || !realtimeUrl) {
      realtimeGatewayRef.current?.disconnect();
      return;
    }

    if (!realtimeGatewayRef.current) {
      realtimeGatewayRef.current = new RealtimeGateway();
    }

    if (!realtimeBoundRef.current) {
      bindGateway(realtimeGatewayRef.current);
      realtimeBoundRef.current = true;
    }

    realtimeGatewayRef.current.connect(realtimeUrl, auth.token);
  }, [auth.token]);

  if (!auth.token || !auth.role) {
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? '';

    return (
      <div className="auth-screen">
        <div className="auth-card">
          <h1>VouDeMoto Admin</h1>
          <p>Entre com suas credenciais de administrador.</p>
          <label>
            Email
            <input
              type="email"
              placeholder="admin@exemplo.com"
              value={credentials.email}
              onChange={(event) =>
                setCredentials({ ...credentials, email: event.target.value })
              }
            />
          </label>
          <label>
            Senha
            <input
              type="password"
              placeholder="********"
              value={credentials.password}
              onChange={(event) =>
                setCredentials({ ...credentials, password: event.target.value })
              }
            />
          </label>
          {loginError ? <p className="muted">{loginError}</p> : null}
          <button
            className="primary"
            disabled={loginBusy}
            onClick={() => {
              if (!apiBaseUrl) {
                setLoginError('VITE_API_BASE_URL ausente.');
                return;
              }
              if (!credentials.email || !credentials.password) {
                setLoginError('Email e senha sao obrigatorios.');
                return;
              }

              setLoginBusy(true);
              setLoginError(null);
              const loginUrl = `${apiBaseUrl.replace(/\/$/, '')}/login`;

              fetch(loginUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                  email: credentials.email,
                  password: credentials.password,
                }),
              })
                .then(async (response) => {
                  if (!response.ok) {
                    throw new Error('Credenciais invalidas');
                  }
                  return response.json();
                })
                .then((data) => {
                  const token = data?.tokens?.accessToken as string | undefined;
                  if (!token) {
                    throw new Error('Token ausente na resposta');
                  }

                  const nextAuth = {
                    token,
                    role: mapRole(data?.admin?.role),
                    userId: data?.admin?.id ?? null,
                  };

                  setAuthState(nextAuth);
                  setAuth(nextAuth);
                })
                .catch((error) => {
                  setLoginError(
                    error instanceof Error ? error.message : 'Falha no login'
                  );
                })
                .finally(() => {
                  setLoginBusy(false);
                });
            }}
          >
            {loginBusy ? 'Entrando...' : 'Entrar'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            <AdminLayout
              onLogout={() => {
                clearAuthState();
                setAuth(getAuthState());
              }}
            />
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="usuarios" element={<UsersPage />} />
          <Route path="motoristas" element={<DriversPage />} />
          <Route path="corridas" element={<RidesPage />} />
          <Route path="pagamentos" element={<PaymentsPage />} />
          <Route path="saques" element={<WithdrawalsPage />} />
          <Route path="categorias" element={<CategoriesPage />} />
          <Route path="relatorios" element={<ReportsPage />} />
          <Route path="configuracoes" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
