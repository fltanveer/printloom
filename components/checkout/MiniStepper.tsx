'use client';
import * as React from 'react';
import { cn } from '@/components/ui/cn';
import { ORDER_FLOW, ORDER_STATUS_LABEL, isOrderTerminalNegative, orderStepIndex } from '@/lib/stateMachines';
import type { OrderStatus } from '@/lib/types';

/** Horizontal mini stepper for one sub-order. */
export function MiniStepper({ status, className }: { status: OrderStatus; className?: string }) {
  const idx = orderStepIndex(status);
  const negative = isOrderTerminalNegative(status);
  const steps = ORDER_FLOW.filter((s) => s !== 'completed');
  return (
    <div className={cn('w-full', className)}>
      <ol className="flex items-center" aria-label={`Progress: ${ORDER_STATUS_LABEL[status]}`}>
        {steps.map((s, i) => {
          const reached = !negative && i <= idx;
          return (
            <li key={s} className="flex flex-1 items-center last:flex-none">
              <span
                className={cn('h-3 w-3 shrink-0 rounded-full border-2', reached ? 'border-accent bg-accent' : 'border-border bg-surface', i === idx && !negative && 'ring-4 ring-accent/20')}
                title={ORDER_STATUS_LABEL[s]}
                aria-current={i === idx ? 'step' : undefined}
              />
              {i < steps.length - 1 ? <span className={cn('mx-0.5 h-0.5 flex-1 rounded-full', !negative && i < idx ? 'bg-accent' : 'bg-border')} /> : null}
            </li>
          );
        })}
      </ol>
      <div className="mt-1.5 flex justify-between text-[11px] text-muted">
        <span>Placed</span>
        <span className="hidden sm:inline">In production</span>
        <span>Delivered</span>
      </div>
    </div>
  );
}
