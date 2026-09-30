'use client';
import * as React from 'react';
import { VIEW_LABEL } from '@/lib/mockups';
import { cn } from '@/components/ui/cn';
import { useCustomizer } from './model';

/** View tabs (Front, Back, sleeves). Shows how many layers sit on each view. */
export function PrintAreaTabs({ className }: { className?: string }) {
  const { product, view, setView, draft, setSelectedId } = useCustomizer();
  if (product.views.length < 2) return null;
  return (
    <div role="tablist" aria-label="Print areas" className={cn('no-scrollbar flex gap-1 overflow-x-auto rounded-full bg-surface-2 p-1', className)}>
      {product.views.map((v) => {
        const areaIds = product.printAreas.filter((a) => a.view === v).map((a) => a.id);
        const count = draft.customization.layers.filter((l) => areaIds.includes(l.printAreaId) && !l.hidden).length;
        const active = v === view;
        return (
          <button
            key={v}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => {
              setView(v);
              setSelectedId(null);
            }}
            className={cn(
              'inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-sm font-medium transition-colors',
              active ? 'bg-surface text-text shadow-s1' : 'text-muted hover:text-text',
            )}
          >
            {VIEW_LABEL[v]}
            {count ? <span className={cn('grid h-5 min-w-5 place-items-center rounded-full px-1 text-[11px] font-bold', active ? 'bg-accent text-white' : 'bg-border text-text')}>{count}</span> : null}
          </button>
        );
      })}
    </div>
  );
}
