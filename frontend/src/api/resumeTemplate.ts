import { request } from './request';
import { clearAuthSession } from './auth';

export interface ResumeTemplate {
  id: number;
  sourceId: number;
  title: string;
  styleTags: string[];
  categorySlug: string;
  usageCount: number;
  coverUrl: string | null;
  localImagePath: string | null;
  detailUrl: string | null;
  wordDownloadUrl: string | null;
  wordLocalPath: string | null;
}

export const resumeTemplateApi = {
  list: (params?: { style?: string; category?: string }) =>
    request.get<ResumeTemplate[]>('/api/resume-templates', { params }),
  download: async (template: ResumeTemplate) => {
    const response = await request
      .getInstance()
      .get(`/api/resume-templates/${template.id}/download`, {
        responseType: 'blob',
      });
    const blob = response.data as Blob;
    if (blob.type.includes('json')) {
      const result = JSON.parse(await blob.text());
      if (result.code === 401) {
        clearAuthSession();
        window.location.assign('/login');
      }
      throw new Error(result.message || '下载失败');
    }
    const disposition = response.headers['content-disposition'] || '';
    const encodedFilename = /filename\*=UTF-8''([^;]+)/i.exec(disposition)?.[1];
    const filename = encodedFilename
      ? decodeURIComponent(encodedFilename)
      : `${template.title}.docx`;
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  },
};
