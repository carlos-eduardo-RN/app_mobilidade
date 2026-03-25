import type { Role } from '../types';

const TOKEN_KEY = 'admin_token';
const ROLE_KEY = 'admin_role';
const USER_KEY = 'admin_user_id';

export type AuthState = {
  token: string | null;
  role: Role | null;
  userId: string | null;
};

export function getAuthState(): AuthState {
  return {
    token: localStorage.getItem(TOKEN_KEY),
    role: localStorage.getItem(ROLE_KEY) as Role | null,
    userId: localStorage.getItem(USER_KEY),
  };
}

export function setAuthState(state: AuthState) {
  if (state.token) {
    localStorage.setItem(TOKEN_KEY, state.token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
  if (state.role) {
    localStorage.setItem(ROLE_KEY, state.role);
  } else {
    localStorage.removeItem(ROLE_KEY);
  }
  if (state.userId) {
    localStorage.setItem(USER_KEY, state.userId);
  } else {
    localStorage.removeItem(USER_KEY);
  }
}

export function clearAuthState() {
  setAuthState({ token: null, role: null, userId: null });
}
