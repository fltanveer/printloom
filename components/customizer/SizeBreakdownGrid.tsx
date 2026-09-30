'use client';
import * as React from 'react';
import { Minus, Plus } from 'lucide-react';
import { sizeReason, stockLeft } from '@/lib/selectors';
import { Button } from '@/components/ui/button';
import { cn } from '@/components/ui/cn';
import { MoneyText } from '@/components/shared/MoneyText';
import { useCustomizer } from './model';
import { totalQty } from './draft';

export function QtyStepper({ value, onChange, min = 0, max = 999, label, compact }: { value: number; onChange: (v: number) => void; min?: number; max?: number; label: string; compact?: boolean }) {
  const [text, setText] = React.useState(String(value));
  React.useEffect(() => setText(String(value)), [value]);
  return (
    <div className={cn('inline-flex items-center rounded-input border border-border bg-surface', compact && 'w-full')} role="group" aria-label={label}>
      <Button variant="ghost" size={compact ? 'icon-sm' : 'icon'} aria-label={`Decrease ${label}`} disabled={value <= min} onClick={() => onChange(Math.max(min, value - 1))}>
        <Minus className="h-4 w-4" />
      </Button>
      <input
        type="number"
        inputMode="numeric"
        aria-label={label}
        min={min}
        max={max}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          const n = parseInt(e.target.value, 10);
          if (Number.isFinite(n)) onChange(Math.min(max, Math.max(min, n)));
          else if (e.target.value === '') onChange(min);
        }}
        className={cn('h-9 min-w-0 flex-1 bg-transparent text-center text-sm font-semibold tabular-nums focus:outline-none', compact ? 'w-8' : 'w-12')}
      />
      <Button variant="ghost" size={compact ? 'icon-sm' : 'icon'} aria-label={`Increase ${label}`} disabled={value >= max} onClick={() => onChange(Math.min(max, value + 1))}>
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
}

/** Size breakdown mode: a qty input per size, running total and tier nudge. */
export function SizeBreakdownGrid() {
  const { product, draft, update, selectedOffering, coverage, quote, state } = useCustomizer();
  const color = draft.customization.color;
  const total = totalQty(draft.sizeBreakdown);
  const shop = selectedOffering ? state.vendors[selectedOffering.vendorId]?.shopName : null;

  const set = (size: string, q: number) => update((d) => ({ ...d, sizeBreakdown: { ...d.sizeBreakdown, [size]: q } }), { coalesce: `bd-${size}` });

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {product.sizes.map((s) => {
          const q = draft.sizeBreakdown[s] ?? 0;
          const nowhere = coverage.missingEverywhere.includes(s);
          const reason = sizeReason(selectedOffering, color, s);
          const stock = stockLeft(selectedOffering, color, s);
          const lowStock = typeof stock === 'number' && stock > 0 && stock < 50;
          return (
            <div key={s} className={cn('rounded-input border p-2', q > 0 ? 'border-customer/60 bg-accent-soft' : 'border-border', reason && q > 0 && 'border-danger/50 bg-danger/5')}>
              <div className="mb-1.5 flex items-center justify-between text-sm font-semibold">
                <span>{s}</span>
                {q > 0 ? <span className="text-xs font-medium text-muted tabular-nums">{q} pcs</span> : null}
              </div>
              <QtyStepper compact value={q} onChange={(v) => set(s, v)} label={`${s} quantity`} />
              {reason ? (
                <p className={cn('mt-1 text-[11px] leading-tight', q > 0 ? 'font-medium text-red-600 dark:text-red-400' : 'text-muted')}>
                  {reason}
                  {shop ? ` at ${shop}` : ''}
                  {nowhere && q > 0 ? '. No shop has it' : ''}
                </p>
              ) : lowStock ? (
                <p className="mt-1 text-[11px] font-medium leading-tight text-amber-700 dark:text-amber-300">
                  Only {stock} left in {color} / {s} at this shop
                </p>
              ) : null}
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-input bg-surface-2 px-3 py-2 text-sm">
        <span>
          Total <strong className="tabular-nums">{total}</strong> {total === 1 ? 'piece' : 'pieces'}
        </span>
        {quote ? (
          <span className="text-muted">
            <MoneyText value={quote.unitAvg} animated className="font-semibold text-text" /> avg each
          </span>
        ) : null}
      </div>
      {quote?.nextTier ? (
        <p className="rounded-input border border-customer/30 bg-accent-soft px-3 py-2 text-sm font-medium text-accent-text">
          Add {quote.nextTier.needed} more to save {quote.nextTier.discountPct}% on every piece
        </p>
      ) : quote?.tier ? (
        <p className="text-sm font-medium text-green-700 dark:text-green-400">{quote.tier.discountPct}% bulk discount applied</p>
      ) : null}
    </div>
  );
}
