'use client';
import * as React from 'react';
import { toast } from 'sonner';
import { Download, FileImage, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { BaseProduct, Layer, PrintArea } from '@/lib/types';

export const EXPORT_DPI = 300;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Could not load ${src}`));
    img.src = src;
  });
}

/** Render one print area's layers onto an offscreen canvas at 300 DPI, using the layers' inch geometry. */
export async function renderAreaPng(area: PrintArea, layers: Layer[], dpi = EXPORT_DPI): Promise<Blob> {
  const W = Math.round(area.widthIn * dpi);
  const H = Math.round(area.heightIn * dpi);
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is not available in this browser');
  ctx.clearRect(0, 0, W, H); // transparent background, as printers expect
  for (const l of layers) {
    if (l.hidden) continue;
    const x = l.x * dpi;
    const y = l.y * dpi;
    const w = l.widthIn * dpi;
    const h = l.heightIn * dpi;
    ctx.save();
    ctx.translate(x + w / 2, y + h / 2);
    if (l.rotation) ctx.rotate((l.rotation * Math.PI) / 180);
    if (l.kind === 'text') {
      const family = l.font ?? 'Space Grotesk';
      const font = `700 ${Math.round(h * 0.8)}px "${family}", sans-serif`;
      try {
        await document.fonts?.load(font);
      } catch {
        /* fall back to the sans-serif font */
      }
      ctx.font = font;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const text = l.text ?? '';
      const measured = ctx.measureText(text).width || 1;
      ctx.scale((w * 0.98) / measured, 1); // same as SVG textLength + spacingAndGlyphs in the mockup
      if (l.outline) {
        ctx.lineJoin = 'round';
        ctx.lineWidth = Math.max(2, h * 0.08);
        ctx.strokeStyle = l.outline;
        ctx.strokeText(text, 0, 0);
      }
      ctx.fillStyle = l.fill ?? '#FFFFFF';
      ctx.fillText(text, 0, 0);
    } else if (l.src) {
      const img = await loadImage(l.src);
      ctx.drawImage(img, -w / 2, -h / 2, w, h);
    }
    ctx.restore();
  }
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Export failed'))), 'image/png'));
}

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export interface ExportItem {
  key: string;
  label: string;
  fileName: string;
  area: PrintArea;
  layers: Layer[];
}

export function exportItemsFor(product: BaseProduct, layers: Layer[], prefix: string): ExportItem[] {
  return product.printAreas
    .map((area) => ({ area, layers: layers.filter((l) => l.printAreaId === area.id && !l.hidden) }))
    .filter((x) => x.layers.length)
    .map(({ area, layers: ls }) => ({
      key: `${prefix}-${area.id}`,
      label: area.name,
      fileName: `${prefix}-${area.name.toLowerCase().replace(/\s+/g, '-')}-${EXPORT_DPI}dpi.png`,
      area,
      layers: ls,
    }));
}

export function PrintFileExport({ items }: { items: ExportItem[] }) {
  const [busy, setBusy] = React.useState<string | null>(null);

  const one = async (it: ExportItem) => {
    setBusy(it.key);
    try {
      const blob = await renderAreaPng(it.area, it.layers);
      download(blob, it.fileName);
      toast.success(`${it.label} print file downloaded (${Math.round(it.area.widthIn * EXPORT_DPI)} x ${Math.round(it.area.heightIn * EXPORT_DPI)} px)`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Export failed. Try again.');
    } finally {
      setBusy(null);
    }
  };

  const all = async () => {
    setBusy('__all');
    let ok = 0;
    for (const it of items) {
      try {
        const blob = await renderAreaPng(it.area, it.layers);
        download(blob, it.fileName);
        ok++;
        await new Promise((r) => setTimeout(r, 400)); // browsers block rapid multi downloads
      } catch {
        toast.error(`Couldn't export ${it.label}`);
      }
    }
    setBusy(null);
    if (ok) toast.success(`${ok} print ${ok === 1 ? 'file' : 'files'} downloaded`);
  };

  if (!items.length) return <p className="text-sm text-muted">This order has no decorated areas.</p>;

  return (
    <div className="space-y-2">
      {items.map((it) => (
        <div key={it.key} className="flex flex-wrap items-center gap-3 rounded-input border border-border p-2.5">
          <FileImage className="h-5 w-5 text-muted" />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold">{it.fileName}</div>
            <div className="text-xs text-muted">
              {it.area.widthIn} x {it.area.heightIn} in, {Math.round(it.area.widthIn * EXPORT_DPI)} x {Math.round(it.area.heightIn * EXPORT_DPI)} px, transparent PNG
            </div>
          </div>
          <Badge tone="neutral">{it.layers.length} {it.layers.length === 1 ? 'layer' : 'layers'}</Badge>
          <Button size="sm" variant="secondary" onClick={() => one(it)} disabled={!!busy}>
            {busy === it.key ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} PNG
          </Button>
        </div>
      ))}
      {items.length > 1 ? (
        <Button onClick={all} disabled={!!busy} className="w-full sm:w-auto">
          {busy === '__all' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Download all ({items.length})
        </Button>
      ) : null}
    </div>
  );
}
