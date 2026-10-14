import { request } from './request';
import { AUTH_TOKEN_KEY } from '../authStorage';
import type {
  CollectInterviewQuestionResponse,
  CreateInterviewRequest,
  CreateInterviewTaskResponse,
  CurrentQuestionResponse,
  InterviewCreationTaskStatus,
  InterviewReport,
  InterviewSession,
  SubmitAnswerRequest,
  SubmitAnswerResponse,
  UploadCompleteInterviewResponse,
  UploadInterviewMediaResponse,
  RealtimeTranscriptionConfig
} from '../types/interview';

export const interviewApi = {
  /**
   * 创建面试异步任务
   */
  async createSessionTask(req: CreateInterviewRequest): Promise<CreateInterviewTaskResponse> {
    return request.post<CreateInterviewTaskResponse>('/api/interview/sessions/tasks', req);
  },

  /**
   * 查询创建面试异步任务状态
   */
  async getCreateSessionTaskStatus(taskId: string): Promise<InterviewCreationTaskStatus> {
    return request.get<InterviewCreationTaskStatus>(`/api/interview/sessions/tasks/${taskId}`);
  },

  /**
   * 创建面试会话
   */
  async createSession(req: CreateInterviewRequest): Promise<InterviewSession> {
    return request.post<InterviewSession>('/api/interview/sessions', req, {
      timeout: 420000, // 同步生成问题与参考答案，适当放宽超时
    });
  },

  /**
   * 获取会话信息
   */
  async getSession(sessionId: string): Promise<InterviewSession> {
    return request.get<InterviewSession>(`/api/interview/sessions/${sessionId}`);
  },

  /**
   * 获取当前问题
   */
  async getCurrentQuestion(sessionId: string): Promise<CurrentQuestionResponse> {
    return request.get<CurrentQuestionResponse>(`/api/interview/sessions/${sessionId}/question`);
  },

  /**
   * 提交答案
   */
  async submitAnswer(req: SubmitAnswerRequest): Promise<SubmitAnswerResponse> {
    return request.post<SubmitAnswerResponse>(
      `/api/interview/sessions/${req.sessionId}/answers`,
      { questionIndex: req.questionIndex, answer: req.answer },
      {
        timeout: 180000,
      }
    );
  },

  /**
   * 获取面试报告
   */
  async getReport(sessionId: string): Promise<InterviewReport> {
    return request.get<InterviewReport>(`/api/interview/sessions/${sessionId}/report`, {
      timeout: 180000,
    });
  },

  /**
   * 查找未完成的面试会话
   */
  async findUnfinishedSession(resumeId: number): Promise<InterviewSession | null> {
    try {
      return await request.get<InterviewSession>(`/api/interview/sessions/unfinished/${resumeId}`);
    } catch {
      return null;
    }
  },

  /**
   * 暂存答案（不进入下一题）
   */
  async saveAnswer(req: SubmitAnswerRequest): Promise<void> {
    return request.put<void>(
      `/api/interview/sessions/${req.sessionId}/answers`,
      { questionIndex: req.questionIndex, answer: req.answer }
    );
  },

  /**
   * 提前交卷
   */
  async completeInterview(sessionId: string): Promise<void> {
    return request.post<void>(`/api/interview/sessions/${sessionId}/complete`);
  },

  /**
   * 收藏题目到知识库
   */
  async collectQuestion(sessionId: string, questionIndex: number): Promise<CollectInterviewQuestionResponse> {
    return request.post<CollectInterviewQuestionResponse>(`/api/interview/sessions/${sessionId}/collect`, {
      questionIndex,
    });
  },

  /**
   * 取消收藏题目
   */
  async uncollectQuestion(sessionId: string, questionIndex: number): Promise<CollectInterviewQuestionResponse> {
    return request.delete<CollectInterviewQuestionResponse>(`/api/interview/sessions/${sessionId}/collect?questionIndex=${questionIndex}`);
  },

  async getRealtimeConfig(): Promise<RealtimeTranscriptionConfig> {
    return request.post<RealtimeTranscriptionConfig>('/api/interview/realtime-config');
  },

  buildRealtimeProxyWebSocketUrl(config: RealtimeTranscriptionConfig): string {
    const token = localStorage.getItem(AUTH_TOKEN_KEY) ?? '';
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const params = new URLSearchParams({
      token,
      model: config.model,
      language: config.language,
      interim_results: String(config.interimResults),
      smart_format: String(config.smartFormat),
    });
    if (config.endpointingMs != null) params.set('endpointing', String(config.endpointingMs));
    if (config.utteranceEndMs != null) params.set('utterance_end_ms', String(config.utteranceEndMs));
    return `${protocol}//${host}${config.wsUrl}?${params.toString()}`;
  },

  async uploadMedia(sessionId: string, questionIndex: number, file: Blob, filename?: string, transcript?: string): Promise<UploadInterviewMediaResponse> {
    const formData = new FormData();
    formData.append('file', file, filename ?? `interview-${sessionId}-${questionIndex}.webm`);
    formData.append('questionIndex', String(questionIndex));
    if (transcript && transcript.trim()) {
      formData.append('transcript', transcript.trim());
    }
    return request.upload<UploadInterviewMediaResponse>(`/api/interview/sessions/${sessionId}/media`, formData, {
      timeout: 180000,
    });
  },

  /**
   * 上传完整面试视频
   */
  async uploadCompleteInterview(sessionId: string, formData: FormData): Promise<UploadCompleteInterviewResponse> {
    return request.upload<UploadCompleteInterviewResponse>(`/api/interview/sessions/${sessionId}/complete-video`, formData, {
      timeout: 300000, // 5分钟超时
    });
  },
};
