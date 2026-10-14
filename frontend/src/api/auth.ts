import { request } from './request';
import {
  AUTH_TOKEN_KEY,
  AUTH_USER_ID_KEY,
  AUTH_USERNAME_KEY,
} from '../authStorage';

export {
  AUTH_TOKEN_KEY,
  AUTH_USER_ID_KEY,
  AUTH_USERNAME_KEY,
  getStoredToken,
  authHeaders,
  clearAuthSession,
} from '../authStorage';

export interface AuthResponse {
  role: 'USER' | 'ADMIN';
  token: string;
  userId: number;
  username: string;
}

export const authApi = {
  async adminLogin(username: string, password: string): Promise<AuthResponse> {
    return request.post<AuthResponse>('/api/auth/admin/login', {
      username,
      password,
    });
  },
  async login(username: string, password: string): Promise<AuthResponse> {
    return request.post<AuthResponse>('/api/auth/login', {
      username,
      password,
    });
  },

  async register(username: string, password: string): Promise<AuthResponse> {
    return request.post<AuthResponse>('/api/auth/register', {
      username,
      password,
    });
  },
};

export function saveAuthSession(res: AuthResponse) {
  localStorage.setItem(AUTH_TOKEN_KEY, res.token);
  localStorage.setItem(AUTH_USER_ID_KEY, String(res.userId));
  localStorage.setItem(AUTH_USERNAME_KEY, res.username);
}
