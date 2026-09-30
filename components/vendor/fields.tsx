'use client';
import * as React from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/components/ui/cn';
import type { Offering } from '@/lib/types';

export type Mutate = (fn: (o: Offering) => void) => void;

/** Number input that keeps a local text value so users can clear and retype. Empty commits `emptyValue`. */
export function NumInput({
  value,
  onChange,
  min,
  max,
  step,
  className,
  prefix,
  suffix,
  placeholder,
  allowEmpty,
  ...rest
}: {
  value: number | undefined | null;
  onChange: (v: number | undefined) => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
  prefix?: string;
  suffix?: string;
  placeholder?: string;
  allowEmpty?: boolean;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'prefix'>) {
  const [text, setText] = React.useState(value === undefined || value === null ? '' : String(value));
  React.useEffect(() => {
    const cur = text === '' ? undefined : Number(text);
    if (cur !== (value ?? undefined)) setText(value === undefined || value === null ? '' : String(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  const input = (
    <Input
      inputMode="decimal"
      type="number"
      value={text}
      min={min}
      max={max}
      step={step}
      placeholder={placeholder}
      onChange={(e) => {
        setText(e.target.value);
        if (e.target.value === '') onChange(allowEmpty ? undefined : 0);
        else if (!Number.isNaN(Number(e.target.value))) onChange(Number(e.target.value));
      }}
      className={cn('tabular-nums', prefix && 'pl-7', suffix && 'pr-9', className)}
      {...rest}
    />
  );
  if (!prefix && !suffix) return input;
  return (
    <div className="relative">
      {prefix ? <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted">{prefix}</span> : null}
      {input}
      {suffix ? <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted">{suffix}</span> : null}
    </div>
  );
}

export function Section({ title, hint, children, className, actions }: { title: string; hint?: string; children: React.ReactNode; className?: string; actions?: React.ReactNode }) {
  return (
    <section className={cn('rounded-card border border-border bg-surface p-4 shadow-s1 sm:p-5', className)}>
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="font-display text-lg font-semibold">{title}</h2>
          {hint ? <p className="text-sm text-muted">{hint}</p> : null}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}
