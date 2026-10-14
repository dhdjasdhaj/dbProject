import type { ResumeTemplateId } from '../data/resumeTemplates';

const STORAGE_PREFIX = 'resume-builder-draft:';

export interface ResumeBuilderDraftPayload {
  templateId: ResumeTemplateId;
  updatedAt: string;
  sections: Record<string, string>;
  avatarDataUrl?: string;
  aiMeta?: {
    identity?: string;
    major?: string;
    educationInfo?: string;
    jobTargets?: string[];
    educationTags?: string[];
    internshipTags?: string[];
    certificateTags?: string[];
    additionalNotes?: string;
  };
}

export interface ResumeBuilderDraftSnapshot {
  templateId: ResumeTemplateId;
  updatedAt: string;
  sections: Record<string, string>;
  aiMeta?: ResumeBuilderDraftPayload['aiMeta'];
}

function storageKey(templateId: string) {
  return `${STORAGE_PREFIX}${templateId}`;
}

export function loadResumeBuilderDraft(templateId: string): ResumeBuilderDraftPayload | null {
  try {
    const raw = localStorage.getItem(storageKey(templateId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ResumeBuilderDraftPayload;
    if (!parsed || typeof parsed !== 'object') return null;
    if (parsed.templateId !== templateId) return null;
    if (!parsed.sections || typeof parsed.sections !== 'object') return null;
    return parsed;
  } catch {
    return null;
  }
}

export function loadAllResumeBuilderDrafts(): ResumeBuilderDraftSnapshot[] {
  try {
    const snapshots: ResumeBuilderDraftSnapshot[] = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith(STORAGE_PREFIX)) continue;
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw) as ResumeBuilderDraftPayload;
      if (!parsed || typeof parsed !== 'object' || !parsed.templateId || !parsed.sections || typeof parsed.sections !== 'object') continue;
      snapshots.push({
        templateId: parsed.templateId,
        updatedAt: parsed.updatedAt,
        sections: parsed.sections,
        aiMeta: parsed.aiMeta,
      });
    }
    return snapshots.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
  } catch {
    return [];
  }
}

export function saveResumeBuilderDraft(payload: ResumeBuilderDraftPayload) {
  localStorage.setItem(storageKey(payload.templateId), JSON.stringify(payload));
}

export function clearResumeBuilderDraft(templateId: string) {
  localStorage.removeItem(storageKey(templateId));
}
