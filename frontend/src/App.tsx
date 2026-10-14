import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import Layout from './components/layout/Layout';
import RequireAuth from './components/auth/RequireAuth';
import { useEffect, useState, Suspense, lazy } from 'react';
import { historyApi } from './api/history';
import type { UploadKnowledgeBaseResponse } from './api/knowledgebase';
import { Toaster, toast } from 'sonner';

// Lazy load components
const UploadPage = lazy(() => import('./pages/UploadPage'));
const HistoryList = lazy(() => import('./pages/HistoryPage'));
const ResumeDetailPage = lazy(() => import('./pages/ResumeDetailPage'));
const Interview = lazy(() => import('./pages/InterviewPage'));
const InterviewHistoryPage = lazy(() => import('./pages/InterviewHistoryPage'));
const KnowledgeBaseQueryPage = lazy(() => import('./pages/KnowledgeBaseQueryPage'));
const KnowledgeBaseUploadPage = lazy(() => import('./pages/KnowledgeBaseUploadPage'));
const KnowledgeBaseManagePage = lazy(() => import('./pages/KnowledgeBaseManagePage'));
const ResumeGenerateHubPage = lazy(() => import('./pages/ResumeGenerateHubPage'));
const ResumeAiWizardPage = lazy(() => import('./pages/ResumeAiWizardPage'));
const ResumeTemplateSelectPage = lazy(() => import('./pages/ResumeTemplateSelectPage'));
const ResumeBuilderEditorPage = lazy(() => import('./pages/ResumeBuilderEditorPage'));
const CommunityPage = lazy(() => import('./pages/CommunityPage'));
const ResumeTemplateLibraryPage = lazy(() => import('./pages/ResumeTemplateLibraryPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const AdminUsersPage = lazy(() => import('./pages/AdminUsersPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const EmploymentPage = lazy(() => import('./course/EmploymentPage'));

// Loading component
const Loading = () => (
  <div className="flex min-h-[50vh] items-center justify-center bg-ds-bg dark:bg-neutral-950">
    <div className="h-10 w-10 animate-spin rounded-full border-2 border-ds-border border-t-ds-fg dark:border-neutral-800 dark:border-t-neutral-100" />
  </div>
);

// 上传页面包装器
function UploadPageWrapper() {
  const navigate = useNavigate();

  const handleUploadComplete = (resumeId: number) => {
    // 异步模式：上传成功后跳转到简历库，让用户在列表中查看分析状态
    navigate('/history', { state: { newResumeId: resumeId } });
  };

  return <UploadPage onUploadComplete={handleUploadComplete} />;
}

// 历史记录列表包装器
function HistoryListWrapper() {
  const navigate = useNavigate();

  const handleSelectResume = (id: number) => {
    navigate(`/history/${id}`);
  };

  return <HistoryList onSelectResume={handleSelectResume} />;
}

// 简历详情包装器
function ResumeDetailWrapper() {
  const { resumeId } = useParams<{ resumeId: string }>();
  const navigate = useNavigate();

  if (!resumeId) {
    return <Navigate to="/history" replace />;
  }

  const handleBack = () => {
    navigate('/history');
  };

  const handleStartInterview = (resumeText: string, resumeId: number) => {
    navigate(`/interview/${resumeId}`, { state: { resumeText } });
  };

  return (
    <ResumeDetailPage
      resumeId={parseInt(resumeId, 10)}
      onBack={handleBack}
      onStartInterview={handleStartInterview}
    />
  );
}

// 模拟面试包装器
function InterviewWrapper() {
  const { resumeId } = useParams<{ resumeId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [resumeText, setResumeText] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 优先从location state获取resumeText
    const stateText = (location.state as { resumeText?: string })?.resumeText;
    if (stateText) {
      setResumeText(stateText);
      setLoading(false);
    } else if (resumeId) {
      // 如果没有，从API获取简历详情
      historyApi.getResumeDetail(parseInt(resumeId, 10))
        .then(resume => {
          setResumeText(resume.resumeText);
          setLoading(false);
        })
        .catch(err => {
          console.error('获取简历文本失败', err);
          toast.error('获取简历文本失败');
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, [resumeId, location.state]);

  if (!resumeId) {
    return <Navigate to="/history" replace />;
  }

  const handleBack = () => {
    // 尝试返回详情页，如果失败则返回历史列表
    navigate(`/history/${resumeId}`, { replace: false });
  };

  const handleInterviewComplete = () => {
    // 面试完成后跳转到面试记录页
    navigate('/interviews');
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ds-bg dark:bg-neutral-950">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-ds-border border-t-ds-fg dark:border-neutral-800 dark:border-t-neutral-100" />
          <p className="text-[14px] text-ds-fg-muted dark:text-neutral-400">加载中…</p>
        </div>
      </div>
    );
  }

  const continueSessionId = (location.state as { continueSessionId?: string })?.continueSessionId;

  return (
    <Interview
      resumeText={resumeText}
      resumeId={parseInt(resumeId, 10)}
      continueSessionId={continueSessionId}
      onBack={handleBack}
      onInterviewComplete={handleInterviewComplete}
    />
  );
}

function App() {
  return (
    <BrowserRouter>
      <Toaster richColors position="top-right" />
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route element={<RequireAuth />}>
            <Route path="/" element={<Layout />}>
              <Route index element={<Navigate to="/upload" replace />} />
              <Route path="community" element={<CommunityPage />} />
              <Route path="community/admin" element={<CommunityPage />} />
              <Route path="admin/users" element={<AdminUsersPage />} />
              <Route path="community/posts/:postId" element={<CommunityPage />} />
              <Route path="resume-templates" element={<ResumeTemplateLibraryPage />} />
              <Route path="employment/*" element={<EmploymentPage />} />
              <Route path="upload" element={<UploadPageWrapper />} />
              <Route path="history" element={<HistoryListWrapper />} />
              <Route path="resume-builder" element={<ResumeGenerateHubPage />} />
              <Route path="resume-builder/ai" element={<ResumeAiWizardPage />} />
              <Route path="resume-builder/templates" element={<ResumeTemplateSelectPage />} />
              <Route path="resume-builder/edit/:templateId" element={<ResumeBuilderEditorPage />} />
              <Route path="history/:resumeId" element={<ResumeDetailWrapper />} />
              <Route path="interviews" element={<InterviewHistoryWrapper />} />
              <Route path="interview/:resumeId" element={<InterviewWrapper />} />
              <Route path="knowledgebase" element={<KnowledgeBaseManagePageWrapper />} />
              <Route path="knowledgebase/upload" element={<KnowledgeBaseUploadPageWrapper />} />
              <Route path="knowledgebase/chat" element={<KnowledgeBaseQueryPageWrapper />} />
            </Route>
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

// 面试记录页面包装器
function InterviewHistoryWrapper() {
  const navigate = useNavigate();

  const handleBack = () => {
    navigate('/upload');
  };

  const handleViewInterview = async (sessionId: string, resumeId?: number) => {
    if (resumeId) {
      // 如果有简历ID，跳转到简历详情页的面试详情
      navigate(`/history/${resumeId}`, {
        state: { viewInterview: sessionId }
      });
    } else {
      // 否则尝试从面试详情中获取简历ID
      try {
        await historyApi.getInterviewDetail(sessionId);
        // 面试详情中没有简历ID，需要从其他地方获取
        // 暂时跳转到历史记录列表
        navigate('/history');
      } catch {
        navigate('/history');
      }
    }
  };

  const handleContinueInterview = (resumeId: number, _sessionId: string) => {
    navigate(`/interview/${resumeId}`, { state: { continueSessionId: _sessionId } });
  };

  return <InterviewHistoryPage onBack={handleBack} onViewInterview={handleViewInterview} onContinueInterview={handleContinueInterview} />;
}

// 知识库管理页面包装器
function KnowledgeBaseManagePageWrapper() {
  const navigate = useNavigate();

  const handleUpload = () => {
    navigate('/knowledgebase/upload');
  };

  const handleChat = () => {
    navigate('/knowledgebase/chat');
  };

  return <KnowledgeBaseManagePage onUpload={handleUpload} onChat={handleChat} />;
}

// 知识库问答页面包装器
function KnowledgeBaseQueryPageWrapper() {
  const navigate = useNavigate();
  const location = useLocation();
  const isChatMode = location.pathname === '/knowledgebase/chat';

  const handleBack = () => {
    if (isChatMode) {
      navigate('/knowledgebase');
    } else {
      navigate('/upload');
    }
  };

  const handleUpload = () => {
    navigate('/knowledgebase/upload');
  };

  return <KnowledgeBaseQueryPage onBack={handleBack} onUpload={handleUpload} />;
}

// 知识库上传页面包装器
function KnowledgeBaseUploadPageWrapper() {
  const navigate = useNavigate();

  const handleUploadComplete = (_result: UploadKnowledgeBaseResponse) => {
    // 上传完成后返回管理页面
    navigate('/knowledgebase');
  };

  const handleBack = () => {
    navigate('/knowledgebase');
  };

  return <KnowledgeBaseUploadPage onUploadComplete={handleUploadComplete} onBack={handleBack} />;
}

export default App;
