'use client';
import * as React from 'react';
import { areaBox, contrastInk, MOCKUP_H, MOCKUP_W, viewShape } from '@/lib/mockups';
import type { BaseProduct, Layer, View } from '@/lib/types';
import { cn } from '@/components/ui/cn';

/**
 * Recolors an SVG blank and overlays design layers per print area.
 * Layers use inch coordinates relative to their print area (same as the customizer).
 */
export function MockupRenderer({
  product,
  colorHex,
  view,
  layers = [],
  className,
  showArea = false,
  highlightOutOfBounds = false,
  label,
}: {
  product: BaseProduct;
  colorHex: string;
  view?: View;
  layers?: Layer[];
  className?: string;
  showArea?: boolean;
  highlightOutOfBounds?: boolean;
  label?: string;
}) {
  const v = view ?? product.views[0];
  const shape = viewShape(product.category, v);
  const uid = React.useId().replace(/:/g, '');
  const areas = product.printAreas.filter((a) => a.view === v);
  const ink = contrastInk(colorHex);
  const detailStroke = ink === '#FFFFFF' ? 'rgba(255,255,255,.14)' : 'rgba(0,0,0,.14)';

  if (!shape) return <div className={cn('aspect-[5/6] rounded-card bg-surface-2', className)} />;

  return (
    <svg viewBox={`0 0 ${MOCKUP_W} ${MOCKUP_H}`} className={cn('h-auto w-full', className)} role="img" aria-label={label ?? `${product.name} mockup, ${v.replace('_', ' ')}`}>
      <defs>
        <linearGradient id={`shade-${uid}`} x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity=".18" />
          <stop offset=".5" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity=".16" />
        </linearGradient>
        {areas.map((a) => {
          const b = areaBox(product.category, a);
          return (
            <clipPath key={a.id} id={`clip-${uid}-${a.id}`}>
              <rect x={b.x} y={b.y} width={b.w} height={b.h} />
            </clipPath>
          );
        })}
      </defs>
      <g style={{ ['--mug-handle' as string]: colorHex, ['--tote-handle' as string]: colorHex }}>
        {shape.body.map((d, i) => (
          <path key={i} d={d} fill={colorHex} stroke="rgba(0,0,0,.18)" strokeWidth={1.5} strokeLinejoin="round" />
        ))}
        {shape.trims?.map((t, i) => <path key={i} d={t.d} fill={t.fill} stroke="rgba(0,0,0,.15)" strokeWidth={1.2} />)}
        {shape.body.map((d, i) => (
          <path key={`s${i}`} d={d} fill={`url(#shade-${uid})`} />
        ))}
        {shape.details.map((d, i) => (
          <path key={i} d={d} fill="none" stroke={detailStroke} strokeWidth={2} strokeLinecap="round" />
        ))}
      </g>
      {areas.map((a) => {
        const b = areaBox(product.category, a);
        const areaLayers = layers.filter((l) => l.printAreaId === a.id && !l.hidden);
        return (
          <g key={a.id}>
            {showArea ? <rect x={b.x} y={b.y} width={b.w} height={b.h} fill="none" stroke={ink} strokeOpacity={0.45} strokeDasharray="6 5" rx={4} /> : null}
            <g clipPath={`url(#clip-${uid}-${a.id})`}>
              {areaLayers.map((l) => (
                <LayerSvg key={l.id} layer={l} ox={b.x} oy={b.y} ppi={b.ppi} />
              ))}
            </g>
            {highlightOutOfBounds
              ? areaLayers
                  .filter((l) => l.outOfBounds)
                  .map((l) => (
                    <g key={`oob-${l.id}`} opacity={0.3}>
                      <LayerSvg layer={l} ox={b.x} oy={b.y} ppi={b.ppi} />
                      <rect x={b.x + l.x * b.ppi} y={b.y + l.y * b.ppi} width={l.widthIn * b.ppi} height={l.heightIn * b.ppi} fill="none" stroke="#EF4444" strokeWidth={2} />
                    </g>
                  ))
              : null}
          </g>
        );
      })}
    </svg>
  );
}

function LayerSvg({ layer: l, ox, oy, ppi }: { layer: Layer; ox: number; oy: number; ppi: number }) {
  const x = ox + l.x * ppi;
  const y = oy + l.y * ppi;
  const w = l.widthIn * ppi;
  const h = l.heightIn * ppi;
  const cx = x + w / 2;
  const cy = y + h / 2;
  const transform = l.rotation ? `rotate(${l.rotation} ${cx} ${cy})` : undefined;
  if (l.kind === 'text') {
    const anchor = l.align === 'left' ? 'start' : l.align === 'right' ? 'end' : 'middle';
    const tx = l.align === 'left' ? x : l.align === 'right' ? x + w : cx;
    return (
      <text
        x={tx}
        y={cy}
        textAnchor={anchor}
        dominantBaseline="central"
        style={{ fontFamily: fontStack(l.font) }}
        fontWeight={700}
        fontSize={h * 0.8}
        letterSpacing={(l.letterSpacing ?? 0) * (h / 40)}
        fill={l.fill ?? '#fff'}
        stroke={l.outline ?? undefined}
        strokeWidth={l.outline ? Math.max(1, h * 0.04) : 0}
        paintOrder="stroke"
        transform={transform}
        textLength={w * 0.98}
        lengthAdjust="spacingAndGlyphs"
      >
        {l.text}
      </text>
    );
  }
  if (!l.src) return null;
  return <image href={l.src} x={x} y={y} width={w} height={h} preserveAspectRatio="none" transform={transform} />;
}

// next/font renames Inter and Space Grotesk, so map them to their CSS variables.
function fontStack(font?: string): string {
  if (!font || font === 'Space Grotesk') return "var(--font-display), 'Space Grotesk', sans-serif";
  if (font === 'Inter') return 'var(--font-inter), Inter, sans-serif';
  return `'${font}', sans-serif`;
}
