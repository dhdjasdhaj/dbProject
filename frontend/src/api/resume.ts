import { request } from './request';
import type { UploadResponse, ResumeAiGenerateRequest, ResumeAiGenerateResponse } from '../types/resume';

export const resumeApi = {
  /**
   * 上传简历并获取分析结果
   */
  async uploadAndAnalyze(file: File): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    return request.upload<UploadResponse>('/api/resumes/upload', formData);
  },

  /**
   * AI 生成简历初稿
   */
  async generateByAi(payload: ResumeAiGenerateRequest): Promise<ResumeAiGenerateResponse> {
    return request.post<ResumeAiGenerateResponse>('/api/resumes/ai-generate', payload);
  },

  /**
   * 健康检查
   */
  async healthCheck(): Promise<{ status: string; service: string }> {
    return request.get('/api/resumes/health');
  },
};
