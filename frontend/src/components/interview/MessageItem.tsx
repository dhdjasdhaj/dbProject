import type {InterviewChatMessage} from '../../types/interviewChat';

interface MessageItemProps {
  message: InterviewChatMessage;
}

/**
 * 面试官：无气泡，文档式排版（参考 SuperGrok AI 回复区）
 * 候选人：浅灰圆角气泡，右对齐
 */
export default function MessageItem({message}: MessageItemProps) {
  if (message.type === 'interviewer') {
    return (
      <article className="max-w-[52rem]">
        <header className="mb-2 flex flex-wrap items-center gap-2">
          <span className="text-[13px] font-bold text-ds-fg dark:text-neutral-100">面试官</span>
          {message.category ? (
            <span className="rounded-pill border border-ds-border bg-ds-bg-subtle px-2.5 py-0.5 text-[11px] font-semibold text-ds-fg-muted dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400">
              {message.category}
            </span>
          ) : null}
        </header>
        <div className="prose prose-neutral max-w-none text-[15px] leading-relaxed text-ds-fg prose-p:my-2 prose-headings:my-3 dark:prose-invert dark:text-neutral-100">
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
        </div>
      </article>
    );
  }

  return (
    <div className="flex justify-end">
      <div className="max-w-[min(100%,36rem)]">
        <p className="mb-1.5 text-right text-[12px] font-semibold text-ds-fg-muted dark:text-neutral-500">你</p>
        <div className="rounded-bubble bg-ds-bubble-user px-4 py-3 text-[15px] leading-relaxed text-ds-fg dark:bg-neutral-800 dark:text-neutral-100">
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
        </div>
      </div>
    </div>
  );
}
