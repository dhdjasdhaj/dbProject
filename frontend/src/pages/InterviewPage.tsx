import {useEffect, useRef, useState} from 'react';
import {interviewApi} from '../api/interview';
import ConfirmDialog from '../components/dialogs/ConfirmDialog';
import InterviewConfigPanel from '../components/InterviewConfigPanel';
import ChatArea from '../components/interview/ChatArea';
import Sidebar from '../components/interview/Sidebar';
import VideoInterviewStage from '../components/interview/VideoInterviewStage';
import type {InterviewCreationTaskStatus, InterviewMode, InterviewQuestion, InterviewSession, VideoInterviewConfig} from '../types/interview';
import type {InterviewChatMessage} from '../types/interviewChat';

type InterviewStage = 'config' | 'interview';
type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface InterviewProps {
  resumeText: string;
  resumeId?: number;
  continueSessionId?: string;
  onBack: () => void;
  onInterviewComplete: () => void;
}

export default function Interview({resumeText, resumeId, continueSessionId, onBack, onInterviewComplete}: InterviewProps) {
  const [stage, setStage] = useState<InterviewStage>('config');
  const [questionCount, setQuestionCount] = useState(8);
  const [mode, setMode] = useState<InterviewMode>('TEXT');
  const [videoConfig, setVideoConfig] = useState<VideoInterviewConfig>({
    maxFollowUps: 3,
    videoEnabled: true,
    audioEnabled: true,
  });
  const [session, setSession] = useState<InterviewSession | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<InterviewQuestion | null>(null);
  const [messages, setMessages] = useState<InterviewChatMessage[]>([]);
  const [answer, setAnswer] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [creationStatusMessage, setCreationStatusMessage] = useState('');
  const [checkingUnfinished, setCheckingUnfinished] = useState(false);
  const [unfinishedSession, setUnfinishedSession] = useState<InterviewSession | null>(null);
  const [showCompleteConfirm, setShowCompleteConfirm] = useState(false);
  const [forceCreateNew, setForceCreateNew] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [collectingQuestion, setCollectingQuestion] = useState(false);
  const [collectHint, setCollectHint] = useState('');
  const [submittedQuestionIndexes, setSubmittedQuestionIndexes] = useState<Set<number>>(new Set());
  const [videoInterviewStartedAt, setVideoInterviewStartedAt] = useState<number | null>(null);
  const [videoInterviewElapsedSeconds, setVideoInterviewElapsedSeconds] = useState(0);
  const [videoFinalizeRequestId, setVideoFinalizeRequestId] = useState(0);

  const buildSubmittedQuestionIndexes = (sessionData: InterviewSession): Set<number> => {
    const submitted = new Set<number>();
    const answered = sessionData.questions.filter(q => Boolean(q.userAnswer?.trim()));
    const allAnswered = answered.length === sessionData.questions.length;

    if (sessionData.status === 'COMPLETED' || sessionData.status === 'EVALUATED' || allAnswered) {
      answered.forEach(q => submitted.add(q.questionIndex));
      return submitted;
    }

    // 恢复中：仅把“当前题之前”视为已提交，当前题仍允许继续编辑/提交
    answered.forEach(q => {
      if (q.questionIndex < sessionData.currentQuestionIndex) {
        submitted.add(q.questionIndex);
      }
    });

    return submitted;
  };

  const autoSaveTimerRef = useRef<number | null>(null);
  const lastSavedAnswerRef = useRef('');
  const saveRequestSeqRef = useRef(0);
  const currentSessionIdRef = useRef<string | null>(null);
  const currentQuestionIndexRef = useRef<number | null>(null);
  const currentAnswerRef = useRef('');
  const isSubmittingRef = useRef(false);

  const clearAutoSaveTimer = () => {
    if (autoSaveTimerRef.current !== null) {
      window.clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }
  };

  const syncDraftToSession = (sessionId: string, questionIndex: number, draftAnswer: string) => {
    setSession(prev => {
      if (!prev || prev.sessionId !== sessionId) {
        return prev;
      }

      return {
        ...prev,
        status: prev.status === 'CREATED' ? 'IN_PROGRESS' : prev.status,
        questions: prev.questions.map(question =>
          question.questionIndex === questionIndex ? {...question, userAnswer: draftAnswer} : question
        )
      };
    });

    setCurrentQuestion(prev => {
      if (!prev || prev.questionIndex !== questionIndex) {
        return prev;
      }
      return {...prev, userAnswer: draftAnswer};
    });
  };

  const saveDraftAnswer = async (sessionId: string, questionIndex: number, answerSnapshot: string) => {
    const requestSeq = ++saveRequestSeqRef.current;
    setSaveStatus('saving');

    try {
      await interviewApi.saveAnswer({
        sessionId,
        questionIndex,
        answer: answerSnapshot
      });

      const isLatestRequest = saveRequestSeqRef.current === requestSeq;
      const isSameContext =
        currentSessionIdRef.current === sessionId &&
        currentQuestionIndexRef.current === questionIndex &&
        currentAnswerRef.current === answerSnapshot &&
        !isSubmittingRef.current;

      if (!isLatestRequest || !isSameContext) {
        return;
      }

      lastSavedAnswerRef.current = answerSnapshot;
      syncDraftToSession(sessionId, questionIndex, answerSnapshot);
      setLastSavedAt(new Date().toISOString());
      setSaveStatus('saved');
    } catch (err) {
      const isLatestRequest = saveRequestSeqRef.current === requestSeq;
      const isSameContext =
        currentSessionIdRef.current === sessionId &&
        currentQuestionIndexRef.current === questionIndex &&
        currentAnswerRef.current === answerSnapshot &&
        !isSubmittingRef.current;

      if (!isLatestRequest || !isSameContext) {
        return;
      }

      console.error('自动保存失败', err);
      setSaveStatus('error');
    }
  };

  useEffect(() => {
    currentSessionIdRef.current = session?.sessionId ?? null;
    currentQuestionIndexRef.current = currentQuestion?.questionIndex ?? null;
    currentAnswerRef.current = answer.trim();
    isSubmittingRef.current = isSubmitting;
  }, [answer, currentQuestion, isSubmitting, session]);

  useEffect(() => {
    if (stage !== 'interview' || !session || (session.mode ?? mode) !== 'VIDEO') {
      setVideoInterviewStartedAt(null);
      setVideoInterviewElapsedSeconds(0);
      return;
    }

    setVideoInterviewStartedAt(prev => prev ?? Date.now());
  }, [mode, session, stage]);

  useEffect(() => {
    if (!videoInterviewStartedAt || stage !== 'interview' || !session || (session.mode ?? mode) !== 'VIDEO') {
      return;
    }

    const timer = window.setInterval(() => {
      const elapsed = Math.floor((Date.now() - videoInterviewStartedAt) / 1000);
      setVideoInterviewElapsedSeconds(elapsed);
    }, 1000);

    return () => window.clearInterval(timer);
  }, [mode, session, stage, videoInterviewStartedAt]);

  useEffect(() => {
    if (!session || (session.mode ?? mode) !== 'VIDEO') {
      return;
    }
    if (videoInterviewElapsedSeconds < 1800 || isSubmitting) {
      return;
    }

    void handleCompleteEarly();
  }, [isSubmitting, mode, session, videoInterviewElapsedSeconds]);

  useEffect(() => {
    if (!continueSessionId) {
      return;
    }

    setCheckingUnfinished(true);
    setError('');
    interviewApi.getSession(continueSessionId)
      .then(sessionData => {
        restoreSession(sessionData);
        setUnfinishedSession(null);
      })
      .catch(err => {
        console.error('加载指定面试会话失败', err);
        setError('加载指定面试会话失败，请重试');
      })
      .finally(() => {
        setCheckingUnfinished(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [continueSessionId]);

  useEffect(() => {
    if (resumeId && !continueSessionId) {
      checkUnfinishedSession();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resumeId, continueSessionId]);

  useEffect(() => {
    clearAutoSaveTimer();
    lastSavedAnswerRef.current = currentQuestion?.userAnswer?.trim() ?? '';
    setSaveStatus('idle');
    setLastSavedAt(null);
    setCollectHint('');
  }, [currentQuestion?.questionIndex, session?.sessionId]);

  useEffect(() => {
    if (stage !== 'interview' || !session || !currentQuestion || isSubmitting || submittedQuestionIndexes.has(currentQuestion.questionIndex)) {
      clearAutoSaveTimer();
      return;
    }

    const trimmedAnswer = answer.trim();

    if (!trimmedAnswer || trimmedAnswer === lastSavedAnswerRef.current) {
      clearAutoSaveTimer();
      return;
    }

    clearAutoSaveTimer();
    autoSaveTimerRef.current = window.setTimeout(() => {
      void saveDraftAnswer(session.sessionId, currentQuestion.questionIndex, trimmedAnswer);
    }, 1200);

    return () => {
      clearAutoSaveTimer();
    };
  }, [answer, currentQuestion, isSubmitting, session, stage, submittedQuestionIndexes]);

  useEffect(() => {
    return () => {
      clearAutoSaveTimer();
    };
  }, []);

  const checkUnfinishedSession = async () => {
    if (!resumeId) return;

    setCheckingUnfinished(true);
    try {
      const foundSession = await interviewApi.findUnfinishedSession(resumeId);
      if (foundSession) {
        setUnfinishedSession(foundSession);
      }
    } catch (err) {
      console.error('检查未完成面试失败', err);
    } finally {
      setCheckingUnfinished(false);
    }
  };

  const handleContinueUnfinished = () => {
    if (!unfinishedSession) return;
    setForceCreateNew(false);
    restoreSession(unfinishedSession);
    setUnfinishedSession(null);
  };

  const handleStartNew = () => {
    setUnfinishedSession(null);
    setForceCreateNew(true);
  };

  const restoreSession = (sessionToRestore: InterviewSession) => {
    setSession(sessionToRestore);
    setSubmittedQuestionIndexes(buildSubmittedQuestionIndexes(sessionToRestore));

    const currentQ = sessionToRestore.questions[sessionToRestore.currentQuestionIndex];
    if (currentQ) {
      setCurrentQuestion(currentQ);
      setAnswer(currentQ.userAnswer ?? '');

      const restoredMessages: InterviewChatMessage[] = [];
      for (let i = 0; i <= sessionToRestore.currentQuestionIndex; i++) {
        const question = sessionToRestore.questions[i];
        restoredMessages.push({
          type: 'interviewer',
          content: question.question,
          category: question.category,
          questionIndex: i
        });

        if (question.userAnswer && i < sessionToRestore.currentQuestionIndex) {
          restoredMessages.push({
            type: 'user',
            content: question.userAnswer
          });
        }
      }
      setMessages(restoredMessages);
    }

    setStage('interview');
  };

  const startInterview = async () => {
    setIsCreating(true);
    setCreationStatusMessage('正在提交创建任务...');
    setError('');

    try {
      const {taskId} = await interviewApi.createSessionTask({
        resumeText,
        questionCount: mode === 'VIDEO' ? 4 : questionCount,
        resumeId,
        forceCreate: forceCreateNew,
        mode,
        maxFollowUps: videoConfig.maxFollowUps,
        videoEnabled: videoConfig.videoEnabled,
        audioEnabled: videoConfig.audioEnabled,
      });

      let taskStatus: InterviewCreationTaskStatus | null = null;
      for (let attempt = 0; attempt < 240; attempt++) {
        await new Promise(resolve => window.setTimeout(resolve, 1500));
        taskStatus = await interviewApi.getCreateSessionTaskStatus(taskId);
        setCreationStatusMessage(taskStatus.message || '正在创建面试...');

        if (taskStatus.status === 'COMPLETED') {
          break;
        }
        if (taskStatus.status === 'FAILED') {
          throw new Error(taskStatus.error || taskStatus.message || '创建面试失败，请重试');
        }
      }

      if (!taskStatus || taskStatus.status !== 'COMPLETED' || !taskStatus.session) {
        throw new Error('创建超时，请稍后重试');
      }

      const newSession = taskStatus.session;
      setForceCreateNew(false);
      setCreationStatusMessage('');

      const hasProgress =
        newSession.currentQuestionIndex > 0 ||
        newSession.questions.some(question => question.userAnswer) ||
        newSession.status === 'IN_PROGRESS';

      if (hasProgress) {
        restoreSession(newSession);
      } else {
        setSession(newSession);
        setSubmittedQuestionIndexes(new Set());

        if (newSession.questions.length > 0) {
          const firstQuestion = newSession.questions[0];
          setCurrentQuestion(firstQuestion);
          setMessages([
            {
              type: 'interviewer',
              content: firstQuestion.question,
              category: firstQuestion.category,
              questionIndex: 0
            }
          ]);
        }

        setAnswer('');
        setStage('interview');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建面试失败，请重试');
      console.error(err);
      setForceCreateNew(false);
      setCreationStatusMessage('');
    } finally {
      setIsCreating(false);
    }
  };
  const handleSelectQuestion = (questionIndex: number) => {
    if (!session) return;

    if (currentQuestion) {
      const draft = answer;
      syncDraftToSession(session.sessionId, currentQuestion.questionIndex, draft);
    }

    const target = session.questions.find(q => q.questionIndex === questionIndex);
    if (!target) return;

    setCurrentQuestion(target);
    setAnswer(target.userAnswer ?? '');
    setCollectHint('');

    const rebuiltMessages: InterviewChatMessage[] = [];
    for (let i = 0; i <= questionIndex; i++) {
      const q = session.questions[i];
      if (!q) continue;
      rebuiltMessages.push({
        type: 'interviewer',
        content: q.question,
        category: q.category,
        questionIndex: q.questionIndex,
      });
      if (q.userAnswer?.trim()) {
        rebuiltMessages.push({
          type: 'user',
          content: q.userAnswer,
        });
      }
    }
    setMessages(rebuiltMessages);
  };

  const handleSubmitAnswer = async () => {
    if (!session || !currentQuestion || isSubmitting) return;

    const trimmedAnswer = answer.trim();
    if (!trimmedAnswer || submittedQuestionIndexes.has(currentQuestion.questionIndex)) return;

    clearAutoSaveTimer();
    setIsSubmitting(true);
    setError('');

    const userMessage: InterviewChatMessage = {
      type: 'user',
      content: trimmedAnswer
    };
    setMessages(prev => [...prev, userMessage]);

    try {
      const response = await interviewApi.submitAnswer({
        sessionId: session.sessionId,
        questionIndex: currentQuestion.questionIndex,
        answer: trimmedAnswer
      });

      setSubmittedQuestionIndexes(prev => {
        const next = new Set(prev);
        next.add(currentQuestion.questionIndex);
        return next;
      });

      lastSavedAnswerRef.current = trimmedAnswer;
      syncDraftToSession(session.sessionId, currentQuestion.questionIndex, trimmedAnswer);

      if (response.hasNextQuestion && response.nextQuestion) {
        setSession(prev => {
          if (!prev || prev.sessionId !== session.sessionId) {
            return prev;
          }

          const existing = prev.questions.some(question => question.questionIndex === response.nextQuestion!.questionIndex);
          const updatedAnswered = prev.questions.map(question => {
            if (question.questionIndex === currentQuestion.questionIndex) {
              return {...question, userAnswer: trimmedAnswer};
            }
            if (existing && question.questionIndex === response.nextQuestion!.questionIndex) {
              return response.nextQuestion!;
            }
            return question;
          });

          const answeredPosition = updatedAnswered.findIndex(question => question.questionIndex === currentQuestion.questionIndex);
          const updatedQuestions = existing
            ? updatedAnswered
            : response.nextQuestion!.isFollowUp && answeredPosition >= 0
              ? [...updatedAnswered.slice(0, answeredPosition + 1), response.nextQuestion!, ...updatedAnswered.slice(answeredPosition + 1)]
              : [...updatedAnswered, response.nextQuestion!];

          return {
            ...prev,
            currentQuestionIndex: response.currentIndex,
            status: 'IN_PROGRESS',
            currentPrompt: response.nextPrompt ?? null,
            questions: updatedQuestions,
          };
        });

        setCurrentQuestion(response.nextQuestion);
        setAnswer('');
        setMessages(prev => [
          ...prev,
          {
            type: 'interviewer',
            content: response.nextQuestion!.question,
            category: response.nextQuestion!.category,
            questionIndex: response.nextQuestion!.questionIndex,
          }
        ]);
        setCollectHint(response.nextQuestion.isFollowUp ? '本题已提交，已自动进入追问' : '本题已提交，已自动切换到下一题');
      } else {
        setSession(prev => {
          if (!prev || prev.sessionId !== session.sessionId) {
            return prev;
          }

          return {
            ...prev,
            status: 'IN_PROGRESS',
            questions: prev.questions.map(question =>
              question.questionIndex === currentQuestion.questionIndex
                ? {...question, userAnswer: trimmedAnswer}
                : question
            )
          };
        });
        setCurrentQuestion(prev => (prev ? {...prev, userAnswer: trimmedAnswer} : prev));
        setAnswer(trimmedAnswer);
        setCollectHint('所有题目已完成，请点击右上角“提前交卷”按钮结束本场面试');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : '提交答案失败，请重试';
      if (msg.includes('已提交')) {
        setSubmittedQuestionIndexes(prev => {
          const next = new Set(prev);
          next.add(currentQuestion.questionIndex);
          return next;
        });
        setCurrentQuestion(prev => (prev ? {...prev, userAnswer: trimmedAnswer} : prev));
        setCollectHint('本题已提交，不能重复提交，请切换下一题继续作答');
      } else {
        setError('提交答案失败，请重试');
      }
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitVideoAnswer = async (result: import('../types/interview').UploadInterviewMediaResponse) => {
    if (!session) throw new Error('面试会话不存在');

    const questionIndex = result.questionIndex;
    const answerText = result.currentRound?.transcript?.trim() ?? '';

    if (result.sttProvider === 'deepgram-empty') {
      setCollectHint('本轮语音未识别到有效内容，请靠近麦克风并重新作答当前题。');
      return {
        hasNextQuestion: true,
        ended: false,
        retryCurrent: true,
        retryHint: '本轮未识别到有效语音，请靠近麦克风后重新回答当前题。'
      };
    }

    setSubmittedQuestionIndexes(prev => {
      const next = new Set(prev);
      next.add(questionIndex);
      return next;
    });

    if (result.decision.action === 'END' || !result.nextQuestion) {
      setSession(prev => {
        if (!prev || prev.sessionId !== session.sessionId) return prev;
        return {
          ...prev,
          status: 'COMPLETED',
          currentPrompt: null,
          questions: prev.questions.map(question =>
            question.questionIndex === questionIndex ? {...question, userAnswer: answerText} : question
          ),
        };
      });
      setCurrentQuestion(prev => (prev ? {...prev, userAnswer: answerText} : prev));
      setCollectHint('本场视频面试已完成，系统将自动结束并生成报告');
      return {hasNextQuestion: false, ended: true};
    }

    setSession(prev => {
      if (!prev || prev.sessionId !== session.sessionId) return prev;

      const existing = prev.questions.some(question => question.questionIndex === result.nextQuestion!.questionIndex);
      const updatedAnswered = prev.questions.map(question =>
        question.questionIndex === questionIndex ? {...question, userAnswer: answerText} : question
      );
      const answeredPosition = updatedAnswered.findIndex(question => question.questionIndex === questionIndex);
      const updatedQuestions = existing
        ? updatedAnswered.map(question =>
            question.questionIndex === result.nextQuestion!.questionIndex ? result.nextQuestion! : question
          )
        : result.decision.action === 'FOLLOW_UP' && answeredPosition >= 0
          ? [...updatedAnswered.slice(0, answeredPosition + 1), result.nextQuestion!, ...updatedAnswered.slice(answeredPosition + 1)]
          : [...updatedAnswered, result.nextQuestion!];

      return {
        ...prev,
        currentQuestionIndex: result.nextQuestion!.questionIndex,
        status: 'IN_PROGRESS',
        currentPrompt: result.nextPrompt ?? null,
        questions: updatedQuestions,
      };
    });

    setCurrentQuestion(result.nextQuestion);
    setAnswer('');
    setCollectHint(result.decision.action === 'FOLLOW_UP' ? 'AI 正在继续追问，请直接继续回答' : 'AI 将自动进入下一题');
    return {hasNextQuestion: true, ended: false};
  };

  const handleCollectQuestion = async () => {
    if (!session || !currentQuestion || collectingQuestion) return;

    const collectStart = Date.now();
    setCollectingQuestion(true);
    setError('');
    try {
      const draftAnswer = answer.trim();
      if (draftAnswer) {
        await interviewApi.saveAnswer({
          sessionId: session.sessionId,
          questionIndex: currentQuestion.questionIndex,
          answer: draftAnswer,
        });
        syncDraftToSession(session.sessionId, currentQuestion.questionIndex, draftAnswer);
        lastSavedAnswerRef.current = draftAnswer;
      }

      if (currentQuestion.collected) {
        await interviewApi.uncollectQuestion(session.sessionId, currentQuestion.questionIndex);
        setSession(prev => {
          if (!prev || prev.sessionId !== session.sessionId) return prev;
          return {
            ...prev,
            questions: prev.questions.map(q =>
              q.questionIndex === currentQuestion.questionIndex ? {...q, collected: false} : q
            )
          };
        });
        setCurrentQuestion(prev => (prev ? {...prev, collected: false} : prev));
        setCollectHint('已取消收藏该题');
        return;
      }

      const result = await interviewApi.collectQuestion(session.sessionId, currentQuestion.questionIndex);

      setSession(prev => {
        if (!prev || prev.sessionId !== session.sessionId) return prev;
        return {
          ...prev,
          questions: prev.questions.map(q =>
            q.questionIndex === currentQuestion.questionIndex ? {...q, collected: result.collected} : q
          )
        };
      });
      setCurrentQuestion(prev => (prev ? {...prev, collected: result.collected} : prev));
      setCollectHint(
        result.alreadyCollected
          ? `该题已更新到知识库（${result.knowledgeBaseCategory}）`
          : `该题已被收录知识库（${result.knowledgeBaseCategory}）`
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : '收藏失败，请稍后重试';
      if (msg.includes('当前题目还没有可收藏的回答')) {
        setCollectHint('这道题还没有回答内容，请先输入答案后再收藏（无需先提交）');
      } else {
        setError(msg);
      }
      console.error(err);
    } finally {
      const elapsed = Date.now() - collectStart;
      if (elapsed < 700) {
        await new Promise(resolve => setTimeout(resolve, 700 - elapsed));
      }
      setCollectingQuestion(false);
    }
  };

  const handleCompleteEarly = async () => {
    if (!session) return;

    clearAutoSaveTimer();
    setIsSubmitting(true);
    setError('');
    try {
      await interviewApi.completeInterview(session.sessionId);
      setShowCompleteConfirm(false);
      onInterviewComplete();
    } catch (err) {
      setError('提前交卷失败，请重试');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const requestVideoFinalizeAndComplete = () => {
    setShowCompleteConfirm(false);
    setVideoFinalizeRequestId(prev => prev + 1);
  };

  return (
    <div className="relative flex h-screen min-h-0 w-full flex-col overflow-hidden bg-[#07111f] text-white md:flex-row">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.14),transparent_38%),linear-gradient(180deg,#08111f_0%,#050b16_100%)]" />
      <div className="pointer-events-none absolute left-[-120px] top-20 h-[320px] w-[320px] rounded-full bg-[radial-gradient(circle,rgba(56,189,248,0.16)_0%,transparent_72%)] blur-3xl" />
      <div className="pointer-events-none absolute right-[-120px] bottom-12 h-[320px] w-[320px] rounded-full bg-[radial-gradient(circle,rgba(244,114,182,0.12)_0%,transparent_72%)] blur-3xl" />
      <Sidebar
        stage={stage}
        onBack={onBack}
        session={session}
        currentQuestion={currentQuestion}
        onSelectQuestion={handleSelectQuestion}
        disableQuestionSelection={stage === 'interview' && (session?.mode ?? mode) === 'VIDEO'}
      />

      <section className="relative flex min-h-0 min-w-0 flex-1 flex-col">
        {stage === 'config' ? (
          <div className="scrollbar-ds min-h-0 flex-1 overflow-y-auto">
            <InterviewConfigPanel
              questionCount={questionCount}
              onQuestionCountChange={setQuestionCount}
              mode={mode}
              onModeChange={setMode}
              videoConfig={videoConfig}
              onVideoConfigChange={setVideoConfig}
              onStart={startInterview}
              isCreating={isCreating}
              checkingUnfinished={checkingUnfinished}
              unfinishedSession={unfinishedSession}
              onContinueUnfinished={handleContinueUnfinished}
              onStartNew={handleStartNew}
              resumeText={resumeText}
              onBack={onBack}
              error={error || creationStatusMessage}
            />
          </div>
        ) : session && currentQuestion && (session.mode ?? mode) === 'VIDEO' ? (
          <VideoInterviewStage
            session={session}
            resumeText={resumeText}
            interviewElapsedSeconds={videoInterviewElapsedSeconds}
            finalizeRequestId={videoFinalizeRequestId}
            onBack={onBack}
            onCompleteEarly={() => setShowCompleteConfirm(true)}
            onAutoComplete={handleCompleteEarly}
            completingEarly={isSubmitting}
            onApplyUploadResult={handleSubmitVideoAnswer}
          />
        ) : session && currentQuestion ? (
          <ChatArea
            session={session}
            currentQuestion={currentQuestion}
            messages={messages}
            answer={answer}
            onAnswerChange={setAnswer}
            onSubmit={handleSubmitAnswer}
            isSubmitting={isSubmitting}
            submitted={submittedQuestionIndexes.has(currentQuestion.questionIndex)}
            saveStatus={saveStatus}
            lastSavedAt={lastSavedAt}
            onShowCompleteConfirm={setShowCompleteConfirm}
            onCollectQuestion={handleCollectQuestion}
            collectingQuestion={collectingQuestion}
            collectHint={collectHint}
            error={error}
          />
        ) : null}
      </section>

      <ConfirmDialog
        open={showCompleteConfirm}
        title="提前交卷"
        message="确定要提前交卷吗？未回答的问题将按0分计算。"
        confirmText="确定交卷"
        cancelText="取消"
        confirmVariant="warning"
        loading={isSubmitting}
        onConfirm={(session && (session.mode ?? mode) === 'VIDEO') ? requestVideoFinalizeAndComplete : handleCompleteEarly}
        onCancel={() => setShowCompleteConfirm(false)}
      />
    </div>
  );
}
