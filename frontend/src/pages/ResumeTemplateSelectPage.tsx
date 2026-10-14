import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, LayoutTemplate, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Button } from '../components/Button';
import { RESUME_TEMPLATES, type ResumeTemplateId } from '../data/resumeTemplates';

const templateSignals: Record<ResumeTemplateId, string[]> = {
  minimal: ['结构克制', '通用投递', '留白感强'],
  technical: ['技术导向', '强调结果', '适合研发'],
  creative: ['表达更活', '产品设计向', '风格更轻盈'],
  management: ['管理叙事', '跨团队协同', '结果导向'],
};

export default function ResumeTemplateSelectPage() {
  const navigate = useNavigate();
  const [selectedId, setSelectedId] = useState<ResumeTemplateId | null>(null);

  const selected = useMemo(
    () => (selectedId ? RESUME_TEMPLATES.find(template => template.id === selectedId) : undefined),
    [selectedId],
  );

  const handleConfirm = () => {
    if (!selectedId) {
      toast.error('请先选择一个模板');
      return;
    }
    navigate(`/resume-builder/edit/${selectedId}`);
  };

  return (
    <div className="relative mx-auto max-w-[1320px] pb-8">
      <div className="pointer-events-none max-w-full absolute left-1/2 top-[-180px] h-[460px] w-[780px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(56,189,248,0.28)_0%,rgba(99,102,241,0.16)_40%,transparent_72%)] blur-2xl" />

      <section className="relative overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.04] p-6 shadow-[0_30px_120px_rgba(2,6,23,0.9)] backdrop-blur-[14px] sm:p-10">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => navigate('/resume-builder')}
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm text-white/85 hover:border-white/30 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={1.8} />
            返回入口
          </button>

          <div className="rounded-full border border-white/20 bg-white/8 px-4 py-2 text-xs uppercase tracking-[0.2em] text-white/80">
            Template Gallery
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-[clamp(2rem,4.5vw,3.6rem)] leading-[0.96] tracking-[-0.04em] text-white [font-family:'Playfair_Display','Times_New_Roman',serif]">
            Choose a
            <br />
            <span className="ai-gradient-text ai-gradient-text-animate italic">Resume Strategy</span>
          </h1>
          <p className="mt-4 max-w-[760px] text-sm leading-7 text-white/66">
            模板决定“起始叙事方式”，不是限制。你可以先选最接近目标岗位的一种结构，然后在编辑器中继续自由调整。
          </p>
        </motion.div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_340px]">
          <div className="grid gap-4 md:grid-cols-2">
            {RESUME_TEMPLATES.map((template, idx) => {
              const active = selectedId === template.id;
              return (
                <motion.button
                  key={template.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  whileHover={{ y: -4 }}
                  type="button"
                  onClick={() => setSelectedId(template.id)}
                  className={`rounded-[22px] border p-5 text-left backdrop-blur-[20px] transition ${
                    active
                      ? 'border-cyan-300/45 bg-cyan-300/12 shadow-[0_12px_40px_rgba(56,189,248,0.24)]'
                      : 'border-white/12 bg-white/[0.05] hover:border-white/28 hover:bg-white/[0.09]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="inline-flex items-center rounded-full border border-white/20 bg-black/20 px-2.5 py-1 text-[0.8125rem] uppercase tracking-[0.16em] text-white/62">
                        {template.tag}
                      </div>
                      <h3 className="mt-4 text-lg font-semibold text-white">{template.name}</h3>
                      <p className="mt-2 text-[0.8125rem] leading-6 text-white/65">{template.summary}</p>
                    </div>
                    <div className={`flex h-9 w-9 items-center justify-center rounded-xl border ${active ? 'border-cyan-300/45 bg-cyan-300/12 text-cyan-200' : 'border-white/20 bg-white/5 text-white/60'}`}>
                      {active ? <Check className="h-4 w-4" strokeWidth={2.4} /> : <LayoutTemplate className="h-4 w-4" strokeWidth={1.9} />}
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {templateSignals[template.id].map(signal => (
                      <span key={signal} className="rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-[0.8125rem] text-white/70">
                        {signal}
                      </span>
                    ))}
                  </div>

                  <div className="mt-4 text-xs text-white/50">默认包含 {template.sections.length} 个可编辑区块</div>
                </motion.button>
              );
            })}
          </div>

          <aside className="h-fit rounded-[22px] border border-white/12 bg-white/[0.05] p-5 backdrop-blur-[20px]">
            {selected ? (
              <div>
                <div className="rounded-2xl border border-cyan-300/28 bg-cyan-300/10 px-4 py-4">
                  <div className="text-[0.8125rem] uppercase tracking-[0.16em] text-cyan-200/90">Current Choice</div>
                  <div className="mt-2 text-xl font-semibold text-white">{selected.name}</div>
                  <p className="mt-2 text-sm leading-6 text-white/65">{selected.summary}</p>
                </div>

                <div className="mt-5">
                  <div className="text-[0.8125rem] uppercase tracking-[0.16em] text-white/52">Sections</div>
                  <div className="mt-3 space-y-2">
                    {selected.sections.map(section => (
                      <div key={section.key} className="flex items-center justify-between rounded-xl border border-white/12 bg-white/5 px-3 py-2.5">
                        <span className="text-sm text-white">{section.label}</span>
                        <span className="text-xs text-white/52">{section.key}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <Button variant="primary" className="mt-5 w-full" onClick={handleConfirm}>
                  使用这个模板
                </Button>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-white/20 bg-white/5 px-4 py-10 text-center">
                <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl border border-white/20 bg-white/5 text-white/65">
                  <Sparkles className="h-5 w-5" strokeWidth={1.8} />
                </div>
                <div className="mt-4 text-base font-medium text-white">还没有选中模板</div>
                <p className="mt-2 text-sm leading-6 text-white/62">从左侧选择一个方向，我会在这里展示结构摘要。</p>
              </div>
            )}
          </aside>
        </div>
      </section>
    </div>
  );
}
