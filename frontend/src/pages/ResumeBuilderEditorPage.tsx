import { useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ChevronDown, FileDown, ImagePlus, Sparkles, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { getErrorMessage } from '../api';
import { resumeApi } from '../api/resume';
import { Button } from '../components/Button';
import { MinimalResumeLayout, TechnicalResumeLayout, buildProfile } from '../components/resume/ResumeTemplateLayouts';
import { CreativeResumeLayout, ManagementResumeLayout } from '../components/resume/ResumeTemplateLayoutsExtra';
import { defaultSectionsMap, getResumeTemplateById, type ResumeTemplateId } from '../data/resumeTemplates';
import { clearResumeBuilderDraft, loadResumeBuilderDraft, saveResumeBuilderDraft, type ResumeBuilderDraftPayload } from '../utils/resumeBuilderDraft';
import { exportResumeAsPdf, exportResumeAsWord } from '../utils/resumeExport';

function fixProfile(profile: string, aiMeta: ResumeBuilderDraftPayload['aiMeta'] | null | undefined) {
  if (!profile) return profile;
  if (!profile.includes('|')) return profile;

  const parts = profile.split('|').map(v => v.trim());
  const map: Record<string, string> = {};
  parts.forEach(part => {
    if (part.includes('姓名')) map['姓名'] = part.split('：')[1];
    if (part.includes('联系方式') || part.includes('手机')) map['手机'] = part.split('：')[1];
    if (part.includes('邮箱')) map['邮箱'] = part.split('：')[1];
    if (part.includes('所在地')) map['现居城市'] = part.split('：')[1];
  });

  return buildProfile({
    姓名: map['姓名'] || '',
    手机: map['手机'] || '',
    邮箱: map['邮箱'] || '',
    求职意向: aiMeta?.jobTargets?.join('、') || '',
    现居城市: map['现居城市'] || '',
  });
}

function hydrateSectionsFromAiMeta(sections: Record<string, string>, aiMeta: ResumeBuilderDraftPayload['aiMeta'] | null | undefined) {
  const next = { ...sections };
  next.profile = fixProfile(next.profile, aiMeta);
  return next;
}

function toResumeText(sections: Record<string, string>) {
  const labels: Record<string, string> = {
    profile: '个人信息',
    summary: '个人简介',
    education: '教育经历',
    projects: '项目经历',
    experience: '实习/工作经历',
    skills: '技能证书',
  };

  return Object.entries(sections)
    .filter(([, value]) => Boolean(value && value.trim()))
    .map(([key, value]) => `${labels[key] || key}\n${value.trim()}`)
    .join('\n\n');
}

export default function ResumeBuilderEditorPage() {
  const { templateId: templateIdParam } = useParams<{ templateId: string }>();
  const navigate = useNavigate();
  const template = useMemo(() => (templateIdParam ? getResumeTemplateById(templateIdParam) : undefined), [templateIdParam]);

  const [sections, setSections] = useState<Record<string, string>>({});
  const [avatarDataUrl, setAvatarDataUrl] = useState<string | null>(null);
  const [aiMeta, setAiMeta] = useState<ResumeBuilderDraftPayload['aiMeta'] | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [savingToLibrary, setSavingToLibrary] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!template) return;
    const draft = loadResumeBuilderDraft(template.id) || loadResumeBuilderDraft('technical');
    const defaults = defaultSectionsMap(template);
    const mergedSections = draft?.sections ?? defaults;
    const fixed = hydrateSectionsFromAiMeta(mergedSections, draft?.aiMeta);
    setSections(fixed);
    setAvatarDataUrl(draft?.avatarDataUrl ?? null);
    setAiMeta(draft?.aiMeta ?? null);
    setHydrated(true);
  }, [template]);

  const onChange = (key: string, value: string) => {
    setSections(prev => {
      const next = { ...prev, [key]: value };
      if (template) {
        saveResumeBuilderDraft({
          templateId: template.id,
          updatedAt: new Date().toISOString(),
          sections: next,
          avatarDataUrl: avatarDataUrl ?? undefined,
          aiMeta: aiMeta ?? undefined,
        });
      }
      return next;
    });
  };

  const handleExport = (type: 'pdf' | 'word') => {
    if (!template) return;
    const payload: ResumeBuilderDraftPayload = { templateId: template.id, updatedAt: new Date().toISOString(), sections, avatarDataUrl: avatarDataUrl ?? undefined, aiMeta: aiMeta ?? undefined };
    setExportOpen(false);
    if (type === 'word') {
      exportResumeAsWord(`${template.name}-简历`, payload);
      toast.success('已导出 Word 文档');
      return;
    }
    const opened = exportResumeAsPdf(`${template.name}-简历`, payload);
    if (!opened) return toast.error('浏览器拦截了打印窗口，请允许弹窗后重试');
    toast.success('已打开 PDF 打印窗口');
  };

  const handleAvatarChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return toast.error('请选择图片文件');
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : null;
      setAvatarDataUrl(result);
      if (template) {
        saveResumeBuilderDraft({ templateId: template.id, updatedAt: new Date().toISOString(), sections, avatarDataUrl: result ?? undefined, aiMeta: aiMeta ?? undefined });
      }
      toast.success('头像已更新');
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const clearDraft = () => {
    if (!template) return;
    clearResumeBuilderDraft(template.id);
    setSections(defaultSectionsMap(template));
    setAvatarDataUrl(null);
    setAiMeta(null);
    setExportOpen(false);
    toast.success('已清除本模板草稿');
  };


  const handleSaveToLibraryAndAnalyze = async () => {
    if (!template) return;

    const resumeText = toResumeText(sections).trim();
    if (!resumeText) {
      toast.error('请先填写一些简历内容再保存');
      return;
    }

    const filename = `${template.name}-${new Date().toISOString().slice(0, 10)}.txt`;
    const file = new File([resumeText], filename, { type: 'text/plain;charset=utf-8' });

    try {
      setSavingToLibrary(true);
      const result = await resumeApi.uploadAndAnalyze(file);
      toast.success(result.duplicate ? '该简历已存在，已返回历史记录' : '已保存到简历库并开始分析');
      if (result.storage.resumeId) {
        navigate('/history', { state: { newResumeId: result.storage.resumeId } });
      }
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSavingToLibrary(false);
    }
  };

  if (!template) return <div>模板不存在</div>;
  if (!hydrated) return <div>加载中...</div>;

  const layoutProps = { sections, avatarDataUrl, onChange, onAvatarPick: () => fileInputRef.current?.click() };
  const layouts: Record<ResumeTemplateId, ReactNode> = {
    minimal: <MinimalResumeLayout {...layoutProps} />,
    technical: <TechnicalResumeLayout {...layoutProps} />,
    creative: <CreativeResumeLayout {...layoutProps} />,
    management: <ManagementResumeLayout {...layoutProps} />,
  };

  const sectionCount = Object.values(sections).filter(Boolean).length;

  return (
    <div className="relative mx-auto max-w-[1480px] px-4 pb-10 sm:px-8">
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />

      <div className="pointer-events-none max-w-full absolute left-1/2 top-[-190px] h-[420px] w-[880px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(56,189,248,0.30)_0%,rgba(99,102,241,0.2)_44%,transparent_72%)] blur-2xl" />

      <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="relative mb-7 overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.04] px-5 py-6 shadow-[0_26px_100px_rgba(2,6,23,0.72)] backdrop-blur-[16px] sm:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => navigate('/resume-builder/templates')}
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm text-white/85 transition hover:border-white/35 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={1.8} />
            返回模板
          </button>
          <div className="rounded-full border border-white/18 bg-white/7 px-4 py-2 text-xs uppercase tracking-[0.2em] text-white/75">Resume Workspace</div>
        </div>

        <h1 className="mt-5 text-[clamp(2rem,5vw,3.6rem)] leading-[0.96] tracking-[-0.04em] text-white [font-family:'Playfair_Display','Times_New_Roman',serif]">
          {template.name}
          <br />
          <span className="ai-gradient-text ai-gradient-text-animate italic">Live Editing Canvas</span>
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-white/66">在页面中间直接编辑简历正文。左侧是文档状态与导出操作，保存会自动写入当前模板草稿。</p>
      </motion.section>

      <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="space-y-4">
          <div className="rounded-[22px] border border-white/12 bg-white/[0.05] p-4 backdrop-blur-[20px]">
            <div className="rounded-2xl border border-white/14 bg-black/25 px-4 py-4">
              <div className="text-[0.8125rem] uppercase tracking-[0.16em] text-white/55">Template</div>
              <div className="mt-2 text-lg font-semibold text-white">{template.name}</div>
              <p className="mt-2 text-[0.8125rem] leading-6 text-white/66">{template.summary}</p>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-white/12 bg-white/[0.05] px-3 py-3">
                <div className="text-[0.8125rem] uppercase tracking-[0.14em] text-white/52">Sections</div>
                <div className="mt-2 text-2xl font-semibold text-white">{sectionCount}</div>
              </div>
              <div className="rounded-xl border border-white/12 bg-white/[0.05] px-3 py-3">
                <div className="text-[0.8125rem] uppercase tracking-[0.14em] text-white/52">Mode</div>
                <div className="mt-2 text-sm font-medium text-white">{aiMeta ? 'AI draft' : 'Manual draft'}</div>
              </div>
            </div>

            {aiMeta ? (
              <div className="mt-3 flex items-center gap-2 rounded-xl border border-cyan-300/35 bg-cyan-300/12 px-3 py-3 text-[0.8125rem] text-cyan-200">
                <Sparkles className="h-4 w-4" strokeWidth={1.8} />
                当前内容来自 AI 生成，可继续手动精修。
              </div>
            ) : null}
          </div>

          <div className="rounded-[22px] border border-white/12 bg-white/[0.05] p-4 backdrop-blur-[20px]">
            <div className="mb-3 text-[0.8125rem] uppercase tracking-[0.16em] text-white/55">Actions</div>
            <div className="space-y-3">
              <Button variant="secondary" className="w-full justify-start rounded-full border-white/18 bg-white/[0.05] text-white hover:bg-white/[0.1]" icon={<ImagePlus className="h-4 w-4" strokeWidth={1.8} />} onClick={() => fileInputRef.current?.click()}>上传/替换头像</Button>
              <div className="relative">
                <Button variant="secondary" className="w-full justify-between rounded-full border-white/18 bg-white/[0.05] text-white hover:bg-white/[0.1]" icon={<FileDown className="h-4 w-4" strokeWidth={1.8} />} onClick={() => setExportOpen(v => !v)}>
                  导出简历
                  <ChevronDown className={`h-4 w-4 transition ${exportOpen ? 'rotate-180' : ''}`} />
                </Button>
                {exportOpen ? (
                  <div className="absolute left-0 top-[calc(100%+8px)] z-20 w-full overflow-hidden rounded-[16px] border border-white/14 bg-[#0b1120]/95 shadow-[0_24px_80px_rgba(2,6,23,0.7)] backdrop-blur-xl">
                    <button type="button" onClick={() => handleExport('pdf')} className="block w-full px-4 py-3 text-left text-[0.8125rem] text-white/90 hover:bg-white/[0.08]">导出为 PDF</button>
                    <button type="button" onClick={() => handleExport('word')} className="block w-full border-t border-white/12 px-4 py-3 text-left text-[0.8125rem] text-white/90 hover:bg-white/[0.08]">导出为 Word</button>
                  </div>
                ) : null}
              </div>
              <Button variant="primary" className="w-full" onClick={() => void handleSaveToLibraryAndAnalyze()} disabled={savingToLibrary}>{savingToLibrary ? '保存中…' : '保存到简历库并分析'}</Button>
              <Button variant="ghost" className="w-full justify-start rounded-full text-white/80 hover:bg-white/[0.08] hover:text-white" icon={<Trash2 className="h-4 w-4" strokeWidth={1.8} />} onClick={clearDraft}>清空当前草稿</Button>
            </div>
          </div>
        </aside>

        <section className="rounded-[24px] border border-white/12 bg-white/[0.05] p-3 shadow-[0_20px_80px_rgba(2,6,23,0.62)] backdrop-blur-[20px] sm:p-4">
          <div className="mb-3 rounded-full border border-white/12 bg-white/[0.04] px-4 py-2 text-xs uppercase tracking-[0.2em] text-white/55">Live Canvas</div>
          <div className="overflow-auto rounded-[18px] border border-white/10 bg-[#0b1120] p-4 sm:p-6">
            {layouts[template.id]}
          </div>
        </section>
      </div>
    </div>
  );
}
