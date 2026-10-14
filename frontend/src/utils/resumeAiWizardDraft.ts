export interface ResumeAiWizardPayload {
  identity: string;
  major: string;
  educationInfo: string;
  jobTargets: string[];
  educationTags: string[];
  internshipTags: string[];
  certificateTags: string[];
  additionalNotes: string;
}

const STORAGE_KEY = 'resume-ai-wizard';

export function loadResumeAiWizardDraft(): ResumeAiWizardPayload | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ResumeAiWizardPayload;
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveResumeAiWizardDraft(payload: ResumeAiWizardPayload) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

export function clearResumeAiWizardDraft() {
  localStorage.removeItem(STORAGE_KEY);
}
