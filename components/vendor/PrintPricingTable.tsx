'use client';
import * as React from 'react';
import { NumInput, type Mutate } from './fields';
import { METHOD_LABEL, SIZE_TIERS, TIER_LABEL, TIER_RULE } from '@/lib/pricing';
import { VIEW_LABEL } from '@/lib/mockups';
import { Tip } from '@/components/ui/tooltip';
import type { BaseProduct, Offering, PrintMethod } from '@/lib/types';

/** printTable[method][view][tier]. Empty cell = not offered for that area/tier. */
export function PrintPricingTable({ draft, product, mutate }: { draft: Offering; product: BaseProduct; mutate: Mutate }) {
  const methods = draft.methods.filter((m) => product.allowedMethods.includes(m));
  const views = [...new Set(product.printAreas.map((a) => a.view))];
  if (!methods.length) return <p className="text-sm text-muted">Pick at least one print method in Basics to price your prints.</p>;
  const set = (m: PrintMethod, view: (typeof views)[number], tier: (typeof SIZE_TIERS)[number], v: number | undefined) =>
    mutate((o) => {
      const mt = (o.pricing.printTable[m] ??= {});
      const vt = (mt[view] ??= {});
      if (v === undefined) delete vt[tier];
      else vt[tier] = v;
    });
  return (
    <div className="space-y-4">
      {methods.map((m) => (
        <div key={m}>
          <div className="mb-1.5 text-sm font-semibold">{METHOD_LABEL[m]}</div>
          <div className="overflow-x-auto rounded-card border border-border">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="bg-surface-2/60 text-xs text-muted">
                  <th className="px-3 py-2 text-left font-semibold">Print area</th>
                  {SIZE_TIERS.map((t) => (
                    <th key={t} className="px-2 py-2 text-left font-semibold">
                      <Tip content={TIER_RULE[t]}>
                        <span className="cursor-help underline decoration-dotted underline-offset-2">{TIER_LABEL[t].replace(' print', '')}</span>
                      </Tip>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {views.map((view) => {
                  const area = product.printAreas.find((a) => a.view === view);
                  return (
                    <tr key={view} className="border-t border-border">
                      <td className="px-3 py-2">
                        <div className="font-medium">{VIEW_LABEL[view]}</div>
                        {area ? <div className="text-[11px] text-muted">{area.widthIn} x {area.heightIn} in max</div> : null}
                      </td>
                      {SIZE_TIERS.map((t) => (
                        <td key={t} className="px-1.5 py-1.5">
                          <NumInput
                            value={draft.pricing.printTable[m]?.[view]?.[t]}
                            onChange={(v) => set(m, view, t, v)}
                            allowEmpty
                            min={0}
                            prefix="৳"
                            placeholder="Off"
                            className="h-10 min-w-[84px]"
                            aria-label={`${METHOD_LABEL[m]} ${VIEW_LABEL[view]} ${TIER_LABEL[t]}`}
                          />
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}
      <p className="text-xs text-muted">Leave a cell empty if you don't print that size there. Customers then get the next larger size you do price.</p>
    </div>
  );
}
