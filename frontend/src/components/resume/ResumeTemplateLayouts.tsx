import { type ReactNode, useEffect, useRef } from 'react';

const profileKeys = ['姓名', '手机', '邮箱', '求职意向', '现居城市'] as const;
export type Profile = Record<(typeof profileKeys)[number], string>;
export type ResumeLayoutProps = {
  sections: Record<string, string>;
  avatarDataUrl: string | null;
  onChange: (key: string, value: string) => void;
  onAvatarPick: () => void;
};

type EditableProps = { value: string; onChange: (value: string) => void; placeholder: string; className: string };
type AvatarProps = { avatarDataUrl: string | null; onClick: () => void; className: string; labelClassName?: string; tone?: 'light' | 'dark' };
type ProfileFieldProps = { label?: string; value: string; placeholder: string; onChange: (value: string) => void; className: string };

export function parseProfile(profile: string): Profile {
  const map = Object.fromEntries(
    profile
      .split('\n')
      .map(line => {
        const [k, ...rest] = line.split(/[：:]/);
        return [k?.trim() || '', rest.join('：').trim()];
      })
      .filter(([k]) => k),
  ) as Record<string, string>;

  return {
    姓名: map['姓名'] || '你的名字',
    手机: map['手机'] || '',
    邮箱: map['邮箱'] || '',
    求职意向: map['求职意向'] || '',
    现居城市: map['现居城市'] || '',
  };
}

export function buildProfile(profile: Profile) {
  return profileKeys.map(key => `${key}：${profile[key]}`).join('\n');
}

export function Editable({ value, onChange, placeholder, className }: EditableProps) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (ref.current && ref.current.innerText !== value) {
      ref.current.innerText = value;
    }
  }, [value]);

  return (
    <div
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      spellCheck={false}
      data-placeholder={placeholder}
      onInput={e => onChange((e.currentTarget as HTMLDivElement).innerText.replace(/\u00A0/g, ' '))}
      className={`${className} whitespace-pre-wrap outline-none empty:before:pointer-events-none empty:before:text-slate-400/85 empty:before:content-[attr(data-placeholder)]`}
    />
  );
}

export function ProfileField({ label, value, placeholder, onChange, className }: ProfileFieldProps) {
  return (
    <div className={className}>
      {label ? <span className="mr-1 text-inherit">{label}</span> : null}
      <Editable
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="inline-block min-w-[72px] align-middle text-inherit empty:before:text-inherit/45"
      />
    </div>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <div className="mb-2 mt-5 border-b border-slate-300 pb-1.5 text-[12px] font-bold tracking-[0.18em] text-slate-700">
      {children}
    </div>
  );
}

export function AvatarSlot({ avatarDataUrl, onClick, className, labelClassName, tone = 'light' }: AvatarProps) {
  const toneClasses = tone === 'dark' ? 'border-white/30 bg-slate-950 text-white/70' : 'border-slate-300 bg-white text-slate-400';
  return (
    <button type="button" onClick={onClick} className={`${className} overflow-hidden border text-[12px] ${toneClasses}`}>
      {avatarDataUrl ? (
        <img src={avatarDataUrl} alt="简历头像" className="h-full w-full object-cover" />
      ) : (
        <span className={labelClassName ?? ''}>上传头像</span>
      )}
    </button>
  );
}

function renderBulletBlock(value: string, onChange: (value: string) => void, placeholder: string, minHeight: string) {
  return (
    <Editable
      value={value || ''}
      onChange={onChange}
      placeholder={placeholder}
      className={`text-[14px] leading-7 text-slate-800 ${minHeight}`}
    />
  );
}

export function TechnicalResumeLayout({ sections, avatarDataUrl, onChange, onAvatarPick }: ResumeLayoutProps) {
  const p = parseProfile(sections.profile ?? '');

  return (
    <div className="mx-auto max-w-[1020px] rounded-[16px] bg-[linear-gradient(180deg,#ffffff_0%,#fdfefe_100%)] px-10 py-8 shadow-[0_24px_90px_rgba(15,23,42,0.14)] ring-1 ring-slate-300">
      <div className="mb-4 inline-flex items-center rounded-full border border-slate-300 bg-slate-50 px-3 py-1 text-[10px] font-semibold tracking-[0.24em] text-slate-500">TECHNICAL RESUME</div>
      <div className="grid grid-cols-[1fr_110px] gap-6 border-b border-slate-300 pb-5">
        <div>
          <div className="text-center">
            <Editable
              value={p.姓名}
              onChange={v => onChange('profile', buildProfile({ ...p, 姓名: v }))}
              placeholder="姓名"
              className="text-[36px] font-bold tracking-[0.1em] text-slate-950 [font-family:'Noto_Serif_SC','Songti_SC','Times_New_Roman',serif]"
            />
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[14px] text-slate-700">
            <ProfileField label="手机" value={p.手机} placeholder="请输入手机" onChange={v => onChange('profile', buildProfile({ ...p, 手机: v }))} className="inline-flex items-center before:mr-3 before:content-['•']" />
            <ProfileField label="邮箱" value={p.邮箱} placeholder="请输入邮箱" onChange={v => onChange('profile', buildProfile({ ...p, 邮箱: v }))} className="inline-flex items-center before:mr-3 before:content-['•']" />
            <ProfileField label="城市" value={p.现居城市} placeholder="请输入城市" onChange={v => onChange('profile', buildProfile({ ...p, 现居城市: v }))} className="inline-flex items-center before:mr-3 before:content-['•']" />
            <ProfileField label="求职意向" value={p.求职意向} placeholder="请输入方向" onChange={v => onChange('profile', buildProfile({ ...p, 求职意向: v }))} className="inline-flex items-center before:mr-3 before:content-['•']" />
          </div>
        </div>
        <AvatarSlot avatarDataUrl={avatarDataUrl} onClick={onAvatarPick} className="mt-1 flex h-[132px] w-[100px] items-center justify-center justify-self-end rounded-[4px]" />
      </div>

      <SectionTitle>教育经历</SectionTitle>
      {renderBulletBlock(sections.education ?? '', v => onChange('education', v), '学校 · 专业 · 学历 · 时间\n核心课程 / 荣誉 / 校园经历', 'min-h-[130px]')}

      <SectionTitle>工作经历</SectionTitle>
      {renderBulletBlock(sections.experience ?? '', v => onChange('experience', v), '公司 / 职位 / 时间\n- 负责模块\n- 关键动作\n- 结果量化', 'min-h-[220px]')}

      <SectionTitle>项目经历</SectionTitle>
      {renderBulletBlock(sections.projects ?? '', v => onChange('projects', v), '项目名称 / 角色 / 时间\n- 项目目标\n- 个人职责\n- 技术方案\n- 项目成果', 'min-h-[220px]')}

      <SectionTitle>个人总结</SectionTitle>
      {renderBulletBlock(sections.summary ?? '', v => onChange('summary', v), '概括你的岗位匹配度、专业背景与实践亮点', 'min-h-[150px]')}

      <SectionTitle>技能与其他</SectionTitle>
      {renderBulletBlock(sections.skills ?? '', v => onChange('skills', v), '技能栈 / 证书 / 实践关键词 / 其他补充信息', 'min-h-[120px]')}
    </div>
  );
}

export function MinimalResumeLayout(props: ResumeLayoutProps) {
  return <TechnicalResumeLayout {...props} />;
}
