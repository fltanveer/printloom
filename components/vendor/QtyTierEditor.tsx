'use client';
import * as React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NumInput, type Mutate } from './fields';
import type { QtyTier } from '@/lib/types';

export function tierErrors(tiers: QtyTier[]): Record<number, string> {
  const e: Record<number, string> = {};
  tiers.forEach((t, i) => {
    if (t.minQty < 1) e[i] = 'Start at 1 piece or more';
    else if (i > 0 && t.minQty <= tiers[i - 1].minQty) e[i] = `Must be more than ${tiers[i - 1].minQty}`;
    else if (t.discountPct < 0 || t.discountPct > 60) e[i] = 'Discount must be 0 to 60%';
  });
  return e;
}

export function QtyTierEditor({ tiers, mutate }: { tiers: QtyTier[]; mutate: Mutate }) {
  const errs = tierErrors(tiers);
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-[1fr_1fr_44px] gap-2 text-xs font-semibold text-muted">
        <span>From pieces</span>
        <span>Discount</span>
        <span />
      </div>
      {tiers.map((t, i) => (
        <div key={i}>
          <div className="grid grid-cols-[1fr_1fr_44px] items-center gap-2">
            <NumInput value={t.minQty} min={1} onChange={(v) => mutate((o) => void (o.pricing.qtyTiers[i].minQty = Math.round(v ?? 0)))} aria-label={`Tier ${i + 1} minimum pieces`} />
            <NumInput value={t.discountPct} min={0} max={60} suffix="%" onChange={(v) => mutate((o) => void (o.pricing.qtyTiers[i].discountPct = v ?? 0))} aria-label={`Tier ${i + 1} discount`} />
            <Button variant="ghost" size="icon" aria-label={`Remove tier ${i + 1}`} disabled={tiers.length <= 1} onClick={() => mutate((o) => void o.pricing.qtyTiers.splice(i, 1))}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          {errs[i] ? <p className="mt-1 text-xs font-medium text-danger">{errs[i]}</p> : null}
        </div>
      ))}
      <Button
        variant="secondary"
        size="sm"
        onClick={() =>
          mutate((o) => {
            const last = o.pricing.qtyTiers[o.pricing.qtyTiers.length - 1];
            o.pricing.qtyTiers.push({ minQty: last ? last.minQty * 2 : 1, discountPct: last ? Math.min(60, last.discountPct + 5) : 0 });
          })
        }
      >
        <Plus className="h-4 w-4" /> Add tier
      </Button>
      <p className="text-xs text-muted">Discounts apply to garment and print, not to royalties, setup fees or delivery. Tiers must go up in pieces.</p>
    </div>
  );
}
