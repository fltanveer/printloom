import type { Layer } from './types';

export type DpiLevel = 'good' | 'soft' | 'blurry';

export function effectiveDpi(pxWidth: number, pxHeight: number, printedWidthIn: number, printedHeightIn: number): number {
  if (printedWidthIn <= 0 || printedHeightIn <= 0) return 0;
  return Math.round(Math.min(pxWidth / printedWidthIn, pxHeight / printedHeightIn));
}

export function dpiLevel(dpi: number): DpiLevel {
  if (dpi >= 150) return 'good';
  if (dpi >= 100) return 'soft';
  return 'blurry';
}

export const DPI_COPY: Record<DpiLevel, string> = {
  good: 'Looks sharp',
  soft: 'May look a bit soft at this size',
  blurry: 'Will look blurry. Try a larger image or make it smaller',
};

/** SVG, text and vector designs are always green. */
export function layerDpi(layer: Layer, isVector: boolean): { dpi: number | null; level: DpiLevel } {
  if (layer.kind === 'text' || isVector || !layer.pxWidth || !layer.pxHeight) return { dpi: null, level: 'good' };
  const dpi = effectiveDpi(layer.pxWidth, layer.pxHeight, layer.widthIn, layer.heightIn);
  return { dpi, level: dpiLevel(dpi) };
}

/** Max printable size at 150 DPI, e.g. "11 x 14 in". */
export function maxPrintSize(pxWidth: number, pxHeight: number): { w: number; h: number; label: string } {
  const w = Math.floor((pxWidth / 150) * 10) / 10;
  const h = Math.floor((pxHeight / 150) * 10) / 10;
  return { w, h, label: `${Math.floor(w)} x ${Math.floor(h)} in` };
}
