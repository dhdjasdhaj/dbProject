import {AnimatePresence, motion} from 'framer-motion';

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string | React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: 'danger' | 'primary' | 'warning';
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
  customContent?: React.ReactNode;
  hideButtons?: boolean;
}

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmText = '确定',
  cancelText = '取消',
  confirmVariant = 'primary',
  onConfirm,
  onCancel,
  loading = false,
  customContent,
  hideButtons = false
}: ConfirmDialogProps) {
  if (!open) return null;

  const confirmClass =
    confirmVariant === 'danger'
      ? 'bg-red-600 text-white hover:opacity-90'
      : confirmVariant === 'warning'
        ? 'bg-ds-fg text-ds-bg hover:opacity-90 dark:bg-neutral-100 dark:text-neutral-950'
        : 'bg-ds-fg text-ds-bg hover:opacity-90 dark:bg-neutral-100 dark:text-neutral-950';

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{opacity: 0}}
            animate={{opacity: 1}}
            exit={{opacity: 0}}
            onClick={onCancel}
            className="fixed inset-0 z-50 bg-black/45 backdrop-blur-[2px]"
          />

          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{opacity: 0, scale: 0.98, y: 10}}
              animate={{opacity: 1, scale: 1, y: 0}}
              exit={{opacity: 0, scale: 0.98, y: 10}}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-md rounded-card border border-ds-border bg-ds-bg p-6 shadow-ds-sm dark:border-neutral-800 dark:bg-neutral-950"
            >
              <h3 className="text-[18px] font-black tracking-tight text-ds-fg dark:text-neutral-50">{title}</h3>

              <div className="mt-3 text-[14px] leading-relaxed text-ds-fg-muted dark:text-neutral-300">
                {typeof message === 'string' ? message && <p className="whitespace-pre-line">{message}</p> : message}
                {customContent}
              </div>

              {!hideButtons && (
                <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={onCancel}
                    disabled={loading}
                    className="inline-flex items-center justify-center rounded-pill border border-ds-border-strong bg-ds-bg px-5 py-2.5 text-[14px] font-bold text-ds-fg transition hover:bg-ds-bg-subtle disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-100 dark:hover:bg-neutral-900"
                  >
                    {cancelText}
                  </button>
                  <button
                    type="button"
                    onClick={onConfirm}
                    disabled={loading}
                    className={`inline-flex items-center justify-center rounded-pill px-5 py-2.5 text-[14px] font-black transition disabled:cursor-not-allowed disabled:opacity-50 ${confirmClass}`}
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white dark:border-neutral-950/30 dark:border-t-neutral-950" />
                        处理中…
                      </span>
                    ) : (
                      confirmText
                    )}
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
