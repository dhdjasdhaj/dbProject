import { useMemo, useRef } from 'react';
import {Virtuoso, type VirtuosoHandle} from 'react-virtuoso';
import {
  ArrowUp,
  Bookmark,
  ClipboardList,
  Loader2,
} from 'lucide-react';
import type { InterviewQuestion, InterviewSession } from '../../types/interview';
import type { InterviewChatMessage } from '../../types/interviewChat';
import {formatDateTime} from '../../utils/date';
import MessageItem from './MessageItem';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export interface ChatAreaProps {
  session: InterviewSession;
  currentQuestion: InterviewQuestion;
  messages: InterviewChatMessage[];
  answer: string;
  onAnswerChange: (answer: string) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  submitted: boolean;
  saveStatus: SaveStatus;
  lastSavedAt: string | null;
  onShowCompleteConfirm: (show: boolean) => void;
  onCollectQuestion: () => void;
  collectingQuestion: boolean;
  collectHint?: string;
  error?: string;
}


export default function ChatArea({
  session,
  currentQuestion,
  messages,
  answer,
  onAnswerChange,
  onSubmit,
  isSubmitting,
  submitted,
  saveStatus,
  lastSavedAt,
  onShowCompleteConfirm,
  onCollectQuestion,
  collectingQuestion,
  collectHint,
  error
}: ChatAreaProps) {
  const virtuosoRef = useRef<VirtuosoHandle>(null);

  const answeredCount = useMemo(() => {
    return session.questions.filter(q => Boolean(q.userAnswer?.trim())).length;
  }, [session.questions]);

  const progress = useMemo(() => {
    return (answeredCount / session.totalQuestions) * 100;
  }, [answeredCount, session.totalQuestions]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (answerLocked) {
      return;
    }
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      onSubmit();
    }
  };

  const saveLine = useMemo(() => {
    if (!answer.trim() && saveStatus !== 'error') {
      return null;
    }
    switch (saveStatus) {
      case 'saving':
        return {text: '草稿同步中…', tone: 'muted' as const};
      case 'saved':
        return {
          text: `已同步到服务器${lastSavedAt ? ` · ${formatDateTime(lastSavedAt)}` : ''}`,
          tone: 'ok' as const
        };
      case 'error':
        return {text: '同步失败：草稿仍保留在本地输入框', tone: 'err' as const};
      default:
        return null;
    }
  }, [answer, lastSavedAt, saveStatus]);

  const toolbarIconBtn =
    'inline-flex h-10 w-10 items-center justify-center rounded-pill text-white/62 transition hover:bg-white/8';

  const bookmarkBtnClass = currentQuestion.collected
    ? 'inline-flex h-10 w-10 items-center justify-center rounded-pill bg-amber-300 text-slate-950 transition hover:bg-amber-200 disabled:opacity-50'
    : `${toolbarIconBtn} border border-white/10`;

  const answerLocked = submitted;

  return (
    <div className="relative z-10 flex min-h-0 flex-1 flex-col bg-transparent text-white">
      <header className="shrink-0 border-b border-white/10 bg-black/18 px-4 py-3 backdrop-blur-[22px] sm:px-8">
        <div className="mx-auto flex max-w-3xl items-center gap-2">

          <div className="min-w-0 flex-1 flex justify-center">
            <button
              type="button"
              className="inline-flex max-w-full items-center gap-2 rounded-pill border border-white/12 bg-white/[0.08] px-4 py-2 text-left text-[13px] font-semibold text-white shadow-[0_12px_24px_rgba(2,6,23,0.22)] backdrop-blur-sm"
            >
              <span className="truncate">
                已完成 {answeredCount} / {session.totalQuestions} 题
              </span>
              <span className="shrink-0 text-white/45">·</span>
              <span className="shrink-0 text-white/55">进行中</span>
            </button>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              className={bookmarkBtnClass}
              aria-label="收藏题目"
              title={
                collectingQuestion
                  ? currentQuestion.collected
                    ? '正在取消收藏中'
                    : '正在收藏中'
                  : currentQuestion.collected
                    ? '取消收藏'
                    : '收藏到知识库'
              }
              onClick={onCollectQuestion}
              disabled={collectingQuestion}
            >
              {collectingQuestion ? (
                <Loader2 className="h-[18px] w-[18px] animate-spin" strokeWidth={1.9} />
              ) : (
                <Bookmark className="h-[18px] w-[18px]" strokeWidth={1.75} fill={currentQuestion.collected ? 'currentColor' : 'none'} />
              )}
            </button>
            <button
              type="button"
              onClick={() => onShowCompleteConfirm(true)}
              disabled={isSubmitting}
              className={`${toolbarIconBtn} disabled:opacity-40`}
              aria-label="提前交卷"
              title="提前交卷"
            >
              <ClipboardList className="h-[18px] w-[18px]" strokeWidth={1.75} />
            </button>
          </div>
        </div>

        <div className="mx-auto mt-3 max-w-3xl">
          <div className="h-1 overflow-hidden rounded-pill bg-white/10">
            <div
              className="h-full rounded-pill bg-gradient-to-r from-cyan-300 via-sky-300 to-fuchsia-300 transition-[width] duration-300 ease-out"
              style={{width: `${progress}%`}}
            />
          </div>
          <div className="mt-1 flex items-center justify-between text-[12px] text-white/48">
            <span>进度（按已回答题目）</span>
            <span>{answeredCount} / {session.totalQuestions}</span>
          </div>
          {collectingQuestion ? (
            <p className="mt-2 inline-flex items-center gap-2 rounded-[16px] border border-cyan-300/20 bg-cyan-400/10 px-3 py-2 text-[12px] font-medium text-cyan-100">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              {currentQuestion.collected ? '正在取消收藏中，请稍候…' : '正在收藏中，请稍候…'}
            </p>
          ) : collectHint ? (
            <p className="mt-2 rounded-[16px] border border-emerald-300/16 bg-emerald-400/10 px-3 py-2 text-[12px] font-medium text-emerald-100">
              {collectHint}
            </p>
          ) : answeredCount === session.totalQuestions ? (
            <p className="mt-2 rounded-[16px] border border-amber-300/20 bg-amber-400/10 px-3 py-2 text-[12px] font-medium text-amber-100">
              所有题目已完成，请点击右上角“提前交卷”按钮结束本场面试
            </p>
          ) : null}
        </div>
      </header>

      {error ? (
        <div className="shrink-0 border-b border-red-300/18 bg-red-500/10 px-4 py-2 text-center text-[13px] text-red-100 backdrop-blur-sm">
          {error}
        </div>
      ) : null}

      <Virtuoso
        ref={virtuosoRef}
        data={messages}
        initialTopMostItemIndex={messages.length > 0 ? messages.length - 1 : 0}
        followOutput="smooth"
        className="scrollbar-ds min-h-0 flex-1"
        itemContent={(_index, msg) => (
          <div className="px-4 py-5 sm:px-8">
            <div className="mx-auto max-w-3xl">
              <MessageItem message={msg} />
            </div>
          </div>
        )}
      />

      <footer className="shrink-0 border-t border-white/10 bg-black/18 px-4 pb-5 pt-3 backdrop-blur-[22px] sm:px-8">
        <div className="mx-auto max-w-3xl space-y-3">

          <div className="min-h-[1.25rem] text-[12px]">
            {saveLine ? (
              <p
                className={
                  saveLine.tone === 'ok'
                    ? 'text-emerald-200/88'
                    : saveLine.tone === 'err'
                      ? 'font-semibold text-red-200'
                      : 'text-white/52'
                }
              >
                {saveLine.text}
              </p>
            ) : (
              <p className="text-white/28">&nbsp;</p>
            )}
          </div>

          <div className="flex items-end gap-2 rounded-[28px] border border-white/12 bg-white/[0.08] p-2 pl-3 shadow-[0_18px_40px_rgba(2,6,23,0.30)] backdrop-blur-[22px]">
            <textarea
              value={answer}
              onChange={e => onAnswerChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={answerLocked ? "本题已提交，不能再次提交" : "写下你的回答…（Ctrl / Cmd + Enter 提交）"}
              rows={1}
              disabled={isSubmitting || answerLocked}
              className="mb-1 max-h-40 min-h-[2.75rem] w-full resize-none bg-transparent px-1 py-2 text-[15px] leading-relaxed text-white placeholder:text-white/34 focus:outline-none"
            />
            <button
              type="button"
              onClick={onSubmit}
              disabled={!answer.trim() || isSubmitting || answerLocked}
              className={`mb-1 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-pill border transition ${answerLocked ? 'border-slate-500 bg-slate-600 text-slate-300' : 'border-white/10 bg-white text-slate-950 hover:bg-white/92'} disabled:cursor-not-allowed disabled:opacity-85`}
              aria-label="提交回答"
              title={answerLocked ? '本题已提交，需切题后继续' : '提交回答'}
            >
              {isSubmitting ? (
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-950/25 border-t-slate-950" />
              ) : (
                <ArrowUp className="h-5 w-5" strokeWidth={2.25} />
              )}
            </button>
          </div>

          <p className="text-center text-[12px] text-white/34">Enter 换行 · Ctrl / Cmd + Enter 提交</p>
        </div>
      </footer>
    </div>
  );
}
