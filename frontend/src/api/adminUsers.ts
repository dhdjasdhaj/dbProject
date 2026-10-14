import { request } from './request';
export interface AdminUser {
  id: number;
  username: string;
  role: 'ADMIN' | 'USER';
  createdAt: string;
}
export interface AdminUserPage {
  items: AdminUser[];
  total: number;
  page: number;
  pageSize: number;
  stats: { total: number; users: number; administrators: number };
}
export const adminUsersApi = {
  list: (q: string, role: string, page: number) =>
    request.get<AdminUserPage>('/api/admin/users', {
      params: { q, role, page },
    }),
};
