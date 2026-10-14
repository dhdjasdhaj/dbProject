import {useCallback, useEffect, useState} from 'react';
import {useLocation} from 'react-router-dom';
import {AnimatePresence, motion} from 'framer-motion';
import {historyApi, InterviewDetail, ResumeDetail} from '../api/history';
import AnalysisPanel from '../components/AnalysisPanel';
import InterviewPanel from '../components/InterviewPanel';
import InterviewDetailPanel from '../components/InterviewDetailPanel';
import {formatDateOnly} from '../utils/date';
import {CheckSquare, ChevronLeft, Clock, Download, MessageSquare, Mic} from 'lucide-react';
import { toast } from 'sonner';

interface ResumeDetailPageProps {
  resumeId: number;
  onBack: () => void;
  onStartInterview: (resumeText: string, resumeId: number) => void;
}

type TabType = 'analysis' | 'interview';
type DetailViewType = 'list' | 'interviewDetail';

export default function ResumeDetailPage({ resumeId, onBack, onStartInterview }: ResumeDetailPageProps) {
  const location = useLocation();
  const [resume, setResume] = useState<ResumeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('analysis');
  const [exporting, setExporting] = useState<string | null>(null);
  const [collectingRecordSessionId, setCollectingRecordSessionId] = useState<string | null>(null);
  const [[page, direction], setPage] = useState([0, 0]);
  const [detailView, setDetailView] = useState<DetailViewType>('list');
  const [selectedInterview, setSelectedInterview] = useState<InterviewDetail | null>(null);
  const [loadingInterview, setLoadingInterview] = useState(false);
  const [reanalyzing, setReanalyzing] = useState(false);

  // 静默加载数据（用于轮询）
  const loadResumeDetailSilent = useCallback(async () => {
    try {
      const data = await historyApi.getResumeDetail(resumeId);
      setResume(data);
    } catch (err) {
      console.error('加载简历详情失败', err);
    }
  }, [resumeId]);

  const loadResumeDetail = useCallback(async () => {
    setLoading(true);
    try {
      const data = await historyApi.getResumeDetail(resumeId);
      setResume(data);
    } catch (err) {
      console.error('加载简历详情失败', err);
      toast.error('加载简历详情失败');
    } finally {
      setLoading(false);
    }
  }, [resumeId]);

  useEffect(() => {
    loadResumeDetail();
  }, [loadResumeDetail]);

  // 轮询：当分析状态为待处理时，每5秒刷新一次
  // 待处理判断：显式的 PENDING/PROCESSING 状态，或状态未定义且无分析结果
  useEffect(() => {
    const isProcessing = resume && (
      resume.analyzeStatus === 'PENDING' ||
      resume.analyzeStatus === 'PROCESSING' ||
      (resume.analyzeStatus === undefined && (!resume.analyses || resume.analyses.length === 0))
    );

    if (isProcessing && !loading) {
      const timer = setInterval(() => {
        loadResumeDetailSilent();
      }, 5000);

      return () => clearInterval(timer);
    }
  }, [resume, loading, loadResumeDetailSilent]);

  // 重新分析
  const handleReanalyze = async () => {
    try {
      setReanalyzing(true);
      await historyApi.reanalyze(resumeId);
      await loadResumeDetailSilent();
    } catch (err) {
      console.error('重新分析失败', err);
      toast.error('重新分析失败');
    } finally {
      setReanalyzing(false);
    }
  };

  // 检查是否需要自动打开面试详情
  useEffect(() => {
    const viewInterview = (location.state as { viewInterview?: string })?.viewInterview;
    if (viewInterview && resume) {
      // 切换到面试标签页
      setActiveTab('interview');
      // 加载并显示面试详情
      const loadAndViewInterview = async () => {
        setLoadingInterview(true);
        try {
          const detail = await historyApi.getInterviewDetail(viewInterview);
          setSelectedInterview(detail);
          setDetailView('interviewDetail');
        } catch (err) {
          console.error('加载面试详情失败', err);
        } finally {
          setLoadingInterview(false);
        }
      };
      loadAndViewInterview();
    }
  }, [location.state, resume]);

  const handleExportAnalysisPdf = async () => {
    setExporting('analysis');
    try {
      const blob = await historyApi.exportAnalysisPdf(resumeId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `简历分析报告_${resume?.filename || resumeId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success('简历分析报告导出成功');
    } catch (err) {
      toast.error('导出失败，请重试');
    } finally {
      setExporting(null);
    }
  };

  const handleExportInterviewPdf = async (sessionId: string) => {
    setExporting(sessionId);
    try {
      const blob = await historyApi.exportInterviewPdf(sessionId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `面试报告_${sessionId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success('面试报告导出成功');
    } catch (err) {
      toast.error('导出失败，请重试');
    } finally {
      setExporting(null);
    }
  };

  const handleCollectInterviewRecord = async (sessionId: string) => {
    setCollectingRecordSessionId(sessionId);
    try {
      const result = await historyApi.collectInterviewRecord(sessionId);
      const statusText = result.vectorStatus === 'COMPLETED' ? '已完成向量化' : '已进入向量化队列';
      toast.success(`已整理并上传知识库（${result.knowledgeBaseCategory}）· ${statusText}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '整理上传失败，请重试');
    } finally {
      setCollectingRecordSessionId(null);
    }
  };

  const handleViewInterview = async (sessionId: string) => {
    setLoadingInterview(true);
    try {
      const detail = await historyApi.getInterviewDetail(sessionId);
      setSelectedInterview(detail);
      setDetailView('interviewDetail');
    } catch (err) {
      toast.error('加载面试详情失败');
    } finally {
      setLoadingInterview(false);
    }
  };

  const handleBackToInterviewList = () => {
    setDetailView('list');
    setSelectedInterview(null);
  };

  const handleDeleteInterview = async (sessionId: string) => {
    // 删除后重新加载简历详情
    await loadResumeDetail();
    // 如果删除的是当前查看的面试，返回列表
    if (selectedInterview?.sessionId === sessionId) {
      setDetailView('list');
      setSelectedInterview(null);
    }
  };

  const handleTabChange = (tab: TabType) => {
    const newPage = tab === 'analysis' ? 0 : 1;
    setPage([newPage, newPage > page ? 1 : -1]);
    setActiveTab(tab);
    setDetailView('list');
    setSelectedInterview(null);
  };

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 300 : -300,
      opacity: 0,
    }),
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <motion.div
          className="h-12 w-12 rounded-full border-2 border-ds-border border-t-ds-fg dark:border-neutral-800 dark:border-t-neutral-100"
          animate={{rotate: 360}}
          transition={{duration: 1, repeat: Infinity, ease: 'linear'}}
        />
      </div>
    );
  }

  if (!resume) {
    return (
      <div className="py-20 text-center">
        <p className="mb-4 text-red-600 dark:text-red-400">加载失败，请返回重试</p>
        <button type="button" onClick={onBack} className="rounded-pill bg-ds-fg px-6 py-2.5 text-sm font-bold text-ds-bg dark:bg-neutral-100 dark:text-neutral-950">
          返回列表
        </button>
      </div>
    );
  }

  const latestAnalysis = resume.analyses?.[0];
  const tabs = [
    { id: 'analysis' as const, label: '简历分析', icon: CheckSquare },
    { id: 'interview' as const, label: '面试记录', icon: MessageSquare, count: resume.interviews?.length || 0 },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="relative w-full"
    >
      <div className="pointer-events-none max-w-full absolute left-1/2 top-[-180px] h-[380px] w-[760px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(56,189,248,0.24)_0%,rgba(99,102,241,0.16)_42%,transparent_72%)] blur-3xl" />
      <div className="pointer-events-none absolute right-[-120px] top-20 h-[260px] w-[260px] rounded-full bg-[radial-gradient(circle,rgba(244,114,182,0.14)_0%,transparent_70%)] blur-3xl" />
      {/* 顶部导航栏 */}
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <motion.button
            type="button"
            onClick={detailView === 'interviewDetail' ? handleBackToInterviewList : onBack}
            className="flex h-10 w-10 items-center justify-center rounded-pill border border-ds-border-strong bg-ds-bg text-ds-fg-muted transition-all hover:bg-ds-bg-subtle dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-400 dark:hover:bg-neutral-900"
            whileHover={{scale: 1.05}}
            whileTap={{scale: 0.95}}
          >
            <ChevronLeft className="h-5 w-5" strokeWidth={1.75} />
          </motion.button>
          <div>
            <h2 className="text-xl font-black tracking-tight text-ds-fg dark:text-neutral-50">
              {detailView === 'interviewDetail' ? `面试详情 #${selectedInterview?.sessionId?.slice(-6) || ''}` : resume.filename}
            </h2>
            <p className="flex items-center gap-1.5 text-sm text-ds-fg-muted dark:text-neutral-400">
              <Clock className="h-4 w-4" strokeWidth={1.75} />
                  {detailView === 'interviewDetail'
                ? `完成于 ${formatDateOnly(selectedInterview?.completedAt || selectedInterview?.createdAt || '')}`
                : `上传于 ${formatDateOnly(resume.uploadedAt)}`
              }
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          {detailView === 'interviewDetail' && selectedInterview && (
            <>
              <motion.button
                type="button"
                onClick={() => handleExportInterviewPdf(selectedInterview.sessionId)}
                disabled={exporting === selectedInterview.sessionId || collectingRecordSessionId === selectedInterview.sessionId}
                className="flex items-center gap-2 rounded-pill border border-ds-border-strong bg-ds-bg px-5 py-2.5 text-sm font-bold text-ds-fg transition-all hover:bg-ds-bg-subtle disabled:opacity-50 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-100 dark:hover:bg-neutral-900"
                whileHover={{scale: 1.02}}
                whileTap={{scale: 0.98}}
              >
                <Download className="h-4 w-4" strokeWidth={1.75} />
                {exporting === selectedInterview.sessionId ? '导出中…' : '导出 PDF'}
              </motion.button>
              <motion.button
                type="button"
                onClick={() => handleCollectInterviewRecord(selectedInterview.sessionId)}
                disabled={collectingRecordSessionId === selectedInterview.sessionId || exporting === selectedInterview.sessionId}
                className="flex items-center gap-2 rounded-pill border border-cyan-300/35 bg-cyan-400/12 px-5 py-2.5 text-sm font-bold text-cyan-100 transition-all hover:bg-cyan-400/18 disabled:opacity-50"
                whileHover={{scale: 1.02}}
                whileTap={{scale: 0.98}}
              >
                <MessageSquare className="h-4 w-4" strokeWidth={1.75} />
                {collectingRecordSessionId === selectedInterview.sessionId ? '整理上传中…' : '一键整理并上传知识库'}
              </motion.button>
            </>
          )}
          {detailView !== 'interviewDetail' && (
            <motion.button
              type="button"
              onClick={() => onStartInterview(resume.resumeText, resumeId)}
              className="flex items-center gap-2 rounded-pill bg-ds-fg px-5 py-2.5 text-sm font-black text-ds-bg shadow-ds-sm transition-all hover:opacity-90 dark:bg-neutral-100 dark:text-neutral-950"
              whileHover={{scale: 1.02}}
              whileTap={{scale: 0.98}}
            >
              <Mic className="h-4 w-4" strokeWidth={1.75} />
              开始模拟面试
            </motion.button>
          )}
        </div>
      </div>

      {/* 标签页切换 - 仅在非面试详情时显示 */}
      {detailView !== 'interviewDetail' && (
        <div className="mb-6 inline-flex gap-1 rounded-pill border border-white/12 bg-white/[0.05] p-1 shadow-[0_18px_40px_rgba(2,6,23,0.28)] backdrop-blur-xl">
          {tabs.map(tab => (
            <motion.button
              key={tab.id}
              type="button"
              onClick={() => handleTabChange(tab.id)}
              className={`relative flex items-center gap-2 rounded-pill px-5 py-2.5 text-sm font-bold transition-colors ${
                activeTab === tab.id
                  ? 'text-white'
                  : 'text-white/68 hover:text-white'
              }`}
              whileHover={{scale: 1.02}}
              whileTap={{scale: 0.98}}
            >
              {activeTab === tab.id && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 rounded-pill border border-white/12 bg-white/[0.08] shadow-[0_10px_24px_rgba(15,23,42,0.26)] backdrop-blur-xl"
                  transition={{type: 'spring', bounce: 0.2, duration: 0.6}}
                />
              )}
              <span className="relative z-10 flex items-center gap-2">
                <tab.icon className="h-5 w-5" strokeWidth={1.75} />
                {tab.label}
                {tab.count !== undefined && tab.count > 0 ? (
                  <span className="rounded-pill border border-white/12 bg-black/20 px-2 py-0.5 text-xs font-black text-white/70 backdrop-blur-sm">
                    {tab.count}
                  </span>
                ) : null}
              </span>
            </motion.button>
          ))}
        </div>
      )}

      {/* 内容区域 */}
      <div className="relative overflow-hidden">
        {detailView === 'interviewDetail' && selectedInterview ? (
          <InterviewDetailPanel interview={selectedInterview} />
        ) : (
          <AnimatePresence initial={false} custom={direction} mode="wait">
            <motion.div
              key={activeTab}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
              {activeTab === 'analysis' ? (
                <AnalysisPanel
                  analysis={latestAnalysis}
                  analyzeStatus={resume.analyzeStatus}
                  analyzeError={resume.analyzeError}
                  onExport={handleExportAnalysisPdf}
                  exporting={exporting === 'analysis'}
                  onReanalyze={handleReanalyze}
                  reanalyzing={reanalyzing}
                />
              ) : (
                  <InterviewPanel
                      interviews={resume.interviews || []}
                  onStartInterview={() => onStartInterview(resume.resumeText, resumeId)}
                  onViewInterview={handleViewInterview}
                  onExportInterview={handleExportInterviewPdf}
                  onDeleteInterview={handleDeleteInterview}
                  exporting={exporting}
                  loadingInterview={loadingInterview}
                />
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </motion.div>
  );
}
