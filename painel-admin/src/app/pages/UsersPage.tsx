import { useState } from 'react';
import { useAsyncData } from '../hooks/useAsyncData';
import {
  banAdminUser,
  getAdminUserById,
  listAdminUsers,
  unbanAdminUser,
  updateAdminUser,
  type AdminUser,
} from '../services/adminService';
import { EmptyState, ErrorState, LoadingState } from '../components/ui/DataState';

/** Tela de usuários com busca e paginação básica. */
export function UsersPage() {
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [formState, setFormState] = useState({ name: '', email: '', phone: '', role: 'PASSENGER' });

  const { data, loading, error, reload } = useAsyncData(
    () => listAdminUsers({ search, status: role || undefined, page: 1, limit: 50, sortOrder: 'desc' }),
    [search, role]
  );

  async function handleBan(userId: string) {
    const reason = window.prompt('Motivo do bloqueio:');
    if (!reason) return;

    setBusyUserId(userId);
    setActionMessage(null);
    try {
      const response = await banAdminUser(userId, reason);
      setActionMessage(response.message || 'Usuário bloqueado com sucesso.');
      await reload();
    } catch (banError) {
      setActionMessage(banError instanceof Error ? banError.message : 'Falha ao bloquear usuário.');
    } finally {
      setBusyUserId(null);
    }
  }

  async function handleOpenDetails(userId: string) {
    setDetailLoading(true);
    setActionMessage(null);
    try {
      const response = await getAdminUserById(userId);
      const user = response.data;
      setSelectedUser(user);
      setFormState({
        name: user.name ?? '',
        email: user.email ?? '',
        phone: user.phone ?? '',
        role: user.role ?? 'PASSENGER',
      });
    } catch (detailError) {
      setActionMessage(
        detailError instanceof Error ? detailError.message : 'Falha ao buscar detalhes do usuario.'
      );
      setSelectedUser(null);
    } finally {
      setDetailLoading(false);
    }
  }

  async function handleSaveUser() {
    if (!selectedUser) return;
    setBusyUserId(selectedUser.id);
    setActionMessage(null);
    try {
      await updateAdminUser(selectedUser.id, {
        name: formState.name || undefined,
        email: formState.email || undefined,
        phone: formState.phone || undefined,
        role: formState.role,
      });
      setActionMessage('Usuario atualizado com sucesso.');
      await reload();
      await handleOpenDetails(selectedUser.id);
    } catch (saveError) {
      setActionMessage(saveError instanceof Error ? saveError.message : 'Falha ao atualizar usuario.');
    } finally {
      setBusyUserId(null);
    }
  }

  async function handleUnban(userId: string) {
    if (!window.confirm('Deseja desbloquear este usuário?')) return;

    setBusyUserId(userId);
    setActionMessage(null);
    try {
      const response = await unbanAdminUser(userId);
      setActionMessage(response.message || 'Usuário desbloqueado com sucesso.');
      await reload();
    } catch (unbanError) {
      setActionMessage(unbanError instanceof Error ? unbanError.message : 'Falha ao desbloquear usuário.');
    } finally {
      setBusyUserId(null);
    }
  }

  return (
    <section className="card">
      <header>
        <h3>Usuários</h3>
        <span className="muted">Consulta via /api/admin/users</span>
      </header>

      <div className="filters-row">
        <input placeholder="Buscar por email/telefone" value={search} onChange={(event) => setSearch(event.target.value)} />
        <select value={role} onChange={(event) => setRole(event.target.value)}>
          <option value="">Todos os perfis</option>
          <option value="PASSENGER">Passageiro</option>
          <option value="DRIVER">Motorista</option>
          <option value="ADMIN">Admin</option>
        </select>
        <button className="ghost" onClick={reload}>Atualizar</button>
      </div>
      {actionMessage ? <span className="muted">{actionMessage}</span> : null}

      {loading ? <LoadingState /> : null}
      {error ? <ErrorState message={error} onRetry={reload} /> : null}
      {!loading && !error && data && data.data.length === 0 ? <EmptyState label="Nenhum usuario encontrado." /> : null}

      {!loading && !error && data && data.data.length > 0 ? (
        <div className="split-grid">
          <div className="table">
            <div className="table-row head table-row-users">
              <span>ID</span>
              <span>Email</span>
              <span>Telefone</span>
              <span>Perfil</span>
              <span>Criado em</span>
              <span>Ações</span>
            </div>
            {data.data.map((user) => (
              <div className="table-row table-row-users" key={user.id}>
                <span>{user.id}</span>
                <span>{user.email ?? '-'}</span>
                <span>{user.phone ?? '-'}</span>
                <span className="pill">{user.role}</span>
                <span>{user.createdAt ? new Date(user.createdAt).toLocaleString() : '-'}</span>
                <span className="actions">
                  <button className="ghost" disabled={busyUserId === user.id} onClick={() => handleOpenDetails(user.id)}>
                    Detalhes
                  </button>
                  <button className="ghost" disabled={busyUserId === user.id} onClick={() => handleBan(user.id)}>
                    Bloquear
                  </button>
                  <button className="ghost" disabled={busyUserId === user.id} onClick={() => handleUnban(user.id)}>
                    Desbloquear
                  </button>
                </span>
              </div>
            ))}
          </div>

          <aside className="card detail-card">
            <header>
              <h3>Detalhe do usuário</h3>
              <span className="muted">GET/PUT /api/admin/users/:userId</span>
            </header>
            {detailLoading ? <LoadingState label="Carregando detalhes..." /> : null}
            {!detailLoading && !selectedUser ? <EmptyState label="Selecione um usuário para editar." /> : null}
            {!detailLoading && selectedUser ? (
              <>
                <label>
                  Nome
                  <input
                    value={formState.name}
                    onChange={(event) => setFormState((prev) => ({ ...prev, name: event.target.value }))}
                  />
                </label>
                <label>
                  Email
                  <input
                    type="email"
                    value={formState.email}
                    onChange={(event) => setFormState((prev) => ({ ...prev, email: event.target.value }))}
                  />
                </label>
                <label>
                  Telefone
                  <input
                    value={formState.phone}
                    onChange={(event) => setFormState((prev) => ({ ...prev, phone: event.target.value }))}
                  />
                </label>
                <label>
                  Perfil
                  <select
                    value={formState.role}
                    onChange={(event) => setFormState((prev) => ({ ...prev, role: event.target.value }))}
                  >
                    <option value="PASSENGER">PASSENGER</option>
                    <option value="DRIVER">DRIVER</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                </label>

                <div className="actions">
                  <button className="primary" disabled={busyUserId === selectedUser.id} onClick={handleSaveUser}>
                    Salvar alterações
                  </button>
                </div>
              </>
            ) : null}
          </aside>
        </div>
      ) : null}
    </section>
  );
}
