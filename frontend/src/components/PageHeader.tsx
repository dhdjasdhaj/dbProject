import type { ReactNode } from 'react';

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
};

export function PageHeader({ eyebrow, title, description, actions }: PageHeaderProps) {
  return (
    <header className="mb-8 flex flex-col gap-5 border-b border-[color:var(--color-app-border)] pb-5 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0">
        {eyebrow ? <div className="mb-2 text-[11px] uppercase tracking-[0.22em] text-[color:var(--color-app-text-tertiary)]">{eyebrow}</div> : null}
        <h1 className="text-[28px] font-semibold tracking-[-0.03em] text-[color:var(--color-app-text)]">{title}</h1>
        {description ? <p className="mt-2 max-w-2xl text-[14px] leading-7 text-[color:var(--color-app-text-secondary)]">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-3">{actions}</div> : null}
    </header>
  );
}
