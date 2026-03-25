import { getAuthState } from '../store/authStore';

export type QueryValue = string | number | boolean | undefined | null;

export type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  query?: Record<string, QueryValue | QueryValue[]>;
  body?: unknown;
};

function buildQueryString(query?: Record<string, QueryValue | QueryValue[]>): string {
  if (!query) return '';

  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (item !== undefined && item !== null && `${item}`.trim() !== '') {
          params.append(key, `${item}`);
        }
      });
      return;
    }

    if (value !== undefined && value !== null && `${value}`.trim() !== '') {
      params.set(key, `${value}`);
    }
  });

  const serialized = params.toString();
  return serialized ? `?${serialized}` : '';
}

function getBaseUrl() {
  const baseUrl = import.meta.env.VITE_API_BASE_URL ?? '';
  return baseUrl.replace(/\/$/, '');
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const baseUrl = getBaseUrl();
  if (!baseUrl) {
    throw new Error('VITE_API_BASE_URL nao configurada');
  }

  const auth = getAuthState();
  const query = buildQueryString(options.query);
  const url = `${baseUrl}${path}${query}`;

  const response = await fetch(url, {
    method: options.method ?? 'GET',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(auth.token ? { Authorization: `Bearer ${auth.token}` } : {}),
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const message = payload?.message || payload?.error || `Erro HTTP ${response.status}`;
    throw new Error(message);
  }

  return payload as T;
}
