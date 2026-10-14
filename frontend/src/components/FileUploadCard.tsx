import {ChangeEvent, DragEvent, useCallback, useState} from 'react';
import {AnimatePresence, motion} from 'framer-motion';
import {AlertCircle, FileText, Loader2, Upload, X} from 'lucide-react';

export interface FileUploadCardProps {
  title: string;
  subtitle: string;
  accept: string;
  formatHint: string;
  maxSizeHint: string;
  uploading?: boolean;
  uploadButtonText?: string;
  selectButtonText?: string;
  showNameInput?: boolean;
  namePlaceholder?: string;
  nameLabel?: string;
  error?: string;
  onFileSelect?: (file: File) => void;
  onUpload: (file: File, name?: string) => void;
  onBack?: () => void;
}

export default function FileUploadCard({
  title,
  subtitle,
  accept,
  formatHint,
  maxSizeHint,
  uploading = false,
  uploadButtonText = '开始上传',
  selectButtonText = '选择文件',
  showNameInput = false,
  namePlaceholder = '留空则使用文件名',
  nameLabel = '名称（可选）',
  error,
  onFileSelect,
  onUpload,
  onBack
}: FileUploadCardProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [name, setName] = useState('');

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        setSelectedFile(files[0]);
        onFileSelect?.(files[0]);
      }
    },
    [onFileSelect]
  );

  const handleFileChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        setSelectedFile(files[0]);
        onFileSelect?.(files[0]);
      }
    },
    [onFileSelect]
  );

  const handleUpload = () => {
    if (!selectedFile) return;
    onUpload(selectedFile, name.trim() || undefined);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <motion.div
      className="mx-auto w-full max-w-2xl px-4 py-12 sm:px-6 sm:py-16"
      initial={{opacity: 0, y: 16}}
      animate={{opacity: 1, y: 0}}
      transition={{duration: 0.35}}
    >
      <header className="mb-10 text-center">
        <h1 className="text-[clamp(1.75rem,4vw,2.5rem)] font-black tracking-tight text-ds-fg dark:text-neutral-50">{title}</h1>
        <p className="mx-auto mt-3 max-w-prose text-[15px] leading-relaxed text-ds-fg-muted dark:text-neutral-400">{subtitle}</p>
      </header>

      <motion.div
        className={`relative cursor-pointer rounded-card border bg-ds-bg p-10 shadow-ds-sm transition-all dark:bg-neutral-950 sm:p-12 ${
          dragOver ? 'border-ds-accent ring-2 ring-ds-accent/25' : 'border-ds-border hover:border-ds-border-strong dark:border-neutral-800'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => document.getElementById('file-upload-input')?.click()}
        initial={{opacity: 0, y: 12}}
        animate={{opacity: 1, y: 0}}
        transition={{delay: 0.05}}
      >
        <input
          type="file"
          id="file-upload-input"
          className="hidden"
          accept={accept}
          onChange={handleFileChange}
          disabled={uploading}
        />

        <div className="text-center">
          <AnimatePresence mode="wait">
            {selectedFile ? (
              <motion.div
                key="file-selected"
                initial={{opacity: 0, scale: 0.98}}
                animate={{opacity: 1, scale: 1}}
                exit={{opacity: 0, scale: 0.98}}
                className="space-y-5"
              >
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-pill bg-ds-bg-subtle text-ds-fg dark:bg-neutral-900 dark:text-neutral-100">
                  <FileText className="h-9 w-9" strokeWidth={1.75} />
                </div>
                <div className="mx-auto flex max-w-md items-center gap-4 rounded-pill border border-ds-border-strong bg-ds-bg-subtle px-5 py-3 dark:border-neutral-800 dark:bg-neutral-900">
                  <div className="min-w-0 flex-1 text-left">
                    <p className="truncate font-bold text-ds-fg dark:text-neutral-100">{selectedFile.name}</p>
                    <p className="text-[13px] text-ds-fg-muted dark:text-neutral-500">{formatFileSize(selectedFile.size)}</p>
                  </div>
                  <button
                    type="button"
                    className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-pill border border-ds-border text-ds-fg-muted transition hover:bg-ds-bg dark:border-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800"
                    onClick={e => {
                      e.stopPropagation();
                      setSelectedFile(null);
                    }}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div key="no-file" initial={{opacity: 0}} animate={{opacity: 1}} exit={{opacity: 0}} className="space-y-5">
                <div
                  className={`mx-auto flex h-20 w-20 items-center justify-center rounded-pill transition-colors ${
                    dragOver ? 'bg-ds-bg-composer text-ds-accent' : 'bg-ds-bg-subtle text-ds-fg-muted dark:bg-neutral-900 dark:text-neutral-500'
                  }`}
                >
                  <Upload className="h-9 w-9" strokeWidth={1.75} />
                </div>
                <div>
                  <h3 className="text-[17px] font-bold text-ds-fg dark:text-neutral-100">点击或拖拽文件到此处</h3>
                  <p className="mt-2 text-[14px] text-ds-fg-muted dark:text-neutral-500">
                    {formatHint}（{maxSizeHint}）
                  </p>
                </div>
                <button
                  type="button"
                  className="inline-flex items-center justify-center rounded-pill bg-ds-fg px-8 py-3 text-[14px] font-black text-ds-bg transition hover:opacity-90 dark:bg-neutral-100 dark:text-neutral-950"
                  onClick={e => {
                    e.stopPropagation();
                    document.getElementById('file-upload-input')?.click();
                  }}
                >
                  {selectButtonText}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {showNameInput && selectedFile && (
        <motion.div
          className="mt-6 rounded-card border border-ds-border bg-ds-bg p-5 shadow-ds-sm dark:border-neutral-800 dark:bg-neutral-950"
          initial={{opacity: 0, y: 10}}
          animate={{opacity: 1, y: 0}}
        >
          <label className="mb-2 block text-[12px] font-bold uppercase tracking-wide text-ds-fg-muted dark:text-neutral-500">{nameLabel}</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder={namePlaceholder}
            className="w-full rounded-pill border border-ds-border-strong bg-ds-bg-subtle px-4 py-3 text-[15px] text-ds-fg placeholder:text-ds-fg-faint focus:border-ds-fg focus:outline-none dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100 dark:placeholder:text-neutral-600"
            disabled={uploading}
            onClick={e => e.stopPropagation()}
          />
        </motion.div>
      )}

      <AnimatePresence>
        {error ? (
          <motion.div
            initial={{opacity: 0, y: -8}}
            animate={{opacity: 1, y: 0}}
            exit={{opacity: 0, y: -8}}
            className="mt-6 flex items-center justify-center gap-2 rounded-card border border-ds-border-strong bg-ds-bg-subtle px-4 py-3 text-center text-[14px] text-ds-fg dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200"
          >
            <AlertCircle className="h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />
            {error}
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center justify-center rounded-pill border border-ds-border-strong bg-ds-bg px-6 py-3 text-[14px] font-bold text-ds-fg transition hover:bg-ds-bg-subtle dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-100 dark:hover:bg-neutral-900"
          >
            返回
          </button>
        ) : null}
        {selectedFile ? (
          <button
            type="button"
            onClick={handleUpload}
            disabled={uploading}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-pill bg-ds-fg px-8 py-3 text-[14px] font-black text-ds-bg transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-45 dark:bg-neutral-100 dark:text-neutral-950 sm:flex-none"
          >
            {uploading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                处理中…
              </>
            ) : (
              uploadButtonText
            )}
          </button>
        ) : null}
      </div>
    </motion.div>
  );
}
