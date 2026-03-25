import { apiRequest } from './httpClient';

export type ApiEnvelope<T> = {
  success: boolean;
  data: T;
  page?: number;
  total?: number;
  totalPages?: number;
};

export type AdminStats = {
  totalUsers: number;
  totalDrivers: number;
  totalRides: number;
  activeDrivers: number;
  ongoingRides: number;
  timestamp: string;
};

export type AdminUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  role: string;
  isVerified?: boolean;
  isActive?: boolean;
  createdAt?: string;
};

export type AdminRide = {
  id: string;
  passengerId?: string | null;
  driverId?: string | null;
  status: string;
  fare?: number | null;
  createdAt: string;
  updatedAt?: string;
};

export type AdminPayment = {
  id: string;
  amount?: number;
  status?: string;
  method?: string;
  createdAt?: string;
};

export type ActionLog = {
  id: string;
  action: string;
  adminId: string;
  entityType?: string;
  entityId?: string;
  createdAt: string;
};

export type HealthResponse = {
  status: string;
  uptime?: number;
  services?: Record<string, unknown>;
  metrics?: Record<string, unknown>;
};

export type ListQuery = {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
};

export type UserQuery = ListQuery & {
  status?: string;
};

export type RideQuery = ListQuery & {
  status?: string[];
  userId?: string;
  driverId?: string;
  city?: string;
  startDate?: string;
  endDate?: string;
};

export type PaymentQuery = ListQuery & {
  status?: string[];
  userId?: string;
  minAmount?: number;
  maxAmount?: number;
  startDate?: string;
  endDate?: string;
};

export type ExportPayload = {
  format: 'csv' | 'xlsx' | 'json';
  type?: string;
  startDate?: string;
  endDate?: string;
  fileName?: string;
};

export type NotificationItem = {
  id: string;
  title?: string;
  message?: string;
  read?: boolean;
  createdAt?: string;
};

export type ApiMessage = {
  success: boolean;
  message: string;
};

/** Busca estatísticas do dashboard administrativo. */
export async function getAdminStats() {
  return apiRequest<ApiEnvelope<AdminStats>>('/stats');
}

/** Lista usuários administrativos com paginação e filtros. */
export async function listAdminUsers(query: UserQuery = {}) {
  return apiRequest<ApiEnvelope<AdminUser[]>>('/users', { query });
}

/** Busca os detalhes administrativos de um usuário específico. */
export async function getAdminUserById(userId: string) {
  return apiRequest<ApiEnvelope<AdminUser>>(`/users/${userId}`);
}

/** Atualiza dados de um usuário no administrativo. */
export async function updateAdminUser(userId: string, updates: Partial<AdminUser>) {
  return apiRequest<ApiEnvelope<AdminUser>>(`/users/${userId}`, {
    method: 'PUT',
    body: updates,
  });
}

/** Lista corridas com filtros de status e período. */
export async function listAdminRides(query: RideQuery = {}) {
  const normalizedQuery: Record<string, unknown> = { ...query };
  if (query.status && query.status.length > 0) {
    normalizedQuery.status = query.status.join(',');
  }

  return apiRequest<ApiEnvelope<AdminRide[]>>('/rides', { query: normalizedQuery as Record<string, string | number | boolean> });
}

/** Busca detalhes de uma corrida específica no administrativo. */
export async function getAdminRideById(rideId: string) {
  return apiRequest<ApiEnvelope<AdminRide>>(`/rides/${rideId}`);
}

/** Lista pagamentos com filtros financeiros e período. */
export async function listAdminPayments(query: PaymentQuery = {}) {
  const normalizedQuery: Record<string, unknown> = { ...query };
  if (query.status && query.status.length > 0) {
    normalizedQuery.status = query.status.join(',');
  }

  return apiRequest<ApiEnvelope<AdminPayment[]>>('/payments', { query: normalizedQuery as Record<string, string | number | boolean> });
}

/** Busca logs/auditoria para telas de relatórios e saques. */
export async function listAdminLogs(query: ListQuery & { startDate?: string; endDate?: string; type?: string[] } = {}) {
  const normalizedQuery: Record<string, unknown> = { ...query };
  if (query.type && query.type.length > 0) {
    normalizedQuery.type = query.type.join(',');
  }

  return apiRequest<ApiEnvelope<ActionLog[]>>('/logs', { query: normalizedQuery as Record<string, string | number | boolean> });
}

/** Consulta status de saúde para tela de configurações. */
export async function getAdminHealth() {
  return apiRequest<ApiEnvelope<HealthResponse>>('/health');
}

/** Dispara exportacao de dados administrativos no backend. */
export async function exportAdminData(payload: ExportPayload) {
  return apiRequest<ApiEnvelope<{ id: string; status: string; fileName?: string }>>('/export', {
    method: 'POST',
    body: payload,
  });
}

/** Lista notificacoes administrativas. */
export async function listAdminNotifications(unreadOnly = false) {
  return apiRequest<ApiEnvelope<NotificationItem[]>>('/notifications', {
    query: { unreadOnly },
  });
}

/** Bloqueia um usuário pelo endpoint administrativo. */
export async function banAdminUser(userId: string, reason: string) {
  return apiRequest<ApiMessage>(`/users/${userId}/ban`, {
    method: 'POST',
    body: { reason },
  });
}

/** Remove bloqueio de um usuário. */
export async function unbanAdminUser(userId: string) {
  return apiRequest<ApiMessage>(`/users/${userId}/unban`, {
    method: 'POST',
  });
}

/** Cancela uma corrida com motivo administrativo. */
export async function cancelAdminRide(rideId: string, reason: string, refund = false) {
  return apiRequest<ApiMessage>(`/rides/${rideId}/cancel`, {
    method: 'POST',
    body: { reason, refund },
  });
}

/** Processa reembolso de um pagamento. */
export async function refundAdminPayment(paymentId: string, amount: number, reason: string) {
  return apiRequest<ApiEnvelope<{ id: string; status: string }>>(`/payments/${paymentId}/refund`, {
    method: 'POST',
    body: { amount, reason },
  });
}
