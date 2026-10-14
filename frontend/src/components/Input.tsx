import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react';

export function Input({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`h-10 w-full rounded-[10px] border border-[color:var(--color-app-border)] bg-[color:var(--color-app-surface-2)] px-3.5 text-[13px] text-[color:var(--color-app-text)] placeholder:text-[color:var(--color-app-text-tertiary)] hover:border-[color:var(--color-app-border-strong)] focus:border-[color:var(--color-app-accent)] ${className}`}
    />
  );
}

export function Textarea({ className = '', ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`w-full rounded-[12px] border border-[color:var(--color-app-border)] bg-[color:var(--color-app-surface-2)] px-3.5 py-3 text-[13px] leading-6 text-[color:var(--color-app-text)] placeholder:text-[color:var(--color-app-text-tertiary)] hover:border-[color:var(--color-app-border-strong)] focus:border-[color:var(--color-app-accent)] ${className}`}
    />
  );
}
