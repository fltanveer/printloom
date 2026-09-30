'use client';
import * as React from 'react';
import { DPI_COPY, dpiLevel, maxPrintSize } from '@/lib/dpi';
import { Tip } from '@/components/ui/tooltip';
import { cn } from '@/components/ui/cn';

const TONE = {
  good: { chip: 'bg-green-600 text-white', bar: '#16A34A', label: 'Good' },
  soft: { chip: 'bg-amber-400 text-black', bar: '#F59E0B', label: 'Soft' },
  blurry: { chip: 'bg-red-600 text-white', bar: '#EF4444', label: 'Blurry' },
} as const;

/** Compact DPI chip (green / amber / red) used on the canvas and in lists. */
export function DpiChip({ dpi, className }: { dpi: number; className?: string }) {
  const level = dpiLevel(dpi);
  return (
    <Tip content={DPI_COPY[level]}>
      <span tabIndex={0} className={cn('inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-bold shadow-s1', TONE[level].chip, className)} aria-label={`${dpi} DPI. ${DPI_COPY[level]}`}>
        <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
        {dpi} DPI
      </span>
    </Tip>
  );
}

/** Full meter: DPI value, quality bar, copy and the biggest sharp print size. */
export function DpiMeter({ dpi, pxWidth, pxHeight, vector }: { dpi: number | null; pxWidth?: number; pxHeight?: number; vector?: boolean }) {
  if (vector || dpi === null) {
    return (
      <div className="rounded-input border border-green-600/30 bg-green-600/5 p-3 text-sm">
        <div className="font-semibold text-green-700 dark:text-green-400">Vector artwork, always sharp</div>
        <p className="mt-0.5 text-xs text-muted">Prints crisp at any size.</p>
      </div>
    );
  }
  const level = dpiLevel(dpi);
  const pct = Math.min(100, (dpi / 300) * 100);
  const max = pxWidth && pxHeight ? maxPrintSize(pxWidth, pxHeight) : null;
  return (
    <div className="rounded-input border border-border bg-surface-2 p-3 text-sm" aria-live="polite">
      <div className="flex items-center justify-between gap-2">
        <span className="font-semibold">Print quality</span>
        <DpiChip dpi={dpi} />
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-border" role="meter" aria-valuemin={0} aria-valuemax={300} aria-valuenow={dpi} aria-label="Print resolution">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: TONE[level].bar }} />
      </div>
      <p className="mt-1.5 text-xs text-muted">{DPI_COPY[level]}</p>
      {max ? <p className="mt-0.5 text-xs text-muted">Sharp up to about {max.label} ({pxWidth} x {pxHeight} px).</p> : null}
    </div>
  );
}
