'use client';
import * as React from 'react';
import { AlertTriangle, Info, ShoppingBag } from 'lucide-react';
import { VIEW_LABEL } from '@/lib/mockups';
import type { BaseProduct, Layer, PrintArea } from '@/lib/types';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/switch';
import { Tip } from '@/components/ui/tooltip';
import { cn } from '@/components/ui/cn';
import { MockupRenderer } from '@/components/shared/MockupRenderer';
import type { Warning } from './model';
import { fontCss } from './draft';

const APPAREL = ['tshirt', 'polo', 'hoodie', 'jersey'];
const ZOOM_PPI = 96; // CSS pixels per inch, so 100% is the real printed size on screen

export function PreviewModal({
  open,
  onOpenChange,
  product,
  colorHex,
  colorName,
  layers,
  warnings,
  acked,
  onAck,
  onConfirm,
  ctaLabel,
  ctaDisabledReason,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  product: BaseProduct;
  colorHex: string;
  colorName: string;
  layers: Layer[];
  warnings: Warning[];
  acked: boolean;
  onAck: (v: boolean) => void;
  onConfirm: () => void;
  ctaLabel: string;
  ctaDisabledReason: string | null;
}) {
  const serious = warnings.filter((w) => w.level !== 'info');
  const usedAreas = product.printAreas.filter((a) => layers.some((l) => l.printAreaId === a.id && !l.hidden));
  const [zoomArea, setZoomArea] = React.useState<string>(usedAreas[0]?.id ?? product.printAreas[0].id);
  React.useEffect(() => {
    if (open && !usedAreas.some((a) => a.id === zoomArea) && usedAreas[0]) setZoomArea(usedAreas[0].id);
  }, [open, usedAreas, zoomArea]);
  const apparel = APPAREL.includes(product.category);
  const needsAck = serious.length > 0 && !acked;
  const blocked = ctaDisabledReason ?? (needsAck ? 'Tick the box to confirm you checked the warnings' : null);
  const area = product.printAreas.find((a) => a.id === zoomArea) ?? product.printAreas[0];
  const zoomRef = React.useRef<HTMLDivElement>(null);
  const zoomLayers = layers.filter((l) => l.printAreaId === area.id && !l.hidden);
  const focusX = zoomLayers.length ? zoomLayers.reduce((s, l) => s + l.x + l.widthIn / 2, 0) / zoomLayers.length : area.widthIn / 2;
  const focusY = zoomLayers.length ? zoomLayers.reduce((s, l) => s + l.y + l.heightIn / 2, 0) / zoomLayers.length : area.heightIn / 2;
  // center the 100% view on the artwork
  const centerZoom = React.useCallback(
    (el: HTMLDivElement | null) => {
      if (!el) return;
      el.scrollLeft = Math.max(0, focusX * ZOOM_PPI + 12 - el.clientWidth / 2);
      el.scrollTop = Math.max(0, focusY * ZOOM_PPI + 12 - el.clientHeight / 2);
    },
    [focusX, focusY],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent wide title="Preview your design" description={`${product.name} in ${colorName}. This is how it will print.`}>
        <Tabs defaultValue="views">
          <TabsList>
            <TabsTrigger value="views">All views</TabsTrigger>
            {apparel ? <TabsTrigger value="model">On model</TabsTrigger> : null}
            <TabsTrigger value="zoom">Print area at 100%</TabsTrigger>
          </TabsList>
          <TabsContent value="views">
            <div className={cn('grid gap-3', product.views.length > 2 ? 'grid-cols-2 md:grid-cols-4' : product.views.length === 2 ? 'grid-cols-2' : 'grid-cols-1 sm:mx-auto sm:max-w-sm')}>
              {product.views.map((v) => (
                <figure key={v} className="rounded-card bg-surface-2 p-2">
                  <MockupRenderer product={product} colorHex={colorHex} view={v} layers={layers} />
                  <figcaption className="mt-1 text-center text-xs font-medium text-muted">{VIEW_LABEL[v]}</figcaption>
                </figure>
              ))}
            </div>
          </TabsContent>
          {apparel ? (
            <TabsContent value="model">
              <OnModel product={product} colorHex={colorHex} layers={layers} />
            </TabsContent>
          ) : null}
          <TabsContent value="zoom">
            {usedAreas.length > 1 ? (
              <div className="mb-3 flex flex-wrap gap-1.5" role="group" aria-label="Print area">
                {usedAreas.map((a) => (
                  <Button key={a.id} size="sm" variant={a.id === zoomArea ? 'soft' : 'ghost'} onClick={() => setZoomArea(a.id)} aria-pressed={a.id === zoomArea}>
                    {a.name}
                  </Button>
                ))}
              </div>
            ) : null}
            <p className="mb-2 text-xs text-muted">
              Actual print size ({area.widthIn} x {area.heightIn} in). If it looks soft here, it will look soft on the {product.name.toLowerCase()}.
            </p>
            <div
              key={area.id}
              ref={(el) => {
                zoomRef.current = el;
                if (el && !el.dataset.centered) {
                  el.dataset.centered = '1';
                  setTimeout(() => centerZoom(el), 30);
                }
              }}
              className="max-h-[55vh] overflow-auto rounded-card border border-border bg-surface-2 p-3">
              <AreaZoom area={area} colorHex={colorHex} layers={zoomLayers} />
            </div>
          </TabsContent>
        </Tabs>

        <div className="mt-5 space-y-2">
          <h3 className="text-sm font-semibold">Before you order</h3>
          {warnings.length ? (
            <ul className="space-y-1.5">
              {warnings.map((w) => (
                <li key={w.id} className={cn('flex items-start gap-2 rounded-input p-2.5 text-sm', w.level === 'red' ? 'bg-danger/10' : w.level === 'amber' ? 'bg-warning/15' : 'bg-info/10')}>
                  {w.level === 'info' ? <Info className="mt-0.5 h-4 w-4 shrink-0 text-info" /> : <AlertTriangle className={cn('mt-0.5 h-4 w-4 shrink-0', w.level === 'red' ? 'text-danger' : 'text-warning')} />}
                  <span>
                    <span className="font-medium">{w.title}.</span> <span className="text-muted">{w.body}</span>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-input bg-success/10 p-2.5 text-sm font-medium text-green-700 dark:text-green-400">Everything looks good. Sharp artwork, all inside the print area.</p>
          )}
          {serious.length ? (
            <label className="flex cursor-pointer items-start gap-2 rounded-input border border-border p-2.5 text-sm">
              <Checkbox checked={acked} onCheckedChange={(v) => onAck(v === true)} className="mt-0.5" aria-label="I checked these warnings and want to continue" />
              <span className="font-medium">I checked these warnings and want to continue</span>
            </label>
          ) : null}
        </div>

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Keep editing
          </Button>
          <Tip content={blocked}>
            <span>
              <Button className="w-full sm:w-auto" disabled={!!blocked} onClick={onConfirm}>
                <ShoppingBag className="h-4 w-4" /> {ctaLabel}
              </Button>
            </span>
          </Tip>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function OnModel({ product, colorHex, layers }: { product: BaseProduct; colorHex: string; layers: Layer[] }) {
  return (
    <div className="relative mx-auto aspect-[4/5] w-full max-w-md overflow-hidden rounded-card bg-gradient-to-br from-customer/25 via-designer/15 to-vendor/20">
      <svg viewBox="0 0 400 500" className="absolute inset-0 h-full w-full" aria-hidden>
        <defs>
          <radialGradient id="pm-glow" cx="50%" cy="30%" r="60%">
            <stop offset="0" stopColor="#fff" stopOpacity=".55" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="400" height="500" fill="url(#pm-glow)" />
        <ellipse cx="200" cy="470" rx="150" ry="16" fill="#000" opacity=".12" />
        {/* simple silhouette: head, neck, shoulders and arms */}
        <circle cx="200" cy="78" r="44" fill="#c99a7a" />
        <rect x="182" y="112" width="36" height="34" rx="10" fill="#b98a6b" />
        <path d="M70 250 Q60 170 120 150 L280 150 Q340 170 330 250 L318 420 L82 420 Z" fill="#b98a6b" />
      </svg>
      <div className="absolute inset-x-[6%] top-[23%]">
        <MockupRenderer product={product} colorHex={colorHex} view="front" layers={layers} label={`${product.name} on a model`} />
      </div>
      <span className="absolute bottom-3 left-3 rounded-full bg-surface px-2.5 py-1 text-[11px] font-semibold text-muted backdrop-blur">Style preview</span>
    </div>
  );
}

/** Print area rendered at real size (96 CSS px per inch) to check sharpness. */
function AreaZoom({ area, colorHex, layers }: { area: PrintArea; colorHex: string; layers: Layer[] }) {
  const w = area.widthIn * ZOOM_PPI;
  const h = area.heightIn * ZOOM_PPI;
  return (
    <div className="relative mx-auto" style={{ width: w, height: h, background: colorHex }}>
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="absolute inset-0" role="img" aria-label={`${area.name} at actual size`}>
        {layers.map((l) => {
          const x = l.x * ZOOM_PPI;
          const y = l.y * ZOOM_PPI;
          const lw = l.widthIn * ZOOM_PPI;
          const lh = l.heightIn * ZOOM_PPI;
          const t = l.rotation ? `rotate(${l.rotation} ${x + lw / 2} ${y + lh / 2})` : undefined;
          if (l.kind === 'text')
            return (
              <text
                key={l.id}
                x={x + lw / 2}
                y={y + lh / 2}
                textAnchor="middle"
                dominantBaseline="central"
                fontFamily={fontCss(l.font)}
                fontWeight={700}
                fontSize={lh * 0.8}
                fill={l.fill ?? '#fff'}
                stroke={l.outline ?? undefined}
                strokeWidth={l.outline ? Math.max(1, lh * 0.04) : 0}
                paintOrder="stroke"
                textLength={lw * 0.98}
                lengthAdjust="spacingAndGlyphs"
                transform={t}
              >
                {l.text}
              </text>
            );
          return l.src ? <image key={l.id} href={l.src} x={x} y={y} width={lw} height={lh} preserveAspectRatio="none" transform={t} style={{ imageRendering: 'auto' }} /> : null;
        })}
      </svg>
      <div className="pointer-events-none absolute inset-0 border-2 border-dashed border-black/25" />
    </div>
  );
}
