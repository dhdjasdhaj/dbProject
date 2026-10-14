import type { ResumeTemplateId } from '../data/resumeTemplates';
import type { ResumeBuilderDraftPayload } from './resumeBuilderDraft';
import type { ResumeAiWizardPayload } from './resumeAiWizardDraft';

function joinValues(values: string[] | undefined, fallback: string) {
  return values && values.length > 0 ? values.join('、') : fallback;
}

function pickSkillLikeTags(wizard: ResumeAiWizardPayload) {
  return wizard.internshipTags.length > 0 ? wizard.internshipTags : wizard.educationTags;
}

function identitySummary(identity: string, major: string, jobTargets: string[]) {
  const targetText = joinValues(jobTargets, '目标岗位');
  switch (identity) {
    case '在校生':
      return `我目前是一名${major || '相关专业'}在校生，正在围绕「${targetText}」方向准备求职，希望突出课程基础、校园实践和快速学习能力。`;
    case '应届生':
      return `我是一名${major || '相关专业'}应届生，当前重点投递「${targetText}」相关岗位，希望在简历中体现专业背景、项目经历与岗位匹配度。`;
    case '职场人':
      return `我目前已有职场经验，核心求职方向为「${targetText}」，希望简历重点体现过往经历、能力亮点和实际交付结果。`;
    default:
      return `当前求职方向为「${targetText}」，希望整理成一份结构清晰、重点明确的简历。`;
  }
}

function buildEducationText(wizard: ResumeAiWizardPayload) {
  const educationTags = joinValues(wizard.educationTags, '校园经历、竞赛成果、奖学金等');
  const targetText = joinValues(wizard.jobTargets, '目标岗位');
  return [
    wizard.educationInfo || `某大学 · ${wizard.major || '相关专业'} · ${wizard.identity === '职场人' ? '本科/硕士' : '本科'} · 20XX.09-20XX.06`,
    `教育背景亮点：${educationTags}`,
    `专业方向：${wizard.major || '待补充'}，与「${targetText}」岗位方向相关。`,
  ].join('\n');
}

function buildProjectText(wizard: ResumeAiWizardPayload) {
  const targetText = joinValues(wizard.jobTargets, '目标岗位');
  const skillsText = joinValues(pickSkillLikeTags(wizard), '沟通协作、学习能力、执行力');
  return [
    `求职相关项目 · ${targetText} · 20XX.03-20XX.06`,
    `- 项目背景：围绕「${targetText}」方向，结合「${wizard.major || '专业背景'}」完成项目实践。`,
    `- 能力体现：项目过程中重点体现了${skillsText}。`,
    '- 项目结果：建议继续补充量化成果，例如完成效率、成果转化或活动效果。',
  ].join('\n');
}

function buildExperienceText(wizard: ResumeAiWizardPayload) {
  const title = wizard.identity === '职场人' ? '工作经历' : '实习 / 校园经历';
  const targetText = joinValues(wizard.jobTargets, '目标岗位');
  const skillText = joinValues(pickSkillLikeTags(wizard), '沟通协作、逻辑思维、执行能力');
  return [
    `${title} · ${targetText} · 20XX.06-20XX.09`,
    `- 岗位匹配：本段经历主要围绕「${targetText}」方向进行整理。`,
    `- 个人亮点：在经历中重点体现${skillText}。`,
    wizard.additionalNotes ? `- 补充说明：${wizard.additionalNotes}` : '- 可继续补充最能体现成果的真实经历。',
  ].join('\n');
}

function buildSkillsText(wizard: ResumeAiWizardPayload) {
  return [
    `求职意向：${joinValues(wizard.jobTargets, '待补充')}`,
    `专业背景：${wizard.major || '待补充'}`,
    `经历关键词：${joinValues(pickSkillLikeTags(wizard), '待补充')}`,
    `资格证书：${joinValues(wizard.certificateTags, '待补充')}`,
  ].join('\n');
}

export function buildResumeDraftFromAiWizard(
  templateId: ResumeTemplateId,
  wizard: ResumeAiWizardPayload
): ResumeBuilderDraftPayload {
  const targetText = joinValues(wizard.jobTargets, '待补充');
  const educationText = joinValues(wizard.educationTags, '待补充');
  const skillText = joinValues(pickSkillLikeTags(wizard), '待补充');
  const certificateText = joinValues(wizard.certificateTags, '待补充');

  const profile = [
    '姓名：你的名字',
    '手机：13800000000',
    '邮箱：your@email.com',
    `求职意向：${targetText}`,
    '现居城市：待补充',
  ].join('\n');

  const summary = [
    identitySummary(wizard.identity, wizard.major, wizard.jobTargets),
    `我的专业是「${wizard.major || '待补充'}」，当前意向岗位为「${targetText}」。`,
    `教育背景亮点包括：${educationText}。`,
    `经历关键词包括：${skillText}。`,
    `已获得证书：${certificateText}。`,
    wizard.additionalNotes ? `补充信息：${wizard.additionalNotes}` : '',
  ]
    .filter(Boolean)
    .join(' ');

  return {
    templateId,
    updatedAt: new Date().toISOString(),
    aiMeta: {
      identity: wizard.identity,
      major: wizard.major,
      educationInfo: wizard.educationInfo,
      jobTargets: wizard.jobTargets,
      educationTags: wizard.educationTags,
      internshipTags: wizard.internshipTags,
      certificateTags: wizard.certificateTags,
      additionalNotes: wizard.additionalNotes,
    },
    sections: {
      profile,
      summary,
      education: buildEducationText(wizard),
      projects: buildProjectText(wizard),
      experience: buildExperienceText(wizard),
      skills: buildSkillsText(wizard),
    },
  };
}
