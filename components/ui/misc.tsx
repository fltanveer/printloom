import * as React from 'react';
import { cn } from './cn';

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton rounded-card', className)} aria-hidden />;
}

export function Progress({ value, className, tone }: { value: number; className?: string; tone?: string }) {
  return (
    <div className={cn('h-2 w-full overflow-hidden rounded-full bg-surface-2', className)} role="progressbar" aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(100, Math.max(0, value))}%`, background: tone ?? 'var(--accent)' }} />
    </div>
  );
}

export function Separator({ className }: { className?: string }) {
  return <div className={cn('h-px w-full bg-border', className)} />;
}

export function Kbd({ children }: { children: React.ReactNode }) {
  return <kbd className="rounded border border-border bg-surface-2 px-1.5 py-0.5 font-mono text-[11px] text-muted">{children}</kbd>;
}
