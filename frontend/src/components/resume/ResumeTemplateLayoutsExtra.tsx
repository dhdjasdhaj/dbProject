import { AvatarSlot, Editable, ProfileField, SectionTitle, buildProfile, parseProfile, type ResumeLayoutProps } from './ResumeTemplateLayouts';

export function CreativeResumeLayout({ sections, avatarDataUrl, onChange, onAvatarPick }: ResumeLayoutProps) {
  const p = parseProfile(sections.profile ?? '');
  const chips = (sections.skills ?? '').split('\n').map(v => v.trim()).filter(Boolean);

  return (
    <div className="mx-auto max-w-[1020px] overflow-hidden rounded-[24px] bg-white shadow-[0_24px_90px_rgba(15,23,42,0.16)] ring-1 ring-slate-200 lg:grid lg:grid-cols-[250px_1fr]">
      <aside className="bg-[linear-gradient(180deg,#0f172a_0%,#111827_60%,#0f172a_100%)] px-6 py-7 text-white">
        <Editable value={p.姓名} onChange={v => onChange('profile', buildProfile({ ...p, 姓名: v }))} placeholder="姓名" className="text-[28px] font-bold tracking-[0.05em]" />
        <div className="mt-2">
          <ProfileField value={p.求职意向} placeholder="请输入求职方向" onChange={v => onChange('profile', buildProfile({ ...p, 求职意向: v }))} className="text-[14px] text-slate-300" />
        </div>
        <div className="mt-5">
          <AvatarSlot avatarDataUrl={avatarDataUrl} onClick={onAvatarPick} tone="dark" className="flex h-[128px] w-[96px] items-center justify-center rounded-[4px]" labelClassName="text-white/60" />
        </div>
        <div className="mt-5 space-y-2 text-[13px] leading-6 text-slate-200">
          <ProfileField label="手机：" value={p.手机} placeholder="请输入手机" onChange={v => onChange('profile', buildProfile({ ...p, 手机: v }))} className="inline-flex items-center" />
          <ProfileField label="邮箱：" value={p.邮箱} placeholder="请输入邮箱" onChange={v => onChange('profile', buildProfile({ ...p, 邮箱: v }))} className="inline-flex items-center" />
          <ProfileField label="城市：" value={p.现居城市} placeholder="请输入城市" onChange={v => onChange('profile', buildProfile({ ...p, 现居城市: v }))} className="inline-flex items-center" />
        </div>
        <div className="mt-6 border-t border-white/20 pt-4">
          <div className="text-[12px] font-bold tracking-[0.22em] text-white/70">技能标签</div>
          <div className="mt-3 flex flex-wrap gap-2">
            {(chips.length ? chips : ['沟通表达', '项目推动', '用户洞察']).slice(0, 8).map(v => (
              <span key={v} className="rounded-full border border-white/20 px-3 py-1 text-[12px] text-white/85">{v}</span>
            ))}
          </div>
        </div>
      </aside>
      <div className="px-8 py-7 text-slate-900">
        <SectionTitle>个人简介</SectionTitle>
        <Editable value={sections.summary ?? ''} onChange={v => onChange('summary', v)} placeholder="用更有表达力的方式介绍自己" className="min-h-[88px] text-[14px] leading-7 text-slate-800" />
        <SectionTitle>项目经历</SectionTitle>
        <Editable value={sections.projects ?? ''} onChange={v => onChange('projects', v)} placeholder="项目名 · 角色 · 时间\n- 目标\n- 动作\n- 结果" className="min-h-[170px] text-[14px] leading-7 text-slate-800" />
        <SectionTitle>工作经历</SectionTitle>
        <Editable value={sections.experience ?? ''} onChange={v => onChange('experience', v)} placeholder="团队 / 岗位 / 时间\n- 推动事项\n- 成果复盘" className="min-h-[150px] text-[14px] leading-7 text-slate-800" />
        <SectionTitle>教育背景</SectionTitle>
        <Editable value={sections.education ?? ''} onChange={v => onChange('education', v)} placeholder="学校 · 专业 · 学历 · 时间" className="min-h-[88px] text-[14px] leading-7 text-slate-800" />
      </div>
    </div>
  );
}

export function ManagementResumeLayout({ sections, avatarDataUrl, onChange, onAvatarPick }: ResumeLayoutProps) {
  const p = parseProfile(sections.profile ?? '');

  return (
    <div className="mx-auto max-w-[1020px] rounded-[14px] bg-[linear-gradient(180deg,#ffffff_0%,#fcfdfd_100%)] px-8 py-7 shadow-[0_26px_95px_rgba(15,23,42,0.15)] ring-1 ring-slate-300">
      <div className="grid gap-6 border-b border-slate-300 pb-4 lg:grid-cols-[1fr_100px]">
        <div>
          <div className="inline-flex items-center text-[12px] font-semibold tracking-[0.2em] text-slate-500">
            <span className="mr-1">求职意向：</span>
            <ProfileField value={p.求职意向} placeholder="请输入方向" onChange={v => onChange('profile', buildProfile({ ...p, 求职意向: v }))} className="inline-flex items-center" />
          </div>
          <Editable value={p.姓名} onChange={v => onChange('profile', buildProfile({ ...p, 姓名: v }))} placeholder="姓名" className="mt-2 text-[32px] font-bold text-slate-950" />
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[14px] leading-7 text-slate-700">
            <ProfileField label="电话：" value={p.手机} placeholder="请输入手机" onChange={v => onChange('profile', buildProfile({ ...p, 手机: v }))} className="inline-flex items-center" />
            <ProfileField label="邮箱：" value={p.邮箱} placeholder="请输入邮箱" onChange={v => onChange('profile', buildProfile({ ...p, 邮箱: v }))} className="inline-flex items-center" />
            <ProfileField label="城市：" value={p.现居城市} placeholder="请输入城市" onChange={v => onChange('profile', buildProfile({ ...p, 现居城市: v }))} className="inline-flex items-center" />
          </div>
        </div>
        <AvatarSlot avatarDataUrl={avatarDataUrl} onClick={onAvatarPick} className="flex h-[126px] w-[96px] items-center justify-center justify-self-end rounded-[4px]" />
      </div>
      <SectionTitle>个人概述</SectionTitle>
      <Editable value={sections.summary ?? ''} onChange={v => onChange('summary', v)} placeholder="概述管理经验、团队规模、业务结果与协同能力" className="min-h-[88px] text-[14px] leading-7 text-slate-800" />
      <SectionTitle>工作经历</SectionTitle>
      <Editable value={sections.experience ?? ''} onChange={v => onChange('experience', v)} placeholder="事业部 / 职位 / 时间\n- 负责业务\n- 团队规模\n- 关键指标" className="min-h-[170px] text-[14px] leading-7 text-slate-800" />
      <SectionTitle>项目 / 专项经历</SectionTitle>
      <Editable value={sections.projects ?? ''} onChange={v => onChange('projects', v)} placeholder="专项名称\n- 痛点\n- 方案\n- 结果" className="min-h-[150px] text-[14px] leading-7 text-slate-800" />
      <div className="grid gap-8 lg:grid-cols-2">
        <div>
          <SectionTitle>教育背景</SectionTitle>
          <Editable value={sections.education ?? ''} onChange={v => onChange('education', v)} placeholder="学校 · 专业 · 学历 · 时间" className="min-h-[88px] text-[14px] leading-7 text-slate-800" />
        </div>
        <div>
          <SectionTitle>能力标签</SectionTitle>
          <Editable value={sections.skills ?? ''} onChange={v => onChange('skills', v)} placeholder="组织管理 / 项目推进 / 跨部门协作 / 预算与复盘" className="min-h-[96px] text-[14px] leading-7 text-slate-800" />
        </div>
      </div>
    </div>
  );
}
