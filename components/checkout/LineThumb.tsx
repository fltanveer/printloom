'use client';
import * as React from 'react';
import { MockupRenderer } from '@/components/shared/MockupRenderer';
import { useStore } from '@/lib/store';
import { cn } from '@/components/ui/cn';
import type { Customization } from '@/lib/types';
import { bestView, hexFor } from './helpers';

/** Mockup thumbnail for a cart or order line. */
export function LineThumb({ customization, offeringId, className }: { customization: Customization; offeringId: string; className?: string }) {
  const product = useStore((s) => s.products[customization.productId]);
  const hex = useStore((s) => hexFor(s, offeringId, customization.color));
  if (!product) return <div className={cn('aspect-[5/6] rounded-input bg-surface-2', className)} />;
  const view = bestView(product.views, customization.layers, (id) => product.printAreas.find((a) => a.id === id)?.view);
  return (
    <div className={cn('shrink-0 overflow-hidden rounded-input bg-surface-2 p-1', className)}>
      <MockupRenderer product={product} colorHex={hex} view={view} layers={customization.layers} label={`${product.name} in ${customization.color}`} />
    </div>
  );
}
