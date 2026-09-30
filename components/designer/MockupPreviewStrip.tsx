'use client';
import * as React from 'react';
import { Moon, Sun } from 'lucide-react';
import { MockupRenderer } from '@/components/shared/MockupRenderer';
import { useStore } from '@/lib/store';
import type { BaseProduct, Category, Layer } from '@/lib/types';

export const CATEGORY_LABEL: Record<Category, string> = {
  tshirt: 'T-shirts',
  polo: 'Polos',
  hoodie: 'Hoodies',
  jersey: 'Jerseys',
  mug: 'Mugs',
  tote: 'Tote bags',
  poster: 'Posters',
  phonecase: 'Phone cases',
  cap: 'Caps',
};
export const ALL_CATEGORIES = Object.keys(CATEGORY_LABEL) as Category[];

const LIGHT = { name: 'White', hex: '#FFFFFF' };
const DARK = { name: 'Black', hex: '#141414' };

/** A design layer centered in the product's main print area, sized to fit 80% of it. */
export function previewLayer(product: BaseProduct, src: string, widthPx: number, heightPx: number): Layer {
  const area = product.printAreas.find((a) => a.view === 'front') ?? product.printAreas[0];
  const ratio = widthPx / Math.max(1, heightPx);
  let w = area.widthIn * 0.8;
  let h = w / ratio;
  if (h > area.heightIn * 0.8) {
    h = area.heightIn * 0.8;
    w = h * ratio;
  }
  return { id: `pv_${product.id}`, kind: 'design', printAreaId: area.id, x: (area.widthIn - w) / 2, y: (area.heightIn - h) / 2, widthIn: w, heightIn: h, rotation: 0, src, outOfBounds: false, pxWidth: widthPx, pxHeight: heightPx };
}

/** Mockups across compatible products in a light and a dark color, so designs that vanish on dark shirts are caught early. */
export function MockupPreviewStrip({ src, widthPx, heightPx, categories }: { src: string; widthPx: number; heightPx: number; categories: Category[] }) {
  const products = useStore((s) => s.products);
  const list = React.useMemo(() => Object.values(products).filter((p) => categories.includes(p.category)).sort((a, b) => b.popularity - a.popularity), [products, categories]);
  if (!list.length) return <p className="rounded-card border border-dashed border-border p-6 text-center text-sm text-muted">Pick at least one product type to see previews.</p>;
  return (
    <div className="space-y-4">
      {[LIGHT, DARK].map((c) => (
        <div key={c.name}>
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
            {c === LIGHT ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            On {c === LIGHT ? 'light' : 'dark'} colors ({c.name})
          </div>
          <div className="no-scrollbar -mx-1 flex gap-3 overflow-x-auto px-1 pb-2">
            {list.map((p) => (
              <figure key={p.id} className="w-36 shrink-0 rounded-card border border-border bg-surface-2/60 p-2 sm:w-40">
                <MockupRenderer product={p} colorHex={c.hex} layers={[previewLayer(p, src, widthPx, heightPx)]} label={`${p.name} in ${c.name} with your design`} />
                <figcaption className="mt-1 truncate text-center text-xs text-muted">{p.name}</figcaption>
              </figure>
            ))}
          </div>
        </div>
      ))}
      <p className="text-xs text-muted">Does your design disappear on the dark row? Add a light outline, or upload a separate light version for dark shirts.</p>
    </div>
  );
}
