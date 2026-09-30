// Customizer working state (form draft) and pure geometry helpers.
// Layer geometry is in inches relative to the print area's top-left corner.

import { layerDpi } from '@/lib/dpi';
import type { BaseProduct, Customization, Design, Layer, PrintArea, PrintMethod, QualityTier } from '@/lib/types';

export type QtyMode = 'single' | 'bulk';

export interface Draft {
  customization: Customization;
  method: PrintMethod;
  sizeBreakdown: Record<string, number>;
  qtyMode: QtyMode;
  rush: boolean;
  /** Vendor the customer picked in the chooser. null = use the recommended one. */
  pinnedOfferingId: string | null;
  /** Customizer locked to one shop (entered from a storefront). */
  lockVendorId: string | null;
  quality: QualityTier | null;
}

export const FONTS = ['Space Grotesk', 'Inter', 'Anton', 'Bebas Neue', 'Caveat', 'Pacifico', 'Permanent Marker', 'Playfair Display', 'Righteous', 'Space Mono'] as const;

const CURSIVE = new Set(['Caveat', 'Pacifico', 'Permanent Marker']);

/** CSS font-family stack for previews in the DOM. */
export function fontCss(font: string | undefined): string {
  const f = font ?? 'Space Grotesk';
  if (f === 'Space Grotesk') return 'var(--font-display), "Space Grotesk", system-ui, sans-serif';
  if (f === 'Inter') return 'var(--font-inter), Inter, system-ui, sans-serif';
  return `"${f}", ${CURSIVE.has(f) ? 'cursive' : f === 'Space Mono' ? 'monospace' : 'sans-serif'}`;
}

/** Concrete font-family string for canvas drawing (next/font uses hashed family names). */
export function fontCanvas(font: string | undefined): string {
  const f = font ?? 'Space Grotesk';
  if (typeof window !== 'undefined' && (f === 'Space Grotesk' || f === 'Inter')) {
    const v = getComputedStyle(document.documentElement).getPropertyValue(f === 'Inter' ? '--font-inter' : '--font-display').trim();
    if (v) return v;
  }
  return `"${f}"`;
}

export async function loadFont(font: string | undefined): Promise<void> {
  if (typeof document === 'undefined' || !('fonts' in document)) return;
  try {
    await document.fonts.load(`700 40px ${fontCanvas(font)}`);
  } catch {
    // font loading is best effort
  }
}

let measureCtx: CanvasRenderingContext2D | null = null;

/** Width in the same units as fontSize for a single line of text drawn bold. */
export function measureText(text: string, font: string | undefined, fontSize: number, letterSpacing = 0): number {
  if (typeof document === 'undefined') return text.length * fontSize * 0.6;
  if (!measureCtx) measureCtx = document.createElement('canvas').getContext('2d');
  if (!measureCtx) return text.length * fontSize * 0.6;
  measureCtx.font = `bold ${fontSize}px ${fontCanvas(font)}`;
  const w = measureCtx.measureText(text || ' ').width;
  return Math.max(fontSize * 0.3, w + letterSpacing * Math.max(0, (text || ' ').length));
}

/** Natural width in inches of a text layer for a given height (matches MockupRenderer: fontSize = 0.8 h). */
export function textWidthIn(text: string, font: string | undefined, heightIn: number, letterSpacing: number): number {
  const fs = 100;
  const hPx = fs / 0.8;
  const ls = letterSpacing * (hPx / 40);
  return round3((measureText(text, font, fs, ls) / 0.98 / hPx) * heightIn);
}

export const round3 = (n: number) => Math.round(n * 1000) / 1000;
export const round2 = (n: number) => Math.round(n * 100) / 100;

export function newLayerId(): string {
  return `ly_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export function isVectorLayer(l: Layer, designs: Record<string, Design>): boolean {
  if (l.kind === 'text') return true;
  if (l.kind === 'design' && l.designId) {
    const d = designs[l.designId];
    if (d?.files.kind === 'svg' && !(l.src ?? '').startsWith('data:image/png')) return true;
  }
  const src = l.src ?? '';
  return src.startsWith('data:image/svg') || /\.svg($|\?)/i.test(src);
}

/** Axis aligned bounding box of a (possibly rotated) layer, in inches. */
export function layerBounds(l: Pick<Layer, 'x' | 'y' | 'widthIn' | 'heightIn' | 'rotation'>) {
  const rad = (l.rotation * Math.PI) / 180;
  const w = Math.abs(l.widthIn * Math.cos(rad)) + Math.abs(l.heightIn * Math.sin(rad));
  const h = Math.abs(l.widthIn * Math.sin(rad)) + Math.abs(l.heightIn * Math.cos(rad));
  const cx = l.x + l.widthIn / 2;
  const cy = l.y + l.heightIn / 2;
  return { x0: cx - w / 2, y0: cy - h / 2, x1: cx + w / 2, y1: cy + h / 2, w, h, cx, cy };
}

export function isOutOfBounds(l: Layer, area: PrintArea): boolean {
  const b = layerBounds(l);
  const t = 0.02;
  return b.x0 < -t || b.y0 < -t || b.x1 > area.widthIn + t || b.y1 > area.heightIn + t;
}

/** Keep derived flags (outOfBounds, effectiveDpi) in sync with geometry. */
export function normalizeLayers(layers: Layer[], product: BaseProduct, designs: Record<string, Design>): Layer[] {
  return layers.map((l) => {
    const area = product.printAreas.find((a) => a.id === l.printAreaId);
    const outOfBounds = area ? isOutOfBounds(l, area) : false;
    const { dpi } = layerDpi(l, isVectorLayer(l, designs));
    const effectiveDpi = dpi ?? undefined;
    if (l.outOfBounds === outOfBounds && l.effectiveDpi === effectiveDpi) return l;
    return { ...l, outOfBounds, effectiveDpi };
  });
}

/** Box centered in the print area that keeps an aspect ratio (w / h) and fills a fraction of the area. */
export function centeredBox(area: PrintArea, aspect: number, fill = 0.7): { x: number; y: number; widthIn: number; heightIn: number } {
  let w = area.widthIn * fill;
  let h = w / aspect;
  if (h > area.heightIn * fill) {
    h = area.heightIn * fill;
    w = h * aspect;
  }
  return { x: round3((area.widthIn - w) / 2), y: round3((area.heightIn - h) / 2), widthIn: round3(w), heightIn: round3(h) };
}

/** Shrink and move a layer so its rotated bounds fit inside the print area. */
export function fitInside(l: Layer, area: PrintArea): Pick<Layer, 'x' | 'y' | 'widthIn' | 'heightIn'> {
  const b = layerBounds(l);
  const s = Math.min(1, area.widthIn / b.w, area.heightIn / b.h) * 0.999;
  const widthIn = l.widthIn * s;
  const heightIn = l.heightIn * s;
  const bw = b.w * s;
  const bh = b.h * s;
  const cx = Math.min(Math.max(b.cx, bw / 2), area.widthIn - bw / 2);
  const cy = Math.min(Math.max(b.cy, bh / 2), area.heightIn - bh / 2);
  return { x: round3(cx - widthIn / 2), y: round3(cy - heightIn / 2), widthIn: round3(widthIn), heightIn: round3(heightIn) };
}

export function cleanBreakdown(b: Record<string, number>): Record<string, number> {
  return Object.fromEntries(Object.entries(b).filter(([, q]) => q > 0));
}

export function totalQty(b: Record<string, number>): number {
  return Object.values(b).reduce((s, q) => s + (q > 0 ? q : 0), 0);
}

export function layerName(l: Layer, designs: Record<string, Design>): string {
  if (l.kind === 'text') return l.text?.trim() ? `"${l.text}"` : 'Text';
  if (l.kind === 'design' && l.designId) return designs[l.designId]?.title ?? 'Design';
  return 'Uploaded image';
}

export function isNearWhite(hex: string): boolean {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return r > 235 && g > 235 && b > 235;
}
