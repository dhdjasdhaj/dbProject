import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, Loader2, Sparkles, TrendingUp, UploadCloud, WandSparkles } from 'lucide-react';
import { resumeApi } from '../api/resume';
import { historyApi } from '../api/history';
import { getErrorMessage } from '../api/request';

interface UploadPageProps {
  onUploadComplete: (resumeId: number) => void;
}

const showcaseCards = [
  { title: 'Prompt to CV', subtitle: '自然语言生成专业简历结构' },
  { title: 'AI Interview', subtitle: '基于岗位与简历动态追问' },
  { title: 'Score Insights', subtitle: '可解释评分 + 提升建议' },
  { title: 'Knowledge RAG', subtitle: '企业知识库联动问答' },
  { title: 'Export Ready', subtitle: '一键导出 PDF 与分享链接' },
];

interface ScorePoint {
  date: string;
  rawDate: string;
  score: number;
}

interface ChartPoint {
  x: number;
  y: number;
  date: string;
  score: number;
}

export default function UploadPage({ onUploadComplete }: UploadPageProps) {
  const reducedMotion = useReducedMotion();
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [scoreTrend, setScoreTrend] = useState<ScorePoint[]>([]);
  const [trendLoading, setTrendLoading] = useState(true);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  useEffect(() => {
    const loadScoreTrend = async () => {
      setTrendLoading(true);
      try {
        const resumes = await historyApi.getResumes();
        const detailPromises = resumes.map(r => historyApi.getResumeDetail(r.id));
        const details = await Promise.all(detailPromises);

        const points: ScorePoint[] = details
          .flatMap(detail =>
            detail.interviews
              .filter(i => (i.evaluateStatus === 'COMPLETED' || i.status === 'EVALUATED') && i.overallScore !== null)
              .map(i => ({
                rawDate: i.completedAt || i.createdAt,
                date: new Date(i.completedAt || i.createdAt).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' }),
                score: i.overallScore as number,
              })),
          )
          .sort((a, b) => new Date(a.rawDate).getTime() - new Date(b.rawDate).getTime())
          .slice(-10);

        setScoreTrend(points);
      } catch {
        setScoreTrend([]);
      } finally {
        setTrendLoading(false);
      }
    };

    void loadScoreTrend();
  }, []);

  const avgScore = useMemo(() => {
    if (scoreTrend.length === 0) return 0;
    const total = scoreTrend.reduce((sum, p) => sum + p.score, 0);
    return Math.round((total / scoreTrend.length) * 10) / 10;
  }, [scoreTrend]);

  const chart = useMemo(() => {
    const width = 620;
    const height = 280;
    const left = 48;
    const right = 598;
    const top = 20;
    const bottom = 240;
    const minScore = 0;
    const maxScore = 100;

    const points: ChartPoint[] = scoreTrend.map((point, index) => {
      const x = scoreTrend.length === 1 ? (left + right) / 2 : left + (index / (scoreTrend.length - 1)) * (right - left);
      const y = bottom - ((point.score - minScore) / (maxScore - minScore)) * (bottom - top);
      return { x, y, date: point.date, score: point.score };
    });

    const linePath = points.length ? points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') : '';
    const areaPath = points.length ? `${linePath} L ${points[points.length - 1].x} ${bottom} L ${points[0].x} ${bottom} Z` : '';

    return { width, height, left, right, top, bottom, points, linePath, areaPath };
  }, [scoreTrend]);

  const selectFile = (file: File) => {
    if (!/\.(pdf|doc|docx|txt)$/i.test(file.name) || file.size > 10 * 1024 * 1024) { setError('请选择 PDF / DOC / DOCX / TXT 文件，大小不超过 10MB'); return; }
    setError(''); setSelectedFile(file);
  };
  const handleUpload = async (file: File) => {
    setUploading(true);
    setError('');

    try {
      const data = await resumeApi.uploadAndAnalyze(file);
      if (!data.storage?.resumeId) {
        throw new Error('上传失败，请重试');
      }
      onUploadComplete(data.storage.resumeId);
    } catch (err) {
      setError(getErrorMessage(err));
      setUploading(false);
    }
  };

  return (
    <div className="relative mx-auto flex w-full studio-upload flex-col pb-16 pt-4">
      <section className="studio-hero relative overflow-hidden rounded-[30px] border border-white/18 bg-white/[0.14] px-6 pb-14 pt-12 shadow-[0_30px_120px_rgba(2,6,23,0.28)] backdrop-blur-[12px] sm:px-10 lg:px-14 lg:pb-18 lg:pt-16">


        <div className="studio-hero-orbits" aria-hidden="true"><i /><i /><i /></div>
        <motion.div
          initial={{ opacity: 0, y: 26 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10 mx-auto max-w-[1240px] text-center"
        >
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/20 px-4 py-2 text-[0.8125rem] uppercase tracking-[0.26em] text-white/92">
            <Sparkles className="h-3.5 w-3.5 text-cyan-300" />
            Premium AI Interview Studio
          </div>

          <h1 className="text-[clamp(2.4rem,5.7vw,6.8rem)] leading-[0.96] tracking-[-0.04em] text-white drop-shadow-[0_10px_26px_rgba(8,47,120,0.32)] [font-family:'Playfair_Display','Times_New_Roman',serif]">
            Generate Stunning
            <br />
            <span className="ai-gradient-text ai-gradient-text-animate italic">AI Resume & Interview</span>
          </h1>

          <p className="mx-auto mt-6 max-w-[860px] text-base leading-relaxed text-white/95 sm:text-lg">
            上传一次简历，即刻开启「AI 简历优化 + 模拟面试 + 知识库问答」全链路体验。更快准备，更高命中率。
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.97 }}
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="group relative inline-flex items-center gap-2 overflow-hidden rounded-full bg-gradient-to-r from-cyan-400 via-sky-500 to-indigo-500 px-7 py-3 text-[0.875rem] font-semibold text-white shadow-[0_10px_35px_rgba(56,189,248,0.4)]"
            >
              <span className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.35),transparent_60%)] opacity-0 transition group-hover:opacity-100" />
              <WandSparkles className="h-4 w-4" strokeWidth={1.9} />
              立即上传简历
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" strokeWidth={2} />
            </motion.button>

            <div className="rounded-full border border-white/35 bg-white/18 px-5 py-3 text-[0.8125rem] text-white/95 backdrop-blur-xl">
              支持 PDF / DOC / DOCX / TXT，最大 10MB
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10 mx-auto mt-14 grid studio-dashboard gap-6"
        >
          <div className="rounded-[24px] border border-white/35 bg-white/[0.23] p-5 shadow-[0_18px_70px_rgba(30,64,175,0.24)] backdrop-blur-[22px] transition duration-300 hover:-translate-y-1 hover:shadow-[0_26px_92px_rgba(30,58,138,0.28)] sm:p-7">
            <div className="mb-4 flex flex-wrap gap-2 items-center justify-between">
              <div className="text-xs uppercase tracking-[0.22em] text-sky-950/65">My Interview Analytics</div>
              <div className="rounded-full border border-sky-700/20 bg-white/55 px-3 py-1 text-[0.8125rem] text-sky-700">个人数据</div>
            </div>

            <div className="rounded-2xl border border-white/35 bg-white/45 px-4 py-3">
              <div className="text-[0.8125rem] text-sky-900/65">平均得分</div>
              <div className="mt-1 flex items-end gap-2">
                <div className="text-3xl font-semibold text-sky-950">{scoreTrend.length ? avgScore : '—'}</div>
                <div className="pb-1 text-xs text-sky-700/75">最近 {scoreTrend.length} 次面试</div>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-white/35 bg-white/45 p-4">
              <div className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-sky-950">
                <TrendingUp className="h-4 w-4 text-sky-700" />
                面试得分趋势（横轴：日期，纵轴：得分）
              </div>

              <div className="h-[clamp(220px,18vw,360px)] rounded-xl border border-sky-200/70 bg-white/60 p-3">
                {trendLoading ? (
                  <div className="flex h-full items-center justify-center text-sm text-sky-800/70">加载你的面试数据中…</div>
                ) : chart.points.length === 0 ? (
                  <div className="studio-empty-chart"><span><TrendingUp /></span><strong>你的成长，将在这里被看见</strong><p>完成一次模拟面试，即可查看得分与进步趋势。</p><div className="studio-empty-chart-bars" aria-hidden="true">{[24,38,33,51,46,67,80].map((h,i)=><i key={i} style={{height:h+'%'}} />)}</div></div>
                ) : (
                  <svg viewBox={`0 0 ${chart.width} ${chart.height}`} className="h-full w-full" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="scoreLine" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#38bdf8" />
                        <stop offset="100%" stopColor="#4f46e5" />
                      </linearGradient>
                      <linearGradient id="scoreArea" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="rgba(56,189,248,0.30)" />
                        <stop offset="100%" stopColor="rgba(79,70,229,0.05)" />
                      </linearGradient>
                    </defs>

                    {[0, 20, 40, 60, 80, 100].map(tick => {
                      const y = chart.bottom - (tick / 100) * (chart.bottom - chart.top);
                      return (
                        <g key={`y-${tick}`}>
                          <line x1={chart.left} y1={y} x2={chart.right} y2={y} stroke="rgba(15,23,42,0.12)" strokeWidth="1" />
                          <text x={chart.left - 10} y={y + 4} textAnchor="end" fontSize="11" fill="rgba(15,23,42,0.65)">{tick}</text>
                        </g>
                      );
                    })}

                    <line x1={chart.left} y1={chart.top} x2={chart.left} y2={chart.bottom} stroke="rgba(15,23,42,0.2)" strokeWidth="1.2" />
                    <line x1={chart.left} y1={chart.bottom} x2={chart.right} y2={chart.bottom} stroke="rgba(15,23,42,0.2)" strokeWidth="1.2" />

                    <path d={chart.areaPath} fill="url(#scoreArea)" />
                    <path d={chart.linePath} fill="none" stroke="url(#scoreLine)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

                    {chart.points.map((p, index) => (
                      <g key={`${p.date}-${index}`}>
                        <circle
                          cx={p.x}
                          cy={p.y}
                          r={hoveredIndex === index ? 6 : 4}
                          fill="#0f172a"
                          stroke="#e0f2fe"
                          strokeWidth="2"
                          onMouseEnter={() => setHoveredIndex(index)}
                          onMouseLeave={() => setHoveredIndex(null)}
                        />
                        <text x={p.x} y={chart.bottom + 18} textAnchor="middle" fontSize="11" fill="rgba(15,23,42,0.65)">
                          {p.date}
                        </text>
                      </g>
                    ))}

                    {hoveredIndex !== null ? (
                      <g>
                        <line
                          x1={chart.points[hoveredIndex].x}
                          y1={chart.top}
                          x2={chart.points[hoveredIndex].x}
                          y2={chart.bottom}
                          stroke="rgba(59,130,246,0.25)"
                          strokeWidth="1"
                          strokeDasharray="4 4"
                        />
                        <rect
                          x={Math.max(chart.left + 6, chart.points[hoveredIndex].x - 46)}
                          y={Math.max(chart.top + 4, chart.points[hoveredIndex].y - 38)}
                          width="92"
                          height="30"
                          rx="8"
                          fill="rgba(15,23,42,0.9)"
                        />
                        <text
                          x={Math.max(chart.left + 52, chart.points[hoveredIndex].x)}
                          y={Math.max(chart.top + 22, chart.points[hoveredIndex].y - 20)}
                          textAnchor="middle"
                          fontSize="12"
                          fill="#f8fafc"
                        >
                          {chart.points[hoveredIndex].date} · {chart.points[hoveredIndex].score}分
                        </text>
                      </g>
                    ) : null}
                  </svg>
                )}
              </div>
            </div>
          </div>

          <motion.div
            whileHover={{ y: -4 }}
            className="rounded-[24px] border border-white/35 bg-white/[0.23] p-6 backdrop-blur-[22px] shadow-[0_12px_46px_rgba(30,64,175,0.22)]"
          >
            <div className="mb-3 text-xs uppercase tracking-[0.2em] text-sky-950/65">Start now</div>
            <h3 className="text-2xl font-semibold tracking-tight text-sky-950">Drop your resume</h3>
            <p className="mt-2 text-sm leading-7 text-sky-900/75">一步进入高端 AI 面试流程，系统将在后台自动分析并生成面试策略。</p>

            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".pdf,.doc,.docx,.txt"
              onChange={e => {
                const file = e.target.files?.[0];
                if (!file) return;
                selectFile(file);
              }}
              disabled={uploading}
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              onDragOver={e => { e.preventDefault(); if (!uploading) setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={e => { e.preventDefault(); setDragging(false); if (!uploading && e.dataTransfer.files[0]) selectFile(e.dataTransfer.files[0]); }}
              data-dragging={dragging}
              className="studio-dropzone mt-6 flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-sky-500/45 bg-white/45 px-4 py-9 text-sky-900/80 transition hover:border-sky-500 hover:bg-white/60"
            >
              <UploadCloud className="h-5 w-5" />
              点击选择文件或拖拽到此处
            </button>

            <AnimatePresence>
              {selectedFile ? (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  className="mt-4 rounded-2xl border border-white/12 bg-black/30 px-4 py-3"
                >
                  <div className="text-xs text-white/55">已选择文件</div>
                  <div className="mt-1 truncate text-sm font-medium text-white">{selectedFile.name}</div>
                </motion.div>
              ) : null}
            </AnimatePresence>

            <AnimatePresence>
              {error ? (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="mt-4 rounded-2xl border border-rose-300/35 bg-rose-400/10 px-3 py-2 text-sm text-rose-900"
                >
                  {error}
                </motion.div>
              ) : null}
            </AnimatePresence>

            <motion.button
              whileHover={{ scale: selectedFile && !uploading ? 1.05 : 1 }}
              whileTap={{ scale: selectedFile && !uploading ? 0.98 : 1 }}
              type="button"
              disabled={!selectedFile || uploading}
              onClick={() => selectedFile && handleUpload(selectedFile)}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full border border-indigo-300/35 bg-[linear-gradient(90deg,#38bdf8,#4f46e5)] px-5 py-3 text-sm font-semibold text-white shadow-[0_10px_28px_rgba(79,70,229,0.45)] transition disabled:cursor-not-allowed disabled:opacity-45"
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {uploading ? 'AI 分析中…' : '上传并开始 AI 面试'}
            </motion.button>
          </motion.div>
        </motion.div>
      </section>

      <Link to="/community" className="studio-community-banner"><span className="studio-community-icon"><Sparkles /></span><div><span>COMMUNITY / BETTER TOGETHER</span><h2>好问题，好建议，和你一起向前。</h2><p>旋转话题星球，分享你的经验，交流下一次机会。</p></div><span className="studio-community-link">探索社区 <ArrowRight /></span></Link>
      <section className="mt-10 overflow-hidden">
        <div className="mb-4 text-center text-xs uppercase tracking-[0.28em] text-white/42">Powered Experience</div>
        <div className="relative overflow-hidden">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0, x: reducedMotion ? 0 : ['0%', '-50%'] }}
            transition={{
              opacity: { delay: 0.25, duration: 0.6 },
              y: { delay: 0.25, duration: 0.6 },
              x: { repeat: Infinity, repeatType: 'loop', ease: 'linear', duration: 20 },
            }}
            className="flex w-max gap-4 pb-2"
          >
            {showcaseCards.concat(showcaseCards).map((card, idx) => (
              <div
                key={`${card.title}-${idx}`}
                className="min-w-[250px] rounded-[18px] border border-white/12 bg-white/[0.045] p-4 backdrop-blur-[20px] transition duration-300 hover:-translate-y-1 hover:border-cyan-200/50 hover:shadow-[0_12px_30px_rgba(56,189,248,0.25)]"
              >
                <div className="text-sm font-semibold text-white">{card.title}</div>
                <div className="mt-2 text-xs leading-6 text-white/62">{card.subtitle}</div>
              </div>
            ))}
          </motion.div>
          <div className="pointer-events-none absolute inset-y-0 left-0 w-28">
            <div className="absolute inset-0 bg-gradient-to-r from-white/28 via-white/10 to-transparent" />
            <div className="absolute inset-0 backdrop-blur-sm [mask-image:linear-gradient(to_right,black,transparent)]" />
          </div>
          <div className="pointer-events-none absolute inset-y-0 right-0 w-28">
            <div className="absolute inset-0 bg-gradient-to-l from-white/28 via-white/10 to-transparent" />
            <div className="absolute inset-0 backdrop-blur-sm [mask-image:linear-gradient(to_left,black,transparent)]" />
          </div>
        </div>
      </section>
    </div>
  );
}
