'use client';
import * as React from 'react';
import { Calculator } from 'lucide-react';
import type { Category } from '@/lib/types';
import { Field, Input, Textarea } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/components/ui/cn';
import { MoneyText } from '@/components/shared/MoneyText';
import { TagInput } from './bits';
import { ALL_CATEGORIES, CATEGORY_LABEL } from './MockupPreviewStrip';

export const ROYALTY_MIN = 20;
export const ROYALTY_MAX = 500;

export interface DetailsDraft {
  title: string;
  description: string;
  tags: string[];
  categories: Category[];
}

export function detailsErrors(d: DetailsDraft): Partial<Record<keyof DetailsDraft, string>> {
  const e: Partial<Record<keyof DetailsDraft, string>> = {};
  if (d.title.trim().length < 3) e.title = 'Give it a title of at least 3 characters.';
  if (d.tags.length < 1) e.tags = 'Add at least one tag so people can find it.';
  if (d.categories.length < 1) e.categories = 'Pick at least one product type.';
  return e;
}

export function royaltyError(v: string): string | null {
  const n = Number(v);
  if (!v.trim() || !Number.isFinite(n)) return 'Enter a royalty amount.';
  if (!Number.isInteger(n)) return 'Use a whole taka amount.';
  if (n < ROYALTY_MIN) return `Minimum royalty is ৳${ROYALTY_MIN}.`;
  if (n > ROYALTY_MAX) return `Maximum royalty is ৳${ROYALTY_MAX}.`;
  return null;
}

export function DetailsFields({ value, onChange, showErrors }: { value: DetailsDraft; onChange: (v: DetailsDraft) => void; showErrors?: boolean }) {
  const errs = showErrors ? detailsErrors(value) : {};
  return (
    <div className="space-y-4">
      <Field label="Title" htmlFor="df-title" error={errs.title}>
        <Input id="df-title" value={value.title} maxLength={80} onChange={(e) => onChange({ ...value, title: e.target.value })} placeholder="e.g. Rickshaw Sunset" />
      </Field>
      <Field label="Description" htmlFor="df-desc" hint="Optional. What is it, who is it for?">
        <Textarea id="df-desc" rows={3} value={value.description} maxLength={500} onChange={(e) => onChange({ ...value, description: e.target.value })} />
      </Field>
      <div>
        <p className="mb-2 text-sm font-medium">Tags</p>
        <TagInput id="df-tags" value={value.tags} onChange={(tags) => onChange({ ...value, tags })} />
        {errs.tags ? <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errs.tags}</p> : null}
      </div>
      <fieldset>
        <legend className="mb-2 text-sm font-medium">Works on</legend>
        <div className="flex flex-wrap gap-2">
          {ALL_CATEGORIES.map((c) => {
            const on = value.categories.includes(c);
            return (
              <button
                key={c}
                type="button"
                aria-pressed={on}
                onClick={() => onChange({ ...value, categories: on ? value.categories.filter((x) => x !== c) : [...value.categories, c] })}
                className={cn('min-h-[40px] rounded-full border px-3 text-sm font-medium transition-colors', on ? 'border-accent bg-accent text-white' : 'border-border bg-surface hover:border-accent/60')}
              >
                {CATEGORY_LABEL[c]}
              </button>
            );
          })}
        </div>
        {errs.categories ? <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errs.categories}</p> : null}
      </fieldset>
    </div>
  );
}

/** Royalty input with the monthly earnings estimator. */
export function RoyaltyField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [uses, setUses] = React.useState(50);
  const err = royaltyError(value);
  const amount = err ? 0 : Number(value);
  return (
    <div className="space-y-4">
      <Field label="Royalty per print (৳)" htmlFor="df-royalty" hint={`Fixed amount added to each item that uses your design. ৳${ROYALTY_MIN} to ৳${ROYALTY_MAX}.`} error={err}>
        <Input id="df-royalty" type="number" inputMode="numeric" min={ROYALTY_MIN} max={ROYALTY_MAX} step={5} value={value} onChange={(e) => onChange(e.target.value)} className="max-w-[200px]" />
      </Field>
      <div className="flex flex-wrap gap-2">
        {[40, 60, 80, 120].map((v) => (
          <button key={v} type="button" onClick={() => onChange(String(v))} className={cn('min-h-[40px] rounded-full border px-3 text-sm', value === String(v) ? 'border-accent bg-accent-soft font-semibold' : 'border-border hover:border-accent/60')}>
            ৳{v}
          </button>
        ))}
      </div>
      <div className="rounded-card border border-border bg-surface-2/60 p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <Calculator className="h-4 w-4" /> Earnings estimator
        </div>
        <Slider value={[uses]} min={0} max={500} step={10} onValueChange={(v) => setUses(v[0])} label="Uses per month" />
        <p className="mt-3 text-[15px]">
          At <span className="font-semibold tabular-nums">{uses}</span> uses a month you earn <MoneyText value={amount * uses} className="font-display text-lg font-bold text-accent-text" />
        </p>
        <p className="mt-1 text-xs text-muted">Popular designs in the library get 150 to 600 uses. A lower royalty keeps the final price friendly.</p>
      </div>
    </div>
  );
}
