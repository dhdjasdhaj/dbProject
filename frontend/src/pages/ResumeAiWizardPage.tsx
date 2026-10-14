import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, LoaderCircle, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { getErrorMessage } from '../api';
import { resumeApi } from '../api/resume';
import { Button } from '../components/Button';
import { Textarea } from '../components/Input';
import {
  clearResumeAiWizardDraft,
  loadResumeAiWizardDraft,
  saveResumeAiWizardDraft,
  type ResumeAiWizardPayload,
} from '../utils/resumeAiWizardDraft';
import {
  loadAllResumeBuilderDrafts,
  saveResumeBuilderDraft,
  type ResumeBuilderDraftPayload,
} from '../utils/resumeBuilderDraft';

const STEPS = ['确认身份', '补充教育经历', '选择求职方向', '教育亮点标签', '实习经验标签', '证书/竞赛标签', '补充说明并生成'];
const IDENTITIES = ['应届生/在校生', '社招求职者', '转行求职者'];
const JOBS = ['Java 后端开发', '前端开发', '测试开发', '数据开发/分析', '算法工程师', 'SRE/运维', '产品经理'];
const EDU = ['985/211', '双一流', '专业排名前 10%', '奖学金', '学生干部', '竞赛获奖', '科研经历'];
const INTERN = ['大厂实习', '中厂实习', '开源贡献', '课程项目', '创业项目', '比赛项目'];
const CERT = ['英语六级', '英语四级', '计算机二级', '软考证书', '云厂商认证', '教师/会计'];

const INIT: ResumeAiWizardPayload = {
  identity: '',
  major: '',
  educationInfo: '',
  jobTargets: [],
  educationTags: [],
  internshipTags: [],
  certificateTags: [],
  additionalNotes: '',
};

const AI_TEMPLATE_ID = 'technical';
type TagKey = 'jobTargets' | 'educationTags' | 'internshipTags' | 'certificateTags';

export default function ResumeAiWizardPage() {
  const navigate = useNavigate();
  const [payload, setPayload] = useState(INIT);
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [customJobTarget, setCustomJobTarget] = useState('');
  const [customEduTag, setCustomEduTag] = useState('');
  const [customInternTag, setCustomInternTag] = useState('');
  const [customCertTag, setCustomCertTag] = useState('');
  




  useEffect(() => {
    const draft = loadResumeAiWizardDraft();
    if (draft) setPayload({ ...INIT, ...draft });
  }, []);

  useEffect(() => {
    saveResumeAiWizardDraft(payload);
  }, [payload]);

  const done = Math.round(((step + 1) / STEPS.length) * 100);
  const next = () => setStep(v => Math.min(v + 1, STEPS.length - 1));
  const back = () => setStep(v => Math.max(v - 1, 0));

  const ensure = (ok: boolean, msg: string) => (ok ? next() : toast.error(msg));

  const toggle = (k: TagKey, value: string) => {
    setPayload(prev => ({
      ...prev,
      [k]: prev[k].includes(value) ? prev[k].filter(v => v !== value) : [...prev[k], value],
    }));
  };

  const generate = async () => {
    setLoading(true);
    setProgress(10);
    const timer = window.setInterval(() => setProgress(v => (v >= 92 ? v : v + 10)), 650);

    try {
      const drafts = loadAllResumeBuilderDrafts().filter(d => d.sections && Object.keys(d.sections).length > 0);
      const result = await resumeApi.generateByAi({
        ...payload,
        templateId: AI_TEMPLATE_ID,
        historicalContext: { wizardDraft: loadResumeAiWizardDraft() ?? payload, builderDrafts: drafts },
      });

      const draft: ResumeBuilderDraftPayload = {
        templateId: AI_TEMPLATE_ID,
        updatedAt: new Date().toISOString(),
        aiMeta: result.aiMeta,
        sections: result.sections,
      };

      saveResumeBuilderDraft(draft);
      clearResumeAiWizardDraft();
      setProgress(100);
      toast.success('AI 简历初稿已生成');
      window.setTimeout(() => navigate(`/resume-builder/edit/${AI_TEMPLATE_ID}`), 400);
    } catch (e) {
      setLoading(false);
      setProgress(0);
      toast.error(getErrorMessage(e));
    } finally {
      window.clearInterval(timer);
    }
  };

  const chip = (value: string, active: boolean, onClick: () => void) => (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-4 py-2 text-sm transition ${active ? 'border-cyan-300/45 bg-cyan-300/15 text-cyan-100' : 'border-white/20 bg-white/5 text-white/80 hover:bg-white/10'}`}
    >
      {active ? '✓ ' : ''}
      {value}
    </button>
  );

  const panel = [
    <div key="s1" className="grid gap-3 md:grid-cols-3">
      {IDENTITIES.map(v => (
        <button
          key={v}
          type="button"
          onClick={() => {
            setPayload(x => ({ ...x, identity: v }));
            next();
          }}
          className={`rounded-2xl border p-4 text-left ${payload.identity === v ? 'border-cyan-300/45 bg-cyan-300/12' : 'border-white/20 bg-white/5 hover:bg-white/10'}`}
        >
          <div className="font-semibold text-white">{v}</div>
        </button>
      ))}
    </div>,

    <div key="s2">
      <Textarea rows={5} value={payload.educationInfo} onChange={e => setPayload(x => ({ ...x, educationInfo: e.target.value }))} placeholder="例如：XX 大学 软件工程本科，2022-2026，GPA 3.7/4.0，主修数据结构/操作系统..." className="rounded-2xl border-white/20 bg-white/5 text-white placeholder:text-white/40" />
      <div className="mt-4 flex gap-3"><Button variant="ghost" onClick={back}>上一步</Button><Button variant="primary" onClick={() => ensure(!!payload.educationInfo.trim(), '请先填写教育经历')}>下一步</Button></div>
    </div>,

    <div key="s3">
      <div className="flex flex-wrap gap-3">
        {JOBS.map(v => chip(v, payload.jobTargets.includes(v), () => toggle('jobTargets', v)))}
        {payload.jobTargets.filter(v => !JOBS.includes(v)).map(v => chip(v, true, () => toggle('jobTargets', v)))}
      </div>
      <div className="mt-4 rounded-2xl border border-white/18 bg-white/5 p-3">
        <div className="mb-2 text-xs text-white/60">其他求职方向（选项里没有可自定义）</div>
        <div className="flex gap-2">
          <input
            value={customJobTarget}
            onChange={e => setCustomJobTarget(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault();
                const text = customJobTarget.trim();
                if (!text) {
                  toast.error('请先输入求职方向');
                  return;
                }
                setPayload(prev => ({
                  ...prev,
                  jobTargets: prev.jobTargets.includes(text) ? prev.jobTargets : [...prev.jobTargets, text],
                }));
                
                setCustomJobTarget('');
              }
            }}
            placeholder="例如：Android 开发 / 游戏客户端"
            className="w-full rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white outline-none placeholder:text-white/40"
          />
          <Button variant="ghost" className="whitespace-nowrap" onClick={() => {
            const text = customJobTarget.trim();
            if (!text) {
              toast.error('请先输入求职方向');
              return;
            }
            setPayload(prev => ({
              ...prev,
              jobTargets: prev.jobTargets.includes(text) ? prev.jobTargets : [...prev.jobTargets, text],
            }));
            
                setCustomJobTarget('');
          }}>添加</Button>
        </div>
      </div>
      <div className="mt-4 flex gap-3"><Button variant="ghost" onClick={back}>上一步</Button><Button variant="primary" onClick={() => ensure(payload.jobTargets.length > 0, '请至少选择一个求职方向')}>下一步</Button></div>
    </div>,

    <div key="s4">
      <div className="flex flex-wrap gap-3">{EDU.map(v => chip(v, payload.educationTags.includes(v), () => toggle('educationTags', v)))}</div>
      <div className="mt-4 rounded-2xl border border-white/18 bg-white/5 p-3">
        <div className="mb-2 text-xs text-white/60">其他教育亮点（例如：交换经历、双学位）</div>
        <div className="flex gap-2">
          <input
            value={customEduTag}
            onChange={e => setCustomEduTag(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault();
                const text = customEduTag.trim();
                if (!text) {
                  toast.error('请先输入教育亮点');
                  return;
                }
                setPayload(prev => ({
                  ...prev,
                  educationTags: prev.educationTags.includes(text) ? prev.educationTags : [...prev.educationTags, text],
                }));
                
                setCustomEduTag('');
              }
            }}
            placeholder="输入自定义教育亮点"
            className="w-full rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white outline-none placeholder:text-white/40"
          />
          <Button variant="ghost" className="whitespace-nowrap" onClick={() => {
            const text = customEduTag.trim();
            if (!text) {
              toast.error('请先输入教育亮点');
              return;
            }
            setPayload(prev => ({
              ...prev,
              educationTags: prev.educationTags.includes(text) ? prev.educationTags : [...prev.educationTags, text],
            }));
            
                setCustomEduTag('');
          }}>添加</Button>
        </div>
      </div>
      <div className="mt-4 flex gap-3"><Button variant="ghost" onClick={back}>上一步</Button><Button variant="primary" onClick={next}>下一步</Button></div>
    </div>,

    <div key="s5">
      <div className="flex flex-wrap gap-3">{INTERN.map(v => chip(v, payload.internshipTags.includes(v), () => toggle('internshipTags', v)))}</div>
      <div className="mt-4 rounded-2xl border border-white/18 bg-white/5 p-3">
        <div className="mb-2 text-xs text-white/60">其他实习经验标签（例如：海外实习、科研助理）</div>
        <div className="flex gap-2">
          <input
            value={customInternTag}
            onChange={e => setCustomInternTag(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault();
                const text = customInternTag.trim();
                if (!text) {
                  toast.error('请先输入实习经验标签');
                  return;
                }
                setPayload(prev => ({
                  ...prev,
                  internshipTags: prev.internshipTags.includes(text) ? prev.internshipTags : [...prev.internshipTags, text],
                }));
                
                setCustomInternTag('');
              }
            }}
            placeholder="输入自定义实习经验标签"
            className="w-full rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white outline-none placeholder:text-white/40"
          />
          <Button variant="ghost" className="whitespace-nowrap" onClick={() => {
            const text = customInternTag.trim();
            if (!text) {
              toast.error('请先输入实习经验标签');
              return;
            }
            setPayload(prev => ({
              ...prev,
              internshipTags: prev.internshipTags.includes(text) ? prev.internshipTags : [...prev.internshipTags, text],
            }));
            
                setCustomInternTag('');
          }}>添加</Button>
        </div>
      </div>
      <div className="mt-4 flex gap-3"><Button variant="ghost" onClick={back}>上一步</Button><Button variant="primary" onClick={next}>下一步</Button></div>
    </div>,

    <div key="s6">
      <div className="flex flex-wrap gap-3">{CERT.map(v => chip(v, payload.certificateTags.includes(v), () => toggle('certificateTags', v)))}</div>
      <div className="mt-4 rounded-2xl border border-white/18 bg-white/5 p-3">
        <div className="mb-2 text-xs text-white/60">其他证书/竞赛标签（选项外可补充）</div>
        <div className="flex gap-2">
          <input
            value={customCertTag}
            onChange={e => setCustomCertTag(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault();
                const text = customCertTag.trim();
                if (!text) {
                  toast.error('请先输入证书/竞赛标签');
                  return;
                }
                setPayload(prev => ({
                  ...prev,
                  certificateTags: prev.certificateTags.includes(text) ? prev.certificateTags : [...prev.certificateTags, text],
                }));
                
                setCustomCertTag('');
              }
            }}
            placeholder="输入自定义证书/竞赛标签"
            className="w-full rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white outline-none placeholder:text-white/40"
          />
          <Button variant="ghost" className="whitespace-nowrap" onClick={() => {
            const text = customCertTag.trim();
            if (!text) {
              toast.error('请先输入证书/竞赛标签');
              return;
            }
            setPayload(prev => ({
              ...prev,
              certificateTags: prev.certificateTags.includes(text) ? prev.certificateTags : [...prev.certificateTags, text],
            }));
            
                setCustomCertTag('');
          }}>添加</Button>
        </div>
      </div>
      <div className="mt-4 flex gap-3"><Button variant="ghost" onClick={back}>上一步</Button><Button variant="primary" onClick={next}>下一步</Button></div>
    </div>,

    <div key="s7">
      <Textarea rows={5} value={payload.additionalNotes} onChange={e => setPayload(x => ({ ...x, additionalNotes: e.target.value }))} placeholder="补充你的偏好，例如：希望突出项目结果、强调分布式/微服务经验、适合校招场景等。" className="rounded-2xl border-white/20 bg-white/5 text-white placeholder:text-white/40" />
      <div className="mt-4 flex gap-3"><Button variant="ghost" onClick={back}>上一步</Button><Button variant="primary" onClick={() => void generate()}>生成 AI 初稿</Button></div>
    </div>,
  ][step];

  return (
    <div className="relative mx-auto max-w-[1320px] pb-8">
      <div className="pointer-events-none max-w-full absolute left-1/2 top-[-200px] h-[500px] w-[860px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(56,189,248,0.34)_0%,rgba(99,102,241,0.2)_34%,transparent_72%)] blur-2xl" />
      <div className="relative overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.04] p-6 shadow-[0_30px_120px_rgba(2,6,23,0.9)] backdrop-blur-[14px] sm:p-10">
        <div className="mb-8 flex items-center justify-between">
          <button type="button" onClick={() => navigate('/resume-builder')} className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm text-white/85"><ArrowLeft className="h-4 w-4" />返回</button>
          <div className="rounded-full border border-white/20 bg-white/8 px-4 py-2 text-xs tracking-[0.2em] text-white/80">AI WIZARD</div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="rounded-3xl border border-white/15 bg-white/[0.05] p-6">
            <h1 className="text-[clamp(2rem,4.6vw,3.4rem)] leading-[0.98] tracking-[-0.04em] text-white [font-family:'Playfair_Display','Times_New_Roman',serif]">Build Your<br /><span className="ai-gradient-text ai-gradient-text-animate italic">AI Resume Profile</span></h1>
            <p className="mt-3 text-sm text-white/65">7 步完成信息采集，自动生成可直接编辑的简历初稿。</p>
            <div className="mt-5 rounded-2xl border border-white/14 bg-black/25 p-5"><div className="mb-3 text-xs tracking-[0.2em] text-white/55">{STEPS[step]}</div>{panel}</div>
          </div>
          <aside className="rounded-3xl border border-white/15 bg-white/[0.05] p-5">
            <div className="flex items-center justify-between"><div><div className="text-xs tracking-[0.2em] text-white/55">Progress</div><div className="mt-2 text-3xl font-semibold text-white">{step + 1}/{STEPS.length}</div></div><div className="flex h-11 w-11 items-center justify-center rounded-full border border-cyan-300/35 bg-cyan-300/12 text-cyan-200"><Sparkles className="h-5 w-5" /></div></div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/15"><div className="h-full rounded-full bg-[linear-gradient(90deg,#38bdf8,#4f46e5)]" style={{ width: `${done}%` }} /></div>
            <div className="mt-5 space-y-2">{STEPS.map((t, i) => <div key={t} className={`rounded-xl border px-3 py-2 text-sm ${i === step ? 'border-cyan-300/35 bg-cyan-300/10 text-white' : 'border-white/12 bg-white/5 text-white/75'}`}>{i + 1}. {t}</div>)}</div>
          </aside>
        </div>

        {loading ? <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#020617]/72 backdrop-blur-sm"><div className="w-full max-w-[520px] rounded-3xl border border-white/15 bg-white/[0.08] p-6 text-white"><div className="flex items-start gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/10"><LoaderCircle className="h-5 w-5 animate-spin" /></div><div><h3 className="text-lg font-semibold">AI 正在生成初稿</h3><p className="mt-1 text-sm text-white/70">正在结合你的信息与历史草稿构建简历内容，请稍候...</p></div></div><div className="mt-5 h-2 overflow-hidden rounded-full bg-white/18"><div className="h-full rounded-full bg-[linear-gradient(90deg,#38bdf8,#4f46e5)]" style={{ width: `${progress}%` }} /></div></div></div> : null}
      </div>
    </div>
  );
}
