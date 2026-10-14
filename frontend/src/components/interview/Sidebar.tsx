import {ArrowLeft, CheckCircle2, CircleDot, ListOrdered, MessageSquare} from 'lucide-react';
import type {InterviewQuestion, InterviewSession} from '../../types/interview';

export type InterviewShellStage = 'config' | 'interview';

export interface SidebarProps {
  stage: InterviewShellStage;
  onBack: () => void;
  session: InterviewSession | null;
  currentQuestion: InterviewQuestion | null;
  onSelectQuestion?: (questionIndex: number) => void;
  disableQuestionSelection?: boolean;
}

function truncate(text: string, max = 80) {
  const t = text.replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max)}…`;
}

function buildQuestionDisplayLabel(question: InterviewQuestion, allQuestions: InterviewQuestion[]): string {
  const sorted = [...allQuestions].sort((a, b) => a.questionIndex - b.questionIndex);
  const byIndex = new Map(sorted.map(item => [item.questionIndex, item]));

  const resolveRootIndex = (item: InterviewQuestion) => {
    let cursor: InterviewQuestion | undefined = item;
    let guard = 0;
    while (cursor?.isFollowUp && cursor.parentQuestionIndex != null && guard < 20) {
      const parent = byIndex.get(cursor.parentQuestionIndex);
      if (!parent) {
        return cursor.parentQuestionIndex;
      }
      cursor = parent;
      guard += 1;
    }
    return cursor?.questionIndex ?? item.parentQuestionIndex ?? item.questionIndex;
  };

  const rootIndex = resolveRootIndex(question);
  const mainNo = sorted.filter(x => !x.isFollowUp && x.questionIndex <= rootIndex).length || 1;

  if (!question.isFollowUp) {
    return `主问题 ${mainNo}`;
  }

  const followNo = sorted.filter(x => x.isFollowUp && resolveRootIndex(x) === rootIndex && x.questionIndex <= question.questionIndex).length || 1;

  return `主问题 ${mainNo} · 追问 ${followNo}`;
}

export default function Sidebar({
  stage,
  onBack,
  session,
  currentQuestion,
  onSelectQuestion,
  disableQuestionSelection = false,
}: SidebarProps) {
  const visibleQuestions = (() => {
    const questions = session?.questions ?? [];
    const sorted = [...questions].sort((a, b) => a.questionIndex - b.questionIndex);
    if (!disableQuestionSelection) {
      return sorted;
    }
    return sorted.filter(
      q => q.questionIndex === currentQuestion?.questionIndex || Boolean(q.userAnswer?.trim())
    );
  })();

  return (
    <aside className="relative z-10 flex w-full shrink-0 flex-col border-b border-white/10 bg-black/22 backdrop-blur-[22px] md:h-full md:w-[min(100%,280px)] md:border-b-0 md:border-r">
      <div className="flex items-center gap-2 px-3 py-4 md:px-4">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-pill text-white/62 transition hover:bg-white/8"
          aria-label="返回"
        >
          <ArrowLeft className="h-5 w-5" strokeWidth={1.75} />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-pill border border-white/12 bg-white text-slate-950 shadow-[0_12px_24px_rgba(255,255,255,0.14)]">
              <MessageSquare className="h-5 w-5" strokeWidth={1.75} />
            </div>
            <div className="min-w-0">
              <p className="truncate text-[15px] font-bold text-white">模拟面试</p>
              <p className="truncate text-[13px] text-white/54">
                {stage === 'config' ? '准备开始' : disableQuestionSelection ? '会话进行中（按顺序作答）' : '会话进行中（可切题）'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {stage === 'config' ? (
        <div className="scrollbar-ds flex-1 space-y-3 overflow-y-auto px-4 pb-6 text-[15px] leading-relaxed text-white/64">
          <p>在右侧选择题目数量并生成面试题。</p>
          <p className="text-[13px] text-white/42">开始后，这里会展示题目大纲与完成状态。</p>
        </div>
      ) : session && currentQuestion ? (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="px-4 pb-2">
            <p className="text-[11px] font-bold uppercase tracking-wide text-white/46">题目大纲</p>
          </div>
          <nav className="scrollbar-ds flex-1 overflow-y-auto px-2 pb-4">
            <ul className="space-y-1">
              {visibleQuestions.map(q => {
                const isCurrent = q.questionIndex === currentQuestion.questionIndex;
                const answered = Boolean(q.userAnswer?.trim());

                return (
                  <li key={q.questionIndex}>
                    <button
                      type="button"
                      onClick={() => onSelectQuestion?.(q.questionIndex)}
                      disabled={disableQuestionSelection}
                      className={`w-full rounded-2xl px-3 py-2.5 text-left transition ${
                        isCurrent
                          ? 'border border-white/12 bg-white/[0.07] shadow-[0_12px_28px_rgba(2,6,23,0.22)]'
                          : disableQuestionSelection
                            ? 'opacity-90'
                            : 'hover:bg-white/[0.04]'
                      } ${disableQuestionSelection ? 'cursor-not-allowed' : ''}`}
                    >
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <span className="flex items-center gap-1.5 text-[13px] font-semibold text-white/88">
                          <ListOrdered className="h-3.5 w-3.5 text-white/44" />
                          {buildQuestionDisplayLabel(q, session.questions)}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-white/56">
                          {answered ? (
                            <>
                              <CheckCircle2 className="h-3.5 w-3.5 text-cyan-300" />
                              已回答
                            </>
                          ) : isCurrent ? (
                            <>
                              <CircleDot className="h-3.5 w-3.5 text-cyan-300" />
                              当前
                            </>
                          ) : (
                            '待答'
                          )}
                        </span>
                      </div>
                      <p className="line-clamp-2 text-[12px] leading-snug text-white/52">{truncate(q.question, 96)}</p>
                      {q.category ? (
                        <p className="mt-1.5 inline-block rounded-pill border border-white/10 bg-black/18 px-2 py-0.5 text-[11px] text-white/58">
                          {q.category}
                        </p>
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      ) : (
        <div className="px-4 py-3 text-[14px] text-white/52">加载中…</div>
      )}
    </aside>
  );
}
