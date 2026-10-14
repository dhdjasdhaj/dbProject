import { useEffect, useMemo, useState } from 'react';
import {
  Download,
  ImageOff,
  LayoutTemplate,
  Search,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { resumeTemplateApi, type ResumeTemplate } from '../api/resumeTemplate';

function formatUsage(n: number): string {
  if (n >= 10000) return `${(n / 10000).toFixed(1)} 万`;
  return String(n);
}

function Cover({ template }: { template: ResumeTemplate }) {
  const [failed, setFailed] = useState(false);
  const [useRemote, setUseRemote] = useState(false);
  const localCover = template.coverUrl?.startsWith('/resume-template-previews/')
    ? template.coverUrl
    : template.localImagePath
      ? `/resume-template-previews/${template.sourceId}.png`
      : null;
  const coverUrl = !useRemote && localCover ? localCover : template.coverUrl;
  if (!coverUrl || failed) {
    return (
      <div className="flex aspect-[3/4] w-full items-center justify-center bg-gradient-to-br from-white/10 to-indigo-500/5 text-white/25">
        <ImageOff className="h-8 w-8" strokeWidth={1.5} />
      </div>
    );
  }
  return (
    <img
      src={coverUrl}
      alt={template.title}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => {
        if (localCover && !useRemote && template.coverUrl) setUseRemote(true);
        else setFailed(true);
      }}
      className="aspect-[3/4] w-full object-cover object-top"
    />
  );
}

export default function ResumeTemplateLibraryPage() {
  const [templates, setTemplates] = useState<ResumeTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [activeStyle, setActiveStyle] = useState('');
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      setTemplates(await resumeTemplateApi.list());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // 从数据里动态推导风格标签（简洁 / 左右分栏 / 时尚 / 表格 / …）
  const styles = useMemo(() => {
    const count = new Map<string, number>();
    for (const t of templates) {
      for (const s of t.styleTags) {
        count.set(s, (count.get(s) ?? 0) + 1);
      }
    }
    return [...count.entries()].sort((a, b) => b[1] - a[1]).map(([s]) => s);
  }, [templates]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return templates.filter((t) => {
      const okStyle = !activeStyle || t.styleTags.includes(activeStyle);
      const okQuery = !q || t.title.toLowerCase().includes(q);
      return okStyle && okQuery;
    });
  }, [templates, activeStyle, query]);

  const download = async (t: ResumeTemplate) => {
    if (downloadingId !== null) return;
    setDownloadingId(t.id);
    try {
      await resumeTemplateApi.download(t);
      toast.success('Word 模板已开始下载');
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="relative mx-auto max-w-[1320px] pb-4">
      <div className="pointer-events-none absolute left-1/2 top-[-120px] h-[360px] w-full max-w-[720px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(56,189,248,0.22)_0%,rgba(99,102,241,0.12)_40%,transparent_72%)] blur-2xl" />

      <header className="relative">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-4 py-1.5 text-xs uppercase tracking-[0.2em] text-white/70">
          <Sparkles className="h-3.5 w-3.5" strokeWidth={1.8} />
          Resume Market
        </div>
        <h1 className="mt-4 text-[clamp(1.8rem,3.6vw,2.9rem)] leading-[0.96] tracking-[-0.03em] text-white">
          <span className="ai-gradient-text ai-gradient-text-animate italic">
            简历
          </span>
          市场
        </h1>
        <p className="mt-3 max-w-[640px] text-sm leading-7 text-white/66">
          从真实简历模板站点采集的预览图与风格标签，按风格浏览，找到适合目标岗位的版面。
        </p>
      </header>

      <div className="relative mt-7 flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative w-full max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜索模板标题…"
              className="w-full rounded-full border border-white/15 bg-white/5 py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-white/35 focus:border-cyan-300/50 focus:outline-none"
            />
          </div>
          <div className="text-sm text-white/50">
            共 <span className="text-white/85">{filtered.length}</span> 个模板
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveStyle('')}
            className={`rounded-full border px-3.5 py-1.5 text-sm transition ${
              !activeStyle
                ? 'border-cyan-300/50 bg-cyan-300/15 text-cyan-100'
                : 'border-white/15 bg-white/5 text-white/70 hover:border-white/30'
            }`}
          >
            全部
          </button>
          {styles.map((s) => (
            <button
              key={s}
              onClick={() => setActiveStyle(activeStyle === s ? '' : s)}
              className={`rounded-full border px-3.5 py-1.5 text-sm transition ${
                activeStyle === s
                  ? 'border-cyan-300/50 bg-cyan-300/15 text-cyan-100'
                  : 'border-white/15 bg-white/5 text-white/70 hover:border-white/30'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex min-h-[40vh] items-center justify-center text-white/50">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white/80" />
        </div>
      ) : error ? (
        <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-center">
          <p className="text-white/60">{error}</p>
          <button
            onClick={load}
            className="rounded-full border border-white/20 bg-white/5 px-4 py-2 text-sm text-white/80 hover:border-white/40"
          >
            重新加载
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex min-h-[40vh] flex-col items-center justify-center gap-2 text-center text-white/50">
          <LayoutTemplate className="h-10 w-10" strokeWidth={1.2} />
          <p>没有匹配的模板</p>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-5 md:grid-cols-3 xl:grid-cols-4">
          {filtered.map((t) => (
            <article
              key={t.id}
              className="overflow-hidden rounded-[20px] border border-white/12 bg-white/[0.04] transition hover:-translate-y-1 hover:border-cyan-300/35 hover:bg-white/[0.07]"
            >
              <Cover template={t} />
              <div className="p-4">
                <h3
                  className="line-clamp-1 text-sm font-semibold text-white"
                  title={t.title}
                >
                  {t.title}
                </h3>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {t.styleTags.slice(0, 3).map((s) => (
                    <span
                      key={s}
                      className="rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-[0.72rem] text-white/60"
                    >
                      {s}
                    </span>
                  ))}
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs text-white/45">
                    {t.wordLocalPath
                      ? '可编辑 Word'
                      : t.usageCount > 0
                        ? `${formatUsage(t.usageCount)} 次使用`
                        : '热门'}
                  </span>
                  <button
                    onClick={() => download(t)}
                    disabled={downloadingId !== null}
                    title={
                      t.wordLocalPath ? '下载 Word 模板' : 'Word 模板暂未开放'
                    }
                    className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-xs text-white/70 transition hover:border-cyan-300/40 hover:text-white disabled:cursor-wait disabled:opacity-60"
                  >
                    <Download className="h-3.5 w-3.5" strokeWidth={1.8} />
                    {downloadingId === t.id ? '下载中…' : '下载'}
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
