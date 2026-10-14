import {AnimatePresence, motion} from 'framer-motion';
import {useMemo} from 'react';
import type {InterviewMode, InterviewSession, VideoInterviewConfig} from '../types/interview';

function buildDistributionText(resumeText: string, questionCount: number) {
  const text = resumeText.toLowerCase();
  const buckets: Array<{label: string; weight: number}> = [
    {label: '项目经历', weight: 35},
  ];

  const containsAny = (...keywords: string[]) => keywords.some(keyword => text.includes(keyword));

  if (containsAny('产品', 'prd', '需求', '原型', 'axure', '用户研究', '竞品', '增长', '转化')) {
    buckets.push({label: '产品设计', weight: 25}, {label: '业务分析', weight: 20});
  }
  if (containsAny('测试', 'jmeter', 'postman', '自动化', '接口测试', '性能测试', 'selenium')) {
    buckets.push({label: '测试设计', weight: 25}, {label: '质量保障', weight: 20});
  }
  if (containsAny('前端', 'vue', 'react', 'typescript', 'javascript', 'html', 'css', '小程序', 'uniapp')) {
    buckets.push({label: '前端工程', weight: 25}, {label: '性能优化', weight: 15});
  }
  if (containsAny('python', '数据分析', 'sql', 'bi', '报表', '指标', '埋点', 'a/b', '实验')) {
    buckets.push({label: '数据分析', weight: 20});
  }
  if (containsAny('算法', '机器学习', '模型', '推荐', '召回', '排序', '特征', '训练')) {
    buckets.push({label: '算法与模型', weight: 25});
  }
  if (containsAny('运营', '活动', '投放', '社群', '内容', '留存', '拉新', '复购')) {
    buckets.push({label: '运营策略', weight: 25});
  }
  if (containsAny('设计', 'ui', 'ux', '交互', '视觉', 'figma', 'sketch')) {
    buckets.push({label: '设计方法', weight: 20});
  }
  if (containsAny('mysql', 'sql', '索引', '事务', '数据库')) {
    buckets.push({label: 'MySQL / 数据库', weight: 20});
  }
  if (containsAny('redis', '缓存', '分布式锁', 'lua')) {
    buckets.push({label: 'Redis / 缓存', weight: 15});
  }
  if (containsAny('spring boot', 'springboot', 'spring')) {
    buckets.push({label: 'Spring 生态', weight: 12});
  }
  if (containsAny('线程池', '并发', '多线程', '锁', '线程')) {
    buckets.push({label: '并发与稳定性', weight: 12});
  }
  if (containsAny('jvm', 'gc', '内存', '异常', 'java')) {
    buckets.push({label: 'Java 基础', weight: 10});
  }

  if (buckets.length === 1) {
    buckets.push({label: '通用能力', weight: 20});
  }

  const totalWeight = buckets.reduce((sum, bucket) => sum + bucket.weight, 0);
  let assigned = 0;

  return buckets.map((bucket, index) => {
    const count = index === buckets.length - 1
      ? Math.max(1, questionCount - assigned)
      : Math.max(1, Math.round(questionCount * bucket.weight / totalWeight));
    assigned += count;
    const percent = Math.max(5, Math.round(bucket.weight * 100 / totalWeight));
    return `${bucket.label}(${percent}%)`;
  }).join(' + ');
}

interface InterviewConfigPanelProps {
  questionCount: number;
  onQuestionCountChange: (count: number) => void;
  mode: InterviewMode;
  onModeChange: (mode: InterviewMode) => void;
  videoConfig: VideoInterviewConfig;
  onVideoConfigChange: (config: VideoInterviewConfig) => void;
  onStart: () => void;
  isCreating: boolean;
  checkingUnfinished: boolean;
  unfinishedSession: InterviewSession | null;
  onContinueUnfinished: () => void;
  onStartNew: () => void;
  resumeText: string;
  onBack: () => void;
  error?: string;
}

export default function InterviewConfigPanel({
  questionCount,
  onQuestionCountChange,
  mode,
  onModeChange,
  videoConfig,
  onVideoConfigChange,
  onStart,
  isCreating,
  checkingUnfinished,
  unfinishedSession,
  onContinueUnfinished,
  onStartNew,
  resumeText,
  onBack,
  error
}: InterviewConfigPanelProps) {
  const questionCounts = [6, 8, 10, 12, 15];
  const distributionText = useMemo(() => buildDistributionText(resumeText, questionCount), [resumeText, questionCount]);

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-10 text-white sm:px-10 sm:py-12">
      <motion.div initial={{opacity: 0, y: 12}} animate={{opacity: 1, y: 0}} transition={{duration: 0.25}}>
        <header className="mb-10">
          <h1 className="text-[28px] font-black tracking-tight text-ds-fg dark:text-neutral-50">开始一场模拟面试</h1>
          <p className="mt-2 max-w-prose text-[15px] leading-relaxed text-ds-fg-muted dark:text-neutral-400">
            {mode === 'VIDEO'
              ? '视频面试会先基于你的简历生成少量主问题与参考答案，后续由 AI 面试官根据你的表现动态决定继续追问、切换主问题或结束面试。'
              : '选择题目数量后，系统会基于你的简历同步生成结构化问答和参考答案。界面采用「文档式」阅读体验，便于长时间作答。'}
          </p>
        </header>

        <AnimatePresence>
          {checkingUnfinished && (
            <motion.div
              initial={{opacity: 0, y: -8}}
              animate={{opacity: 1, y: 0}}
              exit={{opacity: 0, y: -8}}
              className="mb-8 rounded-[24px] border border-white/12 bg-white/[0.06] px-4 py-4 text-center text-[13px] text-white/68 shadow-[0_18px_42px_rgba(2,6,23,0.32)] backdrop-blur-[18px]"
            >
              正在检查是否有未完成的面试…
            </motion.div>
          )}

          {unfinishedSession && !checkingUnfinished && (
            <motion.div
              initial={{opacity: 0, y: -8}}
              animate={{opacity: 1, y: 0}}
              exit={{opacity: 0, y: -8}}
              className="mb-8 rounded-[24px] border border-white/12 bg-white/[0.06] px-5 py-5 shadow-[0_18px_42px_rgba(2,6,23,0.32)] backdrop-blur-[18px]"
            >
              <p className="text-[15px] font-bold text-white">检测到未完成的模拟面试</p>
              <p className="mt-1 text-[13px] text-white/62">
                {mode === 'VIDEO'
                  ? `当前已推进到第 ${unfinishedSession.currentQuestionIndex + 1} 个主问题阶段，后续将由 AI 动态决定继续追问、切换主问题或结束面试`
                  : `已完成 ${unfinishedSession.currentQuestionIndex} / ${unfinishedSession.totalQuestions} 题`}
              </p>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={onContinueUnfinished}
                  className="inline-flex flex-1 items-center justify-center rounded-pill border border-white/12 bg-white px-5 py-3 text-[14px] font-bold text-slate-950 transition hover:bg-white/92"
                >
                  继续完成
                </button>
                <button
                  type="button"
                  onClick={onStartNew}
                  className="inline-flex flex-1 items-center justify-center rounded-pill border border-white/12 bg-black/20 px-5 py-3 text-[14px] font-bold text-white transition hover:bg-black/28"
                >
                  开始新的
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <section className="space-y-10">
          <div>
            <p className="mb-3 text-[12px] font-bold uppercase tracking-wide text-ds-fg-muted dark:text-neutral-500">面试模式</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {([
                {key: 'TEXT', title: '文字面试', desc: '延续当前聊天式答题流程，适合快速练习内容表达。'},
                {key: 'VIDEO', title: '视频面试', desc: 'AI 语音提问、自动录制回答、转写分析并按追问决策自动推进。'},
              ] as const).map(item => {
                const active = mode === item.key;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => onModeChange(item.key)}
                    className={`rounded-[24px] border px-4 py-4 text-left transition ${
                      active
                        ? 'border-cyan-300/32 bg-cyan-400/12 shadow-[0_16px_36px_rgba(34,211,238,0.12)]'
                        : 'border-white/12 bg-white/[0.05] hover:bg-white/[0.08]'
                    }`}
                  >
                    <p className={`text-[15px] font-bold ${active ? 'text-cyan-100' : 'text-white'}`}>{item.title}</p>
                    <p className="mt-2 text-[12px] leading-6 text-white/55">{item.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {mode === 'VIDEO' ? (
            <div className="rounded-[24px] border border-cyan-300/16 bg-cyan-400/10 p-5 shadow-[0_18px_42px_rgba(8,145,178,0.08)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[15px] font-bold text-cyan-50">视频面试初始配置</p>
                  <p className="mt-1 text-[13px] leading-6 text-cyan-100/72">
                    已支持摄像头/麦克风采集、题目语音播报、单题录制上传、自动追问和自动推进流程。
                  </p>
                </div>
                <span className="rounded-pill border border-cyan-300/20 bg-cyan-300/14 px-3 py-1 text-[12px] font-bold text-cyan-100">
                  进阶版
                </span>
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div className="rounded-[20px] border border-white/10 bg-black/18 px-4 py-4">
                  <span className="text-[12px] font-bold uppercase tracking-wide text-white/45">追问策略</span>
                  <p className="mt-3 text-[13px] leading-6 text-white/68">
                    追问由 AI 根据回答质量动态决定，单个主问题最多 3 次追问。
                  </p>
                </div>

                <label className="flex items-center justify-between rounded-[20px] border border-white/10 bg-black/18 px-4 py-4">
                  <div>
                    <p className="text-[14px] font-bold text-white">开启摄像头</p>
                    <p className="mt-1 text-[12px] text-white/45">后续将用于表情与姿态分析</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={videoConfig.videoEnabled}
                    onChange={e => onVideoConfigChange({...videoConfig, videoEnabled: e.target.checked})}
                    className="h-4 w-4 accent-cyan-300"
                  />
                </label>

                <label className="flex items-center justify-between rounded-[20px] border border-white/10 bg-black/18 px-4 py-4">
                  <div>
                    <p className="text-[14px] font-bold text-white">开启麦克风</p>
                    <p className="mt-1 text-[12px] text-white/45">后续将用于语音识别与语速分析</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={videoConfig.audioEnabled}
                    onChange={e => onVideoConfigChange({...videoConfig, audioEnabled: e.target.checked})}
                    className="h-4 w-4 accent-cyan-300"
                  />
                </label>
              </div>
            </div>
          ) : null}

          {mode !== 'VIDEO' ? (
            <div>
              <p className="mb-3 text-[12px] font-bold uppercase tracking-wide text-ds-fg-muted dark:text-neutral-500">题目数量</p>
              <div className="flex flex-wrap gap-2">
                {questionCounts.map(count => {
                  const active = questionCount === count;
                  return (
                    <button
                      key={count}
                      type="button"
                      onClick={() => onQuestionCountChange(count)}
                      className={`min-w-[3.25rem] rounded-pill px-4 py-2.5 text-[14px] font-bold transition ${
                        active
                          ? 'bg-white text-slate-950 shadow-[0_12px_24px_rgba(255,255,255,0.16)]'
                          : 'border border-white/12 bg-black/18 text-white/68 hover:bg-black/26'
                      }`}
                    >
                      {count}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="rounded-[24px] border border-white/12 bg-white/[0.06] p-5 shadow-[0_18px_42px_rgba(2,6,23,0.32)] backdrop-blur-[18px]">
              <p className="text-[15px] font-bold text-white">主问题生成策略</p>
              <p className="mt-2 text-[13px] leading-6 text-white/62">
                视频面试会先基于你的简历预生成少量主问题和对应参考答案，后续由 AI 面试官根据你的回答质量动态决定：继续追问、切换到下一个主问题，或直接结束面试。
              </p>
              <p className="mt-3 text-[13px] leading-6 text-cyan-100/78">
                你无需手动选择题目数量，系统会自动控制整体节奏与结束时机。
              </p>
            </div>
          )}

          <div>
            <p className="mb-3 text-[12px] font-bold uppercase tracking-wide text-ds-fg-muted dark:text-neutral-500">简历预览（前 500 字）</p>
            <div className="rounded-[24px] border border-white/12 bg-white/[0.06] p-4 shadow-[0_18px_42px_rgba(2,6,23,0.32)] backdrop-blur-[18px]">
              <p className="max-h-40 overflow-auto whitespace-pre-wrap break-words text-[13px] leading-relaxed text-white/68">
                {resumeText.substring(0, 500)}
                {resumeText.length > 500 ? '…' : ''}
              </p>
            </div>
          </div>

          <p className="text-[13px] leading-relaxed text-ds-fg-muted dark:text-neutral-400">
            {mode === 'VIDEO'
              ? '视频模式会根据主问题参考答案和你的现场表现，动态决定继续追问、切换主问题或结束面试。'
              : `题目分布：${distributionText}`}
          </p>

          <AnimatePresence>
            {error ? (
              <motion.div
                initial={{opacity: 0, y: -8}}
                animate={{opacity: 1, y: 0}}
                exit={{opacity: 0, y: -8}}
                className="rounded-[22px] border border-amber-300/20 bg-amber-400/10 px-4 py-3 text-[13px] text-amber-100 shadow-[0_12px_28px_rgba(245,158,11,0.08)]"
              >
                {error}
              </motion.div>
            ) : null}
          </AnimatePresence>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center justify-center rounded-pill border border-white/12 bg-black/20 px-6 py-3 text-[14px] font-bold text-white transition hover:bg-black/28"
            >
              返回
            </button>
            <div className="flex flex-col items-stretch gap-2 sm:items-end">
              <button
                type="button"
                onClick={onStart}
                disabled={isCreating}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-pill border border-white/12 bg-white px-8 py-3 text-[14px] font-black text-slate-950 transition hover:bg-white/92 disabled:cursor-not-allowed disabled:opacity-45 sm:flex-none"
              >
                {isCreating ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-ds-bg/30 border-t-ds-bg dark:border-neutral-950/30 dark:border-t-neutral-950" />
                    正在生成题目与参考答案，请稍候…
                  </>
                ) : (
                  <>开始面试</>
                )}
              </button>
              {isCreating ? (
                <p className="text-center text-[12px] text-white/55 sm:text-right">
                  首次创建可能需要几分钟，请勿重复点击或关闭页面。
                </p>
              ) : null}
            </div>
          </div>
        </section>
      </motion.div>
    </div>
  );
}
