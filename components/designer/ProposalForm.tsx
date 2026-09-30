'use client';
import * as React from 'react';
import { toast } from 'sonner';
import { AlertTriangle, Send } from 'lucide-react';
import { useStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Field, Input, Textarea } from '@/components/ui/input';
import { cn } from '@/components/ui/cn';
import { MoneyText, useMoney } from '@/components/shared/MoneyText';
import { SafeImage } from '@/components/shared/bits';
import type { DesignRequest } from '@/lib/types';

/** Price, days, note and an optional portfolio sample. Sends through the store's sendProposal. */
export function ProposalForm({ request, designerId, onSent, compact }: { request: DesignRequest; designerId: string; onSent?: () => void; compact?: boolean }) {
  const designer = useStore((s) => s.designers[designerId]);
  const designs = useStore((s) => s.designs);
  const sendProposal = useStore((s) => s.sendProposal);
  const money = useMoney();
  const portfolio = React.useMemo(() => Object.values(designs).filter((d) => d.designerId === designerId && d.status === 'published' && !d.isPrivate), [designs, designerId]);
  const existing = request.proposals.find((p) => p.designerId === designerId && p.status === 'pending');

  const [price, setPrice] = React.useState(() => String(Math.max(designer?.startingPrice ?? 0, request.budget.min)));
  const [days, setDays] = React.useState(() => String(designer?.turnaroundDays ?? 3));
  const [note, setNote] = React.useState('');
  const [sample, setSample] = React.useState<string | undefined>(undefined);
  const [errors, setErrors] = React.useState<string[]>([]);

  if (existing)
    return (
      <div className="rounded-card border border-accent/30 bg-accent-soft p-4 text-sm">
        <p className="font-semibold">Proposal sent</p>
        <p className="mt-1 text-muted">
          You offered <MoneyText value={existing.price} className="font-semibold text-text" /> in {existing.days} days. We will let you know when the customer decides.
        </p>
      </div>
    );

  const p = Number(price);
  const d = Number(days);
  const overBudget = p > request.budget.max;
  const budgetBelowStart = designer && request.budget.max < designer.startingPrice;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs: string[] = [];
    if (!Number.isFinite(p) || p <= 0) errs.push('Enter a price above zero.');
    if (!Number.isInteger(d) || d < 1 || d > 60) errs.push('Delivery time should be 1 to 60 days.');
    if (note.trim().length < 10) errs.push('Add a short note (10+ characters) about your approach.');
    setErrors(errs);
    if (errs.length) return;
    const r = sendProposal(request.id, designerId, { price: Math.round(p), days: d, note: note.trim(), sampleDesignId: sample });
    if (!r.ok) {
      setErrors(r.reasons);
      toast.error(r.reasons.join(' '));
      return;
    }
    toast.success('Proposal sent. The customer has been notified.');
    onSent?.();
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      {budgetBelowStart ? (
        <p className="flex gap-2 rounded-input bg-warning/15 px-3 py-2 text-sm text-amber-800 dark:text-amber-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          Their budget ({money(request.budget.min)} to {money(request.budget.max)}) is below your starting price of {money(designer.startingPrice)}. You can still counter-propose.
        </p>
      ) : null}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Your price (৳)" htmlFor={`pp-price-${request.id}`}>
          <Input id={`pp-price-${request.id}`} type="number" inputMode="numeric" min={1} value={price} onChange={(e) => setPrice(e.target.value)} />
        </Field>
        <Field label="Delivery in (days)" htmlFor={`pp-days-${request.id}`}>
          <Input id={`pp-days-${request.id}`} type="number" inputMode="numeric" min={1} max={60} value={days} onChange={(e) => setDays(e.target.value)} />
        </Field>
      </div>
      {overBudget ? (
        <p className="flex gap-2 text-sm text-amber-700 dark:text-amber-300">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          That is above their budget of {money(request.budget.max)}. Explain why in your note.
        </p>
      ) : null}
      <Field label="Note to the customer" htmlFor={`pp-note-${request.id}`}>
        <Textarea id={`pp-note-${request.id}`} rows={compact ? 3 : 4} value={note} onChange={(e) => setNote(e.target.value)} placeholder="How you would approach it, what you will deliver, how many concepts." />
      </Field>
      {portfolio.length ? (
        <div>
          <p className="mb-2 text-sm font-medium">Attach a sample from your portfolio (optional)</p>
          <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
            {portfolio.slice(0, 12).map((ds) => (
              <button
                key={ds.id}
                type="button"
                onClick={() => setSample(sample === ds.id ? undefined : ds.id)}
                aria-pressed={sample === ds.id}
                aria-label={`Sample: ${ds.title}`}
                title={ds.title}
                className={cn('h-16 w-16 shrink-0 overflow-hidden rounded-input border-2 bg-surface-2', sample === ds.id ? 'border-accent' : 'border-transparent hover:border-border')}
              >
                <SafeImage src={ds.files.src} alt="" className="h-full w-full" />
              </button>
            ))}
          </div>
        </div>
      ) : null}
      {errors.length ? (
        <ul role="alert" className="list-disc space-y-0.5 pl-5 text-sm text-red-600 dark:text-red-400">
          {errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      ) : null}
      <Button type="submit" className="w-full">
        <Send className="h-4 w-4" /> Send proposal
      </Button>
    </form>
  );
}
