import { request } from '../api/request';
import { clearAuthSession } from '../authStorage';

export type Row = Record<string, unknown>;
export interface Page { items: Row[]; total: number; page: number; size: number }
export interface CourseUser {
  userId: number; externalUserId: number; username: string;
  role: 'USER' | 'STAFF' | 'ADMIN'; permissions: string[]; profile: Row;
  portal: 'teacher' | 'student';
}
export interface Menu { id: number; label: string; path: string; permissionCode: string }
export const courseApi = {
  get: <T,>(path: string, params?: Record<string, string | number>) => request.get<T>(`/api/course/${path}`, { params }),
  post: <T,>(path: string, data?: unknown) => request.post<T>(`/api/course/${path}`, data),
  put: <T,>(path: string, data: unknown) => request.put<T>(`/api/course/${path}`, data),
  upload: (file: File) => { const data = new FormData(); data.append('file', file); return request.upload<Row>('/api/course/files', data); },
  async download(path: string, name: string, params?: Record<string, string | number>) {
    const response = await request.getInstance().get<Blob>(`/api/course/${path}`, { responseType: 'blob', params });
    const blob = response.data;
    if (blob.type.includes('json')) {
      const error = JSON.parse(await blob.text()) as { code: number; message: string };
      if (error.code === 401) { clearAuthSession(); window.location.assign('/login'); }
      throw new Error(error.message || '下载失败');
    }
    const disposition = String(response.headers['content-disposition'] || '');
    const utf8 = disposition.match(/filename\*=UTF-8''([^;]+)/i);
    const plain = disposition.match(/filename="?([^";]+)"?/i);
    if (utf8) { try { name = decodeURIComponent(utf8[1]); } catch { /* keep fallback name */ } }
    else if (plain) name = plain[1];
    const url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  },
};
