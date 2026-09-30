import * as React from 'react';
import { cn } from './cn';

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className, ...p }, ref) => (
  <input
    ref={ref}
    className={cn(
      'h-11 w-full rounded-input border border-border bg-surface px-3 text-sm text-text placeholder:text-muted/70 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 disabled:opacity-50',
      className,
    )}
    {...p}
  />
));
Input.displayName = 'Input';

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(({ className, ...p }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      'min-h-[96px] w-full rounded-input border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-muted/70 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20',
      className,
    )}
    {...p}
  />
));
Textarea.displayName = 'Textarea';

export function Label({ className, ...p }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn('mb-1.5 block text-sm font-medium text-text', className)} {...p} />;
}

export const NativeSelect = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(({ className, children, ...p }, ref) => (
  <select
    ref={ref}
    className={cn('h-11 w-full rounded-input border border-border bg-surface px-3 text-sm text-text focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20', className)}
    {...p}
  >
    {children}
  </select>
));
NativeSelect.displayName = 'NativeSelect';

export function Field({ label, hint, error, children, className, htmlFor }: { label: string; hint?: string; error?: string | null; children: React.ReactNode; className?: string; htmlFor?: string }) {
  return (
    <div className={className}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error ? <p className="mt-1 text-xs font-medium text-danger">{error}</p> : hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}
