import {useMemo, useState} from 'react';
import {AnimatePresence, motion} from 'framer-motion';
import {Brain, Camera, MessageSquareText, ShieldCheck, Video} from 'lucide-react';
import {getScoreColor} from '../utils/score';
import type {AnswerItem, InterviewDetail} from '../api/history';

interface InterviewDetailPanelProps {
  interview: InterviewDetail;
}

/**
 * 面试详情面板组件
 */
export default function InterviewDetailPanel({ interview }: InterviewDetailPanelProps) {
  // 默认展开所有题目
  const [expandedQuestions, setExpandedQuestions] = useState<Set<number>>(() => {
    const allIndices = new Set<number>();
    if (interview.answers) {
      interview.answers.forEach((_, idx) => allIndices.add(idx));
    }
    return allIndices;
  });

  const toggleQuestion = (index: number) => {
    setExpandedQuestions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  // 计算圆环进度
  const { scorePercent, circumference, strokeDashoffset } = useMemo(() => {
    const percent = interview.overallScore !== null ? (interview.overallScore / 100) * 100 : 0;
    const circ = 2 * Math.PI * 54; // r=54
    const offset = circ - (percent / 100) * circ;
    return { scorePercent: percent, circumference: circ, strokeDashoffset: offset };
  }, [interview.overallScore]);

  return (
      <motion.div
      className="space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* 评分卡片 */}
        <ScoreCard
        score={interview.overallScore}
        feedback={interview.overallFeedback}
        scorePercent={scorePercent}
        circumference={circumference}
        strokeDashoffset={strokeDashoffset}
      />

      {/* 表现优势 */}
      {interview.strengths && interview.strengths.length > 0 && (
        <StrengthsSection strengths={interview.strengths} />
      )}

      {/* 改进建议 */}
      {interview.improvements && interview.improvements.length > 0 && (
        <ImprovementsSection improvements={interview.improvements} />
      )}

      {/* 视频面试扩展分析 */}
      {(interview.videoAnalysis || interview.completeVideoFileUrl || interview.conversationLog?.length) && (
        <VideoInterviewInsightsSection interview={interview} />
      )}

      {/* 问答记录详情 */}
        <QuestionsSection
        answers={interview.answers || []}
        expandedQuestions={expandedQuestions}
        toggleQuestion={toggleQuestion}
      />
    </motion.div>
  );
}

// 评分卡片组件
function ScoreCard({
  score,
  feedback,
  // scorePercent, // 暂时未使用
  circumference,
  strokeDashoffset
}: {
  score: number | null;
  feedback: string | null;
  scorePercent: number;
  circumference: number;
  strokeDashoffset: number;
}) {
  return (
    <div className="rounded-card border border-ds-border bg-ds-bg p-8 shadow-ds-sm dark:border-neutral-800 dark:bg-neutral-950">
      <div className="flex flex-col items-center text-center">
        <div className="relative mb-6 h-32 w-32">
          <svg className="h-32 w-32 -rotate-90 transform" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="54" stroke="currentColor" strokeWidth="8" fill="none" className="text-ds-bg-composer dark:text-neutral-800" />
            <motion.circle
              cx="60"
              cy="60"
              r="54"
              stroke="currentColor"
              strokeWidth="8"
              fill="none"
              strokeLinecap="round"
              className="text-ds-accent"
              strokeDasharray={circumference}
              initial={{strokeDashoffset: circumference}}
              animate={{strokeDashoffset}}
              transition={{duration: 1.5, ease: 'easeOut'}}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <motion.span
              className="text-4xl font-black text-ds-fg dark:text-neutral-50"
              initial={{opacity: 0, scale: 0.5}}
              animate={{opacity: 1, scale: 1}}
              transition={{delay: 0.5}}
            >
              {score ?? '-'}
            </motion.span>
            <span className="text-sm font-semibold text-ds-fg-muted dark:text-neutral-500">总分</span>
          </div>
        </div>

        <h3 className="mb-3 text-2xl font-black tracking-tight text-ds-fg dark:text-neutral-50">面试评估</h3>
        <p className="max-w-2xl leading-relaxed text-ds-fg-muted dark:text-neutral-400">{feedback || '表现良好，展示了扎实的技术基础。'}</p>
      </div>
    </div>
  );
}

// 优势部分组件
function StrengthsSection({ strengths }: { strengths: string[] }) {
  return (
      <motion.div
          className="rounded-card border border-ds-border bg-ds-bg p-6 shadow-ds-sm dark:border-neutral-800 dark:bg-neutral-950"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
    >
        <h4 className="mb-4 flex items-center gap-2 font-bold text-emerald-700 dark:text-emerald-400">
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <polyline points="22,4 12,14.01 9,11.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        表现优势
      </h4>
      <ul className="space-y-3">
        {strengths.map((s: string, i: number) => (
            <li key={i} className="flex items-start gap-3 text-ds-fg dark:text-neutral-200">
            <span className="mt-2 h-2 w-2 shrink-0 rounded-pill bg-ds-accent"></span>
            <span>{s}</span>
          </li>
        ))}
      </ul>
    </motion.div>
  );
}

// 改进建议部分组件
function ImprovementsSection({ improvements }: { improvements: string[] }) {
  return (
      <motion.div
          className="rounded-card border border-ds-border bg-ds-bg p-6 shadow-ds-sm dark:border-neutral-800 dark:bg-neutral-950"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
        <h4 className="mb-4 flex items-center gap-2 font-bold text-amber-800 dark:text-amber-400">
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
          <line x1="12" y1="8" x2="12" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          <line x1="12" y1="16" x2="12.01" y2="16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
        改进建议
      </h4>
      <ul className="space-y-3">
        {improvements.map((s: string, i: number) => (
            <li key={i} className="flex items-start gap-3 text-ds-fg dark:text-neutral-200">
            <span className="mt-2 h-2 w-2 shrink-0 rounded-pill bg-amber-500"></span>
            <span>{s}</span>
          </li>
        ))}
      </ul>
    </motion.div>
  );
}

function VideoInterviewInsightsSection({ interview }: { interview: InterviewDetail }) {
  const metrics = [
    { label: '表情表现', value: interview.videoAnalysis?.overallExpressionScore ?? null, icon: Camera },
    { label: '肢体姿态', value: interview.videoAnalysis?.overallGestureScore ?? null, icon: Video },
    { label: '自信程度', value: interview.videoAnalysis?.overallConfidenceScore ?? null, icon: ShieldCheck },
  ];

  return (
    <motion.div
      className="rounded-card border border-ds-border bg-ds-bg p-6 shadow-ds-sm dark:border-neutral-800 dark:bg-neutral-950"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 }}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h4 className="mb-2 flex items-center gap-2 font-bold text-ds-fg dark:text-neutral-100">
            <Brain className="h-5 w-5 text-ds-accent" />
            视频面试扩展分析
          </h4>
          <p className="text-sm leading-6 text-ds-fg-muted dark:text-neutral-400">
            展示整场视频面试的多模态分析结果，包括表情、姿态、自信度及对话记录。
          </p>
        </div>
        {interview.completeVideoFileUrl ? (
          <a
            href={interview.completeVideoFileUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-pill border border-ds-border-strong bg-ds-bg-subtle px-4 py-2 text-sm font-bold text-ds-fg transition hover:opacity-90 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
          >
            <Video className="h-4 w-4" />
            查看完整视频
          </a>
        ) : null}
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-3">
        {metrics.map(item => (
          <div key={item.label} className="rounded-card border border-ds-border bg-ds-bg-subtle p-4 dark:border-neutral-800 dark:bg-neutral-900/80">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-ds-fg-muted dark:text-neutral-400">
              <item.icon className="h-4 w-4 text-ds-accent" />
              {item.label}
            </div>
            <div className="text-2xl font-black text-ds-fg dark:text-neutral-100">{item.value ?? '-'}</div>
          </div>
        ))}
      </div>

      {interview.videoAnalysis?.summary ? (
        <div className="mt-5 rounded-card border border-ds-border bg-ds-bg-subtle p-4 dark:border-neutral-800 dark:bg-neutral-900/80">
          <div className="mb-2 text-sm font-bold text-ds-fg dark:text-neutral-100">视频分析总结</div>
          <p className="leading-relaxed text-ds-fg-muted dark:text-neutral-300">{interview.videoAnalysis.summary}</p>
        </div>
      ) : null}

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        {interview.videoAnalysis?.strengths?.length ? (
          <div className="rounded-card border border-emerald-200/50 bg-emerald-50/70 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/20">
            <div className="mb-2 font-bold text-emerald-700 dark:text-emerald-400">视频表现亮点</div>
            <ul className="space-y-2 text-sm text-emerald-900/85 dark:text-emerald-100/85">
              {interview.videoAnalysis.strengths.map((item, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {interview.videoAnalysis?.improvements?.length ? (
          <div className="rounded-card border border-amber-200/50 bg-amber-50/70 p-4 dark:border-amber-900/40 dark:bg-amber-950/20">
            <div className="mb-2 font-bold text-amber-700 dark:text-amber-400">视频表现改进建议</div>
            <ul className="space-y-2 text-sm text-amber-900/85 dark:text-amber-100/85">
              {interview.videoAnalysis.improvements.map((item, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      {(interview.completeVideoDurationSeconds || interview.completeVideoFileSize) ? (
        <div className="mt-5 flex flex-wrap gap-3 text-sm text-ds-fg-muted dark:text-neutral-400">
          {interview.completeVideoDurationSeconds ? <span>视频时长：{interview.completeVideoDurationSeconds} 秒</span> : null}
          {interview.completeVideoFileSize ? <span>文件大小：{(interview.completeVideoFileSize / 1024 / 1024).toFixed(2)} MB</span> : null}
        </div>
      ) : null}

      {interview.conversationLog?.length ? (
        <div className="mt-5 rounded-card border border-ds-border bg-ds-bg-subtle p-4 dark:border-neutral-800 dark:bg-neutral-900/80">
          <div className="mb-3 flex items-center gap-2 text-sm font-bold text-ds-fg dark:text-neutral-100">
            <MessageSquareText className="h-4 w-4 text-ds-accent" />
            对话记录
          </div>
          <div className="max-h-72 space-y-3 overflow-y-auto pr-1">
            {interview.conversationLog.map((entry, index) => (
              <div key={index} className="rounded-card border border-ds-border bg-ds-bg px-4 py-3 dark:border-neutral-800 dark:bg-neutral-950">
                <div className="mb-1 text-xs font-bold uppercase tracking-wide text-ds-fg-muted dark:text-neutral-500">
                  {entry.role === 'ai' ? 'AI 面试官' : '候选人'}
                </div>
                <p className="whitespace-pre-wrap break-words text-sm leading-6 text-ds-fg dark:text-neutral-200">{entry.text}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </motion.div>
  );
}

// 问答部分组件
function QuestionsSection({
  answers,
  expandedQuestions,
  toggleQuestion
}: {
  answers: AnswerItem[];
  expandedQuestions: Set<number>;
  toggleQuestion: (index: number) => void;
}) {
  return (
    <div>
      <h4 className="mb-4 flex items-center gap-2 font-bold text-ds-fg dark:text-neutral-100">
        <svg className="h-5 w-5 text-ds-accent" viewBox="0 0 24 24" fill="none">
          <path d="M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        问答记录详情
      </h4>

      <div className="space-y-4">
        {answers.map((answer, idx) => (
          <QuestionCard
            key={idx}
            answer={answer}
            index={idx}
            isExpanded={expandedQuestions.has(idx)}
            onToggle={() => toggleQuestion(idx)}
          />
        ))}
      </div>
    </div>
  );
}

// 问题卡片组件
function QuestionCard({
  answer,
  index,
  isExpanded,
  onToggle
}: {
  answer: AnswerItem;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
      <motion.div
          className="overflow-hidden rounded-card border border-ds-border bg-ds-bg shadow-ds-sm dark:border-neutral-800 dark:bg-neutral-950"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 + index * 0.05 }}
    >
      {/* 问题头部 */}
        <div
            className="flex cursor-pointer items-center justify-between px-5 py-4 transition-colors hover:bg-ds-bg-subtle dark:hover:bg-neutral-900/80"
        onClick={onToggle}
      >
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-pill bg-ds-bg-subtle text-sm font-bold text-ds-fg dark:bg-neutral-900 dark:text-neutral-200">
            {answer.questionIndex + 1}
          </span>
          <span className="rounded-pill border border-ds-border bg-ds-bg-subtle px-3 py-1 text-xs font-bold text-ds-fg-muted dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400">
            {answer.category || '综合'}
          </span>
          <span className={`font-semibold ${getScoreColor(answer.score, [80, 60])}`}>
            得分: {answer.score}
          </span>
        </div>
          <motion.svg
          className="h-5 w-5 text-ds-fg-muted"
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          viewBox="0 0 24 24"
          fill="none"
        >
          <polyline points="6,9 12,15 18,9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </motion.svg>
      </div>

      {/* 问题内容 */}
      <div className="px-5 pb-2">
        <p className="font-semibold leading-relaxed text-ds-fg dark:text-neutral-100">{answer.question}</p>
      </div>

      {/* 展开内容 */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 space-y-4">
              {/* 你的回答 */}
              <div className="rounded-card bg-ds-bg-subtle p-4 dark:bg-neutral-900/80">
                <p className="mb-2 flex items-center gap-1 text-sm font-semibold text-ds-fg-muted dark:text-neutral-500">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <path d="M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  你的回答
                </p>
                <p className={`leading-relaxed ${
                  !answer.userAnswer || answer.userAnswer === '不知道' 
                    ? 'text-red-500 font-medium'
                      : 'text-ds-fg dark:text-neutral-200'
                }`}>
                  "{answer.userAnswer || '(未回答)'}"
                </p>
              </div>

              {/* AI 深度评价 */}
              {answer.feedback && (
                <div>
                  <p className="mb-2 flex items-center gap-2 text-sm font-bold text-ds-fg-muted dark:text-neutral-500">
                    <svg className="h-4 w-4 text-ds-accent" viewBox="0 0 24 24" fill="none">
                      <path d="M3 3V21H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M18 9L12 15L9 12L3 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    AI 深度评价
                  </p>
                  <p className="pl-6 leading-relaxed text-ds-fg dark:text-neutral-200">{answer.feedback}</p>
                </div>
              )}

              {/* 参考答案 */}
              {answer.referenceAnswer && (
                  <div className="rounded-card border border-ds-border bg-ds-bg-subtle p-4 dark:border-neutral-800 dark:bg-neutral-900/80">
                    <p className="mb-3 flex items-center gap-2 text-sm font-bold text-ds-fg-muted dark:text-neutral-500">
                    <svg className="h-4 w-4 text-ds-accent" viewBox="0 0 24 24" fill="none">
                      <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2"/>
                      <path d="M9 12H15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      <path d="M12 9V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                    参考答案
                  </p>
                    <div
                        className="whitespace-pre-line leading-relaxed text-ds-fg dark:text-neutral-200">{answer.referenceAnswer}</div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
