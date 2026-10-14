import type { HTMLAttributes, ReactNode } from 'react';

type CardProps = HTMLAttributes<HTMLDivElement> & {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
};

export function Card({ title, description, actions, className = '', children, ...props }: CardProps) {
  return (
    <section
      {...props}
      className={`surface-hairline rounded-[14px] border border-[color:var(--color-app-border)] bg-[color:var(--color-app-surface)] shadow-[var(--shadow-panel)] ${className}`}
    >
      {(title || description || actions) && (
        <div className="flex items-start justify-between gap-4 border-b border-[color:var(--color-app-border)] px-5 py-4">
          <div className="min-w-0">
            {title ? <h2 className="text-[15px] font-medium text-[color:var(--color-app-text)]">{title}</h2> : null}
            {description ? <p className="mt-1 text-[13px] leading-6 text-[color:var(--color-app-text-secondary)]">{description}</p> : null}
          </div>
          {actions ? <div className="shrink-0">{actions}</div> : null}
        </div>
      )}
      <div className="px-5 py-5">{children}</div>
    </section>
  );
}
