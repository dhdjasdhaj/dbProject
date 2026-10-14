import type { ResumeBuilderDraftPayload } from './resumeBuilderDraft';

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttr(value: string) {
  return escapeHtml(value).replace(/`/g, '&#96;');
}

function parseProfile(profile: string) {
  const map = Object.fromEntries(
    (profile || '')
      .split('\n')
      .map(line => {
        const [key, ...rest] = line.split(/[：:]/);
        return [key?.trim() || '', rest.join('：').trim()];
      })
      .filter(([key]) => key),
  ) as Record<string, string>;

  return {
    name: map['姓名'] || '',
    phone: map['手机'] || '',
    email: map['邮箱'] || '',
    intent: map['求职意向'] || '',
    city: map['现居城市'] || '',
  };
}

function sectionBlock(title: string, content: string) {
  const html = escapeHtml(content || '').replace(/\n/g, '<br />');
  return `
    <section style="margin-top:20px;">
      <div style="font-size:16px;font-weight:700;border-bottom:1px solid #111827;padding-bottom:6px;margin-bottom:10px;">${title}</div>
      <div style="font-size:14px;line-height:1.9;color:#1f2937;white-space:normal;">${html || '—'}</div>
    </section>
  `;
}

function headerBlock(draft: ResumeBuilderDraftPayload) {
  const profile = parseProfile(draft.sections.profile ?? '');
  const avatar = draft.avatarDataUrl?.startsWith('data:image/')
    ? `<img src="${escapeAttr(draft.avatarDataUrl)}" alt="简历头像" style="width:96px;height:126px;object-fit:cover;border:1px solid #d1d5db;border-radius:4px;" />`
    : `<div style="width:96px;height:126px;border:1px solid #d1d5db;border-radius:4px;display:flex;align-items:center;justify-content:center;color:#9ca3af;font-size:12px;">未上传头像</div>`;

  return `
    <header style="display:flex;justify-content:space-between;gap:16px;padding-bottom:14px;border-bottom:1px solid #e5e7eb;">
      <div style="flex:1;">
        <div style="font-size:30px;font-weight:700;line-height:1.2;color:#111827;">${escapeHtml(profile.name || '你的名字')}</div>
        <div style="margin-top:8px;font-size:14px;line-height:1.8;color:#374151;">
          <div>手机：${escapeHtml(profile.phone || '—')}</div>
          <div>邮箱：${escapeHtml(profile.email || '—')}</div>
          <div>求职意向：${escapeHtml(profile.intent || '—')}</div>
          <div>现居城市：${escapeHtml(profile.city || '—')}</div>
        </div>
      </div>
      ${avatar}
    </header>
  `;
}

function buildHtml(title: string, draft: ResumeBuilderDraftPayload) {
  return `
    <!DOCTYPE html>
    <html lang="zh-CN">
      <head>
        <meta charset="UTF-8" />
        <title>${escapeHtml(title)}</title>
      </head>
      <body style="margin:0;background:#f3f4f6;font-family:'Microsoft YaHei','PingFang SC',sans-serif;">
        <main style="max-width:840px;margin:24px auto;background:#fff;padding:36px 42px;color:#111827;box-shadow:0 10px 30px rgba(15,23,42,.08);">
          ${headerBlock(draft)}
          ${sectionBlock('个人简介', draft.sections.summary ?? '')}
          ${sectionBlock('教育背景', draft.sections.education ?? '')}
          ${sectionBlock('项目经历', draft.sections.projects ?? '')}
          ${sectionBlock('工作经历', draft.sections.experience ?? '')}
          ${sectionBlock('技能与其他', draft.sections.skills ?? '')}
        </main>
      </body>
    </html>
  `;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export function exportResumeAsWord(title: string, draft: ResumeBuilderDraftPayload) {
  const html = buildHtml(title, draft);
  const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
  downloadBlob(blob, `${title}.doc`);
}

export function exportResumeAsPdf(title: string, draft: ResumeBuilderDraftPayload) {
  const html = buildHtml(title, draft);
  const printWindow = window.open('', '_blank', 'width=960,height=720');
  if (!printWindow) return false;
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  printWindow.onload = () => {
    printWindow.print();
  };
  return true;
}
