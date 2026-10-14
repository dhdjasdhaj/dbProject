/** 与登录态相关的 localStorage，避免 request 与 authApi 循环依赖 */

export const AUTH_TOKEN_KEY = 'auth_token';
export const AUTH_USER_ID_KEY = 'auth_user_id';
export const AUTH_USERNAME_KEY = 'auth_username';

export function getStoredToken(): string | null {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

export function clearAuthSession() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_ID_KEY);
  localStorage.removeItem(AUTH_USERNAME_KEY);
}

export function authHeaders(): Record<string, string> {
  const token = getStoredToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}
