'use client';
import * as React from 'react';
import Link from 'next/link';
import { useStore } from '@/lib/store';
import { COLORS } from '@/lib/seed';
import { fromPrice } from '@/lib/selectors';
import type { Design } from '@/lib/types';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { MockupRenderer } from '@/components/shared/MockupRenderer';
import { MoneyText } from '@/components/shared/MoneyText';
import { EmptyState } from '@/components/shared/bits';
import { fitDesignLayer } from './shopPricing';

/** "Use on product" dialog: products filtered to the design's compatible categories, linking to the customizer with the design preloaded. */
export function ProductPickerDialog({ design, open, onOpenChange }: { design: Design | null; open: boolean; onOpenChange: (o: boolean) => void }) {
  const data = useStore();
  const compatible = design
    ? Object.values(data.products)
        .filter((p) => design.compatibleCategories.includes(p.category))
        .sort((a, b) => b.popularity - a.popularity)
    : [];
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {design ? (
        <DialogContent title="Pick a product" description={`${design.title} works on these. Prices are "from" and update live once you choose a color and size.`} wide>
          {compatible.length ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {compatible.map((p) => {
                const layer = fitDesignLayer(p, design);
                const fp = fromPrice(data, p.id);
                return (
                  <Link
                    key={p.id}
                    href={`/product/${p.id}?design=${design.id}`}
                    onClick={() => onOpenChange(false)}
                    className="rounded-card border border-border bg-surface p-3 text-left shadow-s1 transition-all hover:border-accent/60 hover:shadow-s2"
                  >
                    <div className="rounded-input bg-accent-soft p-2">
                      <MockupRenderer product={p} colorHex={COLORS.White} layers={layer ? [layer] : []} label={`${design.title} on ${p.name}`} />
                    </div>
                    <div className="mt-2 truncate text-sm font-semibold">{p.name}</div>
                    <div className="text-xs text-muted">
                      {fp ? (
                        <>
                          from <MoneyText value={fp.price} className="font-semibold text-text" />
                          {design.royalty.amount > 0 ? (
                            <>
                              {' '}
                              + <MoneyText value={design.royalty.amount} /> royalty
                            </>
                          ) : null}
                        </>
                      ) : (
                        'No shops right now'
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <EmptyState kind="shirt" body="No products fit this design right now." />
          )}
        </DialogContent>
      ) : null}
    </Dialog>
  );
}
