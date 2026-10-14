// 简历分析响应类型
export interface ResumeAnalysisResponse {
  overallScore: number;
  scoreDetail: ScoreDetail;
  summary: string;
  strengths: string[];
  suggestions: Suggestion[];
  originalText: string;
}

// 存储信息
export interface StorageInfo {
  fileKey: string;
  fileUrl: string;
  resumeId?: number;
}

// 上传API完整响应（异步模式：analysis 可能为空）
export interface UploadResponse {
  analysis?: ResumeAnalysisResponse;
  storage: StorageInfo;
  duplicate?: boolean;
  message?: string;
}

export interface ScoreDetail {
  contentScore: number;
  structureScore: number;
  skillMatchScore: number;
  expressionScore: number;
  projectScore: number;
}

export interface Suggestion {
  category: string;
  priority: '高' | '中' | '低';
  issue: string;
  recommendation: string;
}

export interface ApiError {
  error: string;
  detectedType?: string;
  allowedTypes?: string[];
}

export interface ResumeAiGenerateRequest {
  templateId: string;
  identity: string;
  major: string;
  educationInfo: string;
  jobTargets: string[];
  educationTags: string[];
  internshipTags: string[];
  certificateTags: string[];
  additionalNotes: string;
  historicalContext?: {
    wizardDraft?: {
      identity: string;
      major: string;
      educationInfo: string;
      jobTargets: string[];
      educationTags: string[];
      internshipTags: string[];
      certificateTags: string[];
      additionalNotes: string;
    };
    builderDrafts: Array<{
      templateId: string;
      updatedAt: string;
      sections: Record<string, string>;
      aiMeta?: {
        identity?: string;
        major?: string;
        educationInfo?: string;
        jobTargets?: string[];
        educationTags?: string[];
        internshipTags?: string[];
        certificateTags?: string[];
        additionalNotes?: string;
      };
    }>;
  };
}

export interface ResumeAiGenerateResponse {
  templateId: string;
  aiMeta: {
    identity: string;
    major: string;
    educationInfo: string;
    jobTargets: string[];
    educationTags: string[];
    internshipTags: string[];
    certificateTags: string[];
    additionalNotes: string;
  };
  sections: {
    profile: string;
    summary: string;
    education: string;
    projects: string;
    experience: string;
    skills: string;
  };
}
