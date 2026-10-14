// 面试相关类型定义

export type InterviewMode = 'TEXT' | 'VIDEO';
export type InterviewNextAction = 'FOLLOW_UP' | 'NEXT_QUESTION' | 'END';

export interface VideoInterviewConfig {
  maxFollowUps: number;
  videoEnabled: boolean;
  audioEnabled: boolean;
}

export interface InterviewPromptPayload {
  sessionId: string;
  questionIndex: number;
  questionText: string;
  questionCategory: string;
  ttsProvider: string;
  ttsAudioFileKey: string | null;
  ttsAudioFileUrl: string | null;
  mock: boolean;
}

export interface InterviewSession {
  sessionId: string;
  resumeText: string;
  totalQuestions: number;
  currentQuestionIndex: number;
  questions: InterviewQuestion[];
  status: 'CREATED' | 'IN_PROGRESS' | 'COMPLETED' | 'EVALUATED';
  mode?: InterviewMode;
  maxFollowUps?: number;
  videoEnabled?: boolean;
  audioEnabled?: boolean;
  currentPrompt?: InterviewPromptPayload | null;
}

export interface InterviewQuestion {
  questionIndex: number;
  question: string;
  type: QuestionType;
  category: string;
  userAnswer: string | null;
  score: number | null;
  feedback: string | null;
  collected?: boolean;
  isFollowUp?: boolean;
  parentQuestionIndex?: number | null;
}

export interface CollectInterviewQuestionResponse {
  knowledgeBaseId: number;
  knowledgeBaseName: string;
  knowledgeBaseCategory: string;
  questionIndex: number;
  alreadyCollected: boolean;
  collected: boolean;
}

export type QuestionType = 
  | 'PROJECT' 
  | 'JAVA_BASIC' 
  | 'JAVA_COLLECTION' 
  | 'JAVA_CONCURRENT' 
  | 'MYSQL' 
  | 'REDIS' 
  | 'SPRING' 
  | 'SPRING_BOOT';

export interface CreateInterviewRequest {
  resumeText: string;
  questionCount: number;
  resumeId?: number;
  forceCreate?: boolean;
  mode?: InterviewMode;
  maxFollowUps?: number;
  videoEnabled?: boolean;
  audioEnabled?: boolean;
}

export interface CreateInterviewTaskResponse {
  taskId: string;
}

export type AsyncTaskStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface InterviewCreationTaskStatus {
  taskId: string;
  status: AsyncTaskStatus;
  stage: string;
  message: string;
  error: string | null;
  session: InterviewSession | null;
}

export interface SubmitAnswerRequest {
  sessionId: string;
  questionIndex: number;
  answer: string;
}

export interface SubmitAnswerResponse {
  hasNextQuestion: boolean;
  nextQuestion: InterviewQuestion | null;
  currentIndex: number;
  totalQuestions: number;
  nextPrompt?: InterviewPromptPayload | null;
}

export interface InterviewRound {
  roundId: string;
  sessionId: string;
  parentRoundId: string | null;
  rootQuestionIndex: number;
  followUpDepth: number;
  questionText: string;
  questionCategory: string;
  transcript: string | null;
  mediaFileKey: string | null;
  mediaFileUrl: string | null;
  status: string;
}

export interface InterviewFlowDecision {
  action: InterviewNextAction;
  reason: string;
  nextRound: InterviewRound | null;
}

export interface RealtimeTranscriptionConfig {
  provider: string;
  wsUrl: string;
  model: string;
  language: string;
  interimResults: boolean;
  smartFormat: boolean;
  endpointingMs: number | null;
  utteranceEndMs: number | null;
  audioMimeType: string;
  container: string;
}

export interface UploadInterviewMediaResponse {
  sessionId: string;
  questionIndex: number;
  fileKey: string;
  fileUrl: string;
  contentType: string | null;
  size: number;
  message: string;
  currentRound: InterviewRound;
  decision: InterviewFlowDecision;
  nextQuestion: InterviewQuestion | null;
  nextPrompt?: InterviewPromptPayload | null;
  sttProvider?: string | null;
}

export interface VideoInterviewRoundResult {
  roundId: string;
  sessionId: string;
  questionIndex: number;
  mediaFileKey: string;
  mediaFileUrl: string;
  transcript: string;
  durationSeconds: number;
  fluencyScore: number;
  expressionScore: number;
  confidenceScore: number;
  summary: string;
  strengths: string[];
  improvements: string[];
  suggestedFollowUp: string;
}

export interface UploadCompleteInterviewAnalysisResult {
  overallExpressionScore: number;
  overallGestureScore: number;
  overallConfidenceScore: number;
  summary: string;
  strengths: string[];
  improvements: string[];
}

export interface UploadCompleteInterviewResponse {
  sessionId: string;
  videoFileKey: string;
  videoFileUrl: string;
  videoFileSize: number;
  durationSeconds: number;
  status: string;
  analysisResult: UploadCompleteInterviewAnalysisResult;
}

export interface CurrentQuestionResponse {
  completed: boolean;
  question?: InterviewQuestion;
  message?: string;
}

export interface InterviewReport {
  sessionId: string;
  totalQuestions: number;
  overallScore: number;
  categoryScores: CategoryScore[];
  questionDetails: QuestionEvaluation[];
  overallFeedback: string;
  strengths: string[];
  improvements: string[];
  referenceAnswers: ReferenceAnswer[];
}

export interface CategoryScore {
  category: string;
  score: number;
  questionCount: number;
}

export interface QuestionEvaluation {
  questionIndex: number;
  question: string;
  category: string;
  userAnswer: string;
  score: number;
  feedback: string;
}

export interface ReferenceAnswer {
  questionIndex: number;
  question: string;
  referenceAnswer: string;
}
