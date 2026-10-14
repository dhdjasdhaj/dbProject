import type { ButtonHTMLAttributes, ReactNode } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
};

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'border border-[color:var(--color-app-accent)] bg-[color:var(--color-app-accent)] text-white hover:border-[color:var(--color-app-accent-strong)] hover:bg-[color:var(--color-app-accent-strong)] active:bg-[color:var(--color-app-accent)]/90',
  secondary:
    'border border-[color:var(--color-app-border)] bg-[color:var(--color-app-surface-2)] text-[color:var(--color-app-text)] hover:border-[color:var(--color-app-border-strong)] hover:bg-[color:var(--color-app-surface-hover)]',
  ghost:
    'border border-transparent bg-transparent text-[color:var(--color-app-text-secondary)] hover:bg-white/[0.05] hover:text-[color:var(--color-app-text)]',
  danger:
    'border border-[color:var(--color-app-border)] bg-[color:var(--color-app-surface-2)] text-[color:var(--color-app-danger)] hover:border-[color:var(--color-app-danger)]/50 hover:bg-[color:var(--color-app-danger)]/10',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-8 gap-2 px-3 text-[12px]',
  md: 'h-10 gap-2.5 px-4 text-[13px]',
};

export function Button({ variant = 'secondary', size = 'md', icon, className = '', children, ...props }: ButtonProps) {
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center rounded-[10px] font-medium tracking-[0.01em] transition duration-200 ease-in-out disabled:pointer-events-none disabled:opacity-40 ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
    >
      {icon ? <span className="flex h-4 w-4 items-center justify-center">{icon}</span> : null}
      {children}
    </button>
  );
}
