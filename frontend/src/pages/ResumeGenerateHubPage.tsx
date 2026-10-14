import { ArrowRight, FileStack, PenLine, Sparkles, WandSparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const options = [
  {
    label: '从模板开始搭建',
    desc: '选择专业模板，快速进入编辑状态',
    icon: PenLine,
    path: '/resume-builder/templates',
  },
  {
    label: '直接 AI 生成简历',
    desc: '根据你的背景自动生成高质量内容',
    icon: Sparkles,
    path: '/resume-builder/ai',
  },
  {
    label: '查看已有简历',
    desc: '继续优化、复盘与投递管理',
    icon: FileStack,
    path: '/history',
  },
];

export default function ResumeGenerateHubPage() {
  const navigate = useNavigate();

  return (
    <div className="relative mx-auto max-w-[1320px] pb-8">
      <section className="relative overflow-hidden rounded-[30px] border border-white/18 bg-white/[0.16] px-6 pb-10 pt-12 shadow-[0_30px_120px_rgba(2,6,23,0.28)] backdrop-blur-[14px] sm:px-10 lg:px-14">
        <div className="pointer-events-none max-w-full absolute left-1/2 top-[-220px] h-[520px] w-[880px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(56,189,248,0.35)_0%,rgba(99,102,241,0.24)_34%,transparent_72%)] blur-2xl" />

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10 text-center"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/20 px-4 py-2 text-[0.8125rem] uppercase tracking-[0.24em] text-sky-950/80">
            <WandSparkles className="h-3.5 w-3.5 text-cyan-300" />
            Resume Intelligence Suite
          </div>

          <h1 className="mt-6 text-[clamp(2.3rem,6vw,5rem)] leading-[0.95] tracking-[-0.04em] text-sky-950 [font-family:'Playfair_Display','Times_New_Roman',serif]">
            Craft Resume
            <br />
            <span className="ai-gradient-text ai-gradient-text-animate italic">Like An AI Native</span>
          </h1>

          <p className="mx-auto mt-5 max-w-[640px] text-[0.9375rem] leading-7 text-sky-950/72 sm:text-[1.0625rem]">
            选择你的起点，进入统一的 AI 工作流：模板搭建、智能生成、持续优化，一套界面完成全部动作。
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12, duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10 mt-12 grid gap-4 md:grid-cols-3"
        >
          {options.map((option, idx) => (
            <motion.button
              key={option.label}
              type="button"
              onClick={() => navigate(option.path)}
              whileHover={{ y: -4 }}
              transition={{ duration: 0.25 }}
              className="group rounded-[22px] border border-white/26 bg-white/[0.26] p-5 text-left backdrop-blur-[18px] shadow-[0_12px_42px_rgba(30,64,175,0.2)]"
            >
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl border border-sky-600/25 bg-white/60 text-sky-700">
                <option.icon className="h-5 w-5" strokeWidth={1.9} />
              </div>
              <div className="text-[1.125rem] font-semibold text-sky-950">{option.label}</div>
              <p className="mt-2 text-sm leading-7 text-sky-900/75">{option.desc}</p>
              <div className="mt-5 inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-sky-700/85">
                Step {idx + 1}
                <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
              </div>
            </motion.button>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.7 }}
          className="relative z-10 mt-8 flex flex-wrap items-center justify-center gap-3"
        >
          <button
            type="button"
            onClick={() => navigate('/resume-builder/ai')}
            className="rounded-full border border-indigo-300/35 bg-[linear-gradient(90deg,#38bdf8,#4f46e5)] px-6 py-3 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(79,70,229,0.5)] transition hover:scale-105"
          >
            立即开始 AI 生成
          </button>
          <button
            type="button"
            onClick={() => navigate('/resume-builder/templates')}
            className="rounded-full border border-white/20 bg-white/5 px-6 py-3 text-sm text-white/85 backdrop-blur-xl transition hover:scale-105 hover:border-white/35 hover:text-white"
          >
            查看模板库
          </button>
        </motion.div>
      </section>
    </div>
  );
}
