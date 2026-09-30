'use client';
import * as React from 'react';
import { Switch } from '@/components/ui/switch';
import { NumInput } from './fields';
import type { DeliveryZone } from '@/lib/types';

export function ZoneTable({ zones, onChange }: { zones: DeliveryZone[]; onChange: (i: number, patch: Partial<DeliveryZone>) => void }) {
  return (
    <div className="overflow-x-auto rounded-card border border-border">
      <table className="w-full min-w-[420px] text-sm">
        <thead>
          <tr className="bg-surface-2/60 text-xs text-muted">
            <th className="px-3 py-2 text-left font-semibold">Zone</th>
            <th className="px-2 py-2 text-left font-semibold">Fee</th>
            <th className="px-2 py-2 text-left font-semibold">Days</th>
            <th className="px-3 py-2 text-left font-semibold">Served</th>
          </tr>
        </thead>
        <tbody>
          {zones.map((z, i) => (
            <tr key={z.zone} className={z.served ? 'border-t border-border' : 'border-t border-border opacity-60'}>
              <td className="px-3 py-2 font-medium">{z.label}</td>
              <td className="px-1.5 py-1.5">
                <NumInput value={z.fee} min={0} prefix="৳" onChange={(v) => onChange(i, { fee: v ?? 0 })} disabled={!z.served} aria-label={`${z.label} fee`} className="h-10" />
              </td>
              <td className="px-1.5 py-1.5">
                <NumInput value={z.days} min={0} onChange={(v) => onChange(i, { days: Math.round(v ?? 0) })} disabled={!z.served} aria-label={`${z.label} days`} className="h-10" />
              </td>
              <td className="px-3 py-2">
                <Switch checked={z.served} onCheckedChange={(v) => onChange(i, { served: v })} aria-label={`Deliver to ${z.label.toLowerCase()}`} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
