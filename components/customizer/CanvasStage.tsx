'use client';
// Konva canvas: recolored mockup, dashed print area, draggable / transformable layers,
// snapping to center lines, out-of-bounds ghosting, DPI chips and the size tier label.
// Loaded with next/dynamic (ssr: false).

import * as React from 'react';
import Konva from 'konva';
import { Stage, Layer as KLayer, Group, Rect, Path, Image as KImage, Text as KText, Transformer, Line } from 'react-konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import { areaBox, contrastInk, MOCKUP_H, MOCKUP_W, viewShape, type AreaBox } from '@/lib/mockups';
import { layerDpi } from '@/lib/dpi';
import { DpiChip } from './DpiMeter';
import { TIER_LABEL, TIER_RULE } from '@/lib/pricing';
import type { AreaSpec, BaseProduct, Design, Layer, View } from '@/lib/types';
import { Tip } from '@/components/ui/tooltip';
import { cn } from '@/components/ui/cn';
import { fontCanvas, isVectorLayer, loadFont, measureText, round3 } from './draft';
import type { UpdateOptions } from './useHistory';

export interface CanvasStageProps {
  product: BaseProduct;
  colorHex: string;
  view: View;
  layers: Layer[];
  designs: Record<string, Design>;
  areas: AreaSpec[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onPatch: (id: string, patch: Partial<Layer>, opts?: UpdateOptions) => void;
  onDropFiles?: (files: File[]) => void;
  maxHeight?: number;
}

function useHtmlImage(src: string | undefined): HTMLImageElement | null {
  const [img, setImg] = React.useState<HTMLImageElement | null>(null);
  React.useEffect(() => {
    if (!src) {
      setImg(null);
      return;
    }
    let alive = true;
    const i = new window.Image();
    i.onload = () => alive && setImg(i);
    i.onerror = () => alive && setImg(null);
    i.src = src;
    return () => {
      alive = false;
    };
  }, [src]);
  return img;
}

const SNAP = 5; // mockup units

export default function CanvasStage(props: CanvasStageProps) {
  const { product, colorHex, view, layers, designs, areas, selectedId, onSelect, onPatch, onDropFiles, maxHeight = 640 } = props;
  const wrapRef = React.useRef<HTMLDivElement>(null);
  const [width, setWidth] = React.useState(360);
  const [guides, setGuides] = React.useState<{ v: boolean; h: boolean }>({ v: false, h: false });
  const [dragOver, setDragOver] = React.useState(false);
  const [, setFontTick] = React.useState(0);
  const nodes = React.useRef<Record<string, Konva.Group | null>>({});
  const trRef = React.useRef<Konva.Transformer>(null);

  React.useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    setWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  // redraw text once web fonts are ready
  const fontsKey = layers
    .filter((l) => l.kind === 'text')
    .map((l) => l.font)
    .join('|');
  React.useEffect(() => {
    let alive = true;
    const fonts = [...new Set(fontsKey.split('|').filter(Boolean))];
    Promise.all(fonts.map((f) => loadFont(f))).then(() => alive && setFontTick((t) => t + 1));
    const onDone = () => alive && setFontTick((t) => t + 1);
    document.fonts?.addEventListener?.('loadingdone', onDone);
    return () => {
      alive = false;
      document.fonts?.removeEventListener?.('loadingdone', onDone);
    };
  }, [fontsKey]);

  const stageW = Math.max(240, Math.min(width, (maxHeight * MOCKUP_W) / MOCKUP_H));
  const scale = stageW / MOCKUP_W;
  const stageH = MOCKUP_H * scale;
  const shape = viewShape(product.category, view);
  const viewAreas = product.printAreas.filter((a) => a.view === view);
  const ink = contrastInk(colorHex);
  const detailStroke = ink === '#FFFFFF' ? 'rgba(255,255,255,.16)' : 'rgba(0,0,0,.14)';

  const selected = layers.find((l) => l.id === selectedId && !l.hidden && viewAreas.some((a) => a.id === l.printAreaId)) ?? null;

  React.useEffect(() => {
    const tr = trRef.current;
    if (!tr) return;
    const node = selected && !selected.locked ? nodes.current[selected.id] : null;
    tr.nodes(node ? [node] : []);
    tr.getLayer()?.batchDraw();
  });

  const boxes = React.useMemo(() => Object.fromEntries(viewAreas.map((a) => [a.id, areaBox(product.category, a)])), [viewAreas, product.category]);

  function toInches(node: Konva.Group, l: Layer, box: AreaBox, final: boolean) {
    const sx = node.scaleX();
    const sy = node.scaleY();
    const wPx = l.widthIn * box.ppi * sx;
    const hPx = l.heightIn * box.ppi * sy;
    if (sx !== 1 || sy !== 1) {
      node.scaleX(1);
      node.scaleY(1);
    }
    const widthIn = Math.max(0.2, wPx / box.ppi);
    const heightIn = Math.max(0.2, hPx / box.ppi);
    const x = (node.x() - box.x) / box.ppi - widthIn / 2;
    const y = (node.y() - box.y) / box.ppi - heightIn / 2;
    onPatch(l.id, { x: round3(x), y: round3(y), widthIn: round3(widthIn), heightIn: round3(heightIn), rotation: Math.round(node.rotation() * 10) / 10 }, { transient: !final });
  }

  function onDragMove(e: KonvaEventObject<DragEvent>, l: Layer, box: AreaBox) {
    const node = e.currentTarget as unknown as Konva.Group;
    const cx = box.x + box.w / 2;
    const cy = box.y + box.h / 2;
    const v = Math.abs(node.x() - cx) < SNAP;
    const h = Math.abs(node.y() - cy) < SNAP;
    if (v) node.x(cx);
    if (h) node.y(cy);
    if (v !== guides.v || h !== guides.h) setGuides({ v, h });
    toInches(node, l, box, false);
  }

  const areaTier = (id: string) => areas.find((a) => a.areaId === id);

  return (
    <div
      ref={wrapRef}
      className={cn('relative w-full select-none', dragOver && 'rounded-card ring-2 ring-accent ring-offset-2 ring-offset-bg')}
      onDragOver={(e) => {
        if (!onDropFiles || !e.dataTransfer.types.includes('Files')) return;
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        if (!onDropFiles) return;
        e.preventDefault();
        setDragOver(false);
        const files = Array.from(e.dataTransfer.files);
        if (files.length) onDropFiles(files);
      }}
    >
      <div className="relative mx-auto" style={{ width: stageW, height: stageH }}>
        <Stage
          width={stageW}
          height={stageH}
          scaleX={scale}
          scaleY={scale}
          onMouseDown={(e) => {
            if (e.target === e.target.getStage() || e.target.name() === 'bg') onSelect(null);
          }}
          onTouchStart={(e) => {
            if (e.target === e.target.getStage() || e.target.name() === 'bg') onSelect(null);
          }}
          aria-label="Design canvas"
        >
          <KLayer>
            {shape ? (
              <Group name="bg">
                {shape.body.map((d, i) => (
                  <Path key={`b${i}`} name="bg" data={d} fill={colorHex} stroke="rgba(0,0,0,.18)" strokeWidth={1.5} lineJoin="round" />
                ))}
                {shape.trims?.map((t, i) => (
                  <Path key={`t${i}`} name="bg" data={t.d} fill={t.fill.startsWith('var(') ? colorHex : t.fill} stroke="rgba(0,0,0,.15)" strokeWidth={1.2} />
                ))}
                {shape.body.map((d, i) => (
                  <Path
                    key={`s${i}`}
                    name="bg"
                    data={d}
                    fillLinearGradientStartPoint={{ x: 0, y: 0 }}
                    fillLinearGradientEndPoint={{ x: MOCKUP_W, y: MOCKUP_H }}
                    fillLinearGradientColorStops={[0, 'rgba(255,255,255,0.18)', 0.5, 'rgba(255,255,255,0)', 1, 'rgba(0,0,0,0.16)']}
                  />
                ))}
                {shape.details.map((d, i) => (
                  <Path key={`d${i}`} name="bg" data={d} stroke={detailStroke} strokeWidth={2} lineCap="round" listening={false} />
                ))}
              </Group>
            ) : null}
            {viewAreas.map((a) => {
              const b = boxes[a.id];
              return <Rect key={a.id} name="bg" x={b.x} y={b.y} width={b.w} height={b.h} stroke={ink} opacity={0.55} strokeWidth={1.2} dash={[6, 5]} cornerRadius={4} />;
            })}
          </KLayer>
          <KLayer>
            {viewAreas.map((a) => {
              const b = boxes[a.id];
              return layers
                .filter((l) => l.printAreaId === a.id && !l.hidden)
                .map((l) => (
                  <LayerNode
                    key={l.id}
                    layer={l}
                    box={b}
                    scale={scale}
                    selected={l.id === selectedId}
                    registerNode={(n) => (nodes.current[l.id] = n)}
                    onSelect={() => onSelect(l.id)}
                    onDragMove={(e) => onDragMove(e, l, b)}
                    onDragEnd={(e) => {
                      setGuides({ v: false, h: false });
                      toInches(e.currentTarget as unknown as Konva.Group, l, b, true);
                    }}
                    onTransform={(e) => toInches(e.currentTarget as unknown as Konva.Group, l, b, false)}
                    onTransformEnd={(e) => toInches(e.currentTarget as unknown as Konva.Group, l, b, true)}
                  />
                ));
            })}
            {viewAreas.map((a) => {
              const b = boxes[a.id];
              return (
                <Group key={`g-${a.id}`} listening={false}>
                  {guides.v ? <Line points={[b.x + b.w / 2, b.y - 8, b.x + b.w / 2, b.y + b.h + 8]} stroke="#FF3D8B" strokeWidth={1} dash={[4, 3]} /> : null}
                  {guides.h ? <Line points={[b.x - 8, b.y + b.h / 2, b.x + b.w + 8, b.y + b.h / 2]} stroke="#FF3D8B" strokeWidth={1} dash={[4, 3]} /> : null}
                </Group>
              );
            })}
            <Transformer
              ref={trRef}
              rotateEnabled
              keepRatio={selected ? selected.kind !== 'text' : true}
              enabledAnchors={selected && selected.kind === 'text' ? ['top-left', 'top-right', 'bottom-left', 'bottom-right', 'middle-left', 'middle-right'] : ['top-left', 'top-right', 'bottom-left', 'bottom-right']}
              anchorSize={Math.max(8, 10 / scale)}
              anchorCornerRadius={3}
              borderStroke="#6D4AFF"
              anchorStroke="#6D4AFF"
              rotationSnaps={[0, 45, 90, 135, 180, 225, 270, 315]}
              boundBoxFunc={(oldBox, newBox) => (Math.abs(newBox.width) < 10 * scale || Math.abs(newBox.height) < 10 * scale ? oldBox : newBox)}
            />
          </KLayer>
        </Stage>

        {/* HTML overlays: DPI chips and size tier labels */}
        {viewAreas.map((a) => {
          const b = boxes[a.id];
          const spec = areaTier(a.id);
          return (
            <React.Fragment key={`o-${a.id}`}>
              {layers
                .filter((l) => l.printAreaId === a.id && !l.hidden && !isVectorLayer(l, designs))
                .map((l) => {
                  const { dpi } = layerDpi(l, false);
                  if (dpi === null) return null;
                  const left = Math.min(stageW - 90, Math.max(2, (b.x + l.x * b.ppi) * scale));
                  const top = Math.min(stageH - 26, Math.max(2, (b.y + (l.y + l.heightIn) * b.ppi) * scale + 4));
                  return (
                    <div key={`dpi-${l.id}`} className="absolute" style={{ left, top }}>
                      <DpiChip dpi={dpi} />
                    </div>
                  );
                })}
              {spec ? (
                <div className="absolute -translate-x-1/2" style={{ left: (b.x + b.w / 2) * scale, top: Math.min(stageH - 28, (b.y + b.h) * scale + 6) }}>
                  <Tip content={`${TIER_LABEL[spec.tier]}: ${TIER_RULE[spec.tier]}. Your artwork is ${spec.widthIn} x ${spec.heightIn} in, bigger prints cost more.`}>
                    <button type="button" className="whitespace-nowrap rounded-full bg-black/75 px-2.5 py-1 text-[11px] font-semibold text-white shadow-s1 backdrop-blur" aria-label={`${TIER_LABEL[spec.tier]}, ${TIER_RULE[spec.tier]}`}>
                      {TIER_LABEL[spec.tier]} · {spec.widthIn} x {spec.heightIn} in
                    </button>
                  </Tip>
                </div>
              ) : null}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

interface LayerNodeProps {
  layer: Layer;
  box: AreaBox;
  scale: number;
  selected: boolean;
  registerNode: (n: Konva.Group | null) => void;
  onSelect: () => void;
  onDragMove: (e: KonvaEventObject<DragEvent>) => void;
  onDragEnd: (e: KonvaEventObject<DragEvent>) => void;
  onTransform: (e: KonvaEventObject<Event>) => void;
  onTransformEnd: (e: KonvaEventObject<Event>) => void;
}

function LayerContent({ layer: l, w, h }: { layer: Layer; w: number; h: number }) {
  const img = useHtmlImage(l.kind === 'text' ? undefined : l.src);
  if (l.kind === 'text') {
    const fs = h * 0.8;
    const ls = (l.letterSpacing ?? 0) * (h / 40);
    const family = fontCanvas(l.font);
    const natural = measureText(l.text ?? '', l.font, fs, ls);
    const sx = natural > 0 ? (w * 0.98) / natural : 1;
    return (
      <KText
        text={l.text ?? ''}
        fontFamily={family}
        fontStyle="bold"
        fontSize={fs}
        letterSpacing={ls}
        fill={l.fill ?? '#FFFFFF'}
        stroke={l.outline ?? undefined}
        strokeWidth={l.outline ? Math.max(1, h * 0.04) : 0}
        fillAfterStrokeEnabled
        x={w * 0.01}
        y={(h - fs) / 2}
        scaleX={sx}
        wrap="none"
      />
    );
  }
  if (!img) return <Rect width={w} height={h} fill="rgba(128,128,128,.2)" />;
  return <KImage image={img} width={w} height={h} />;
}

function LayerNode({ layer: l, box, scale, selected, registerNode, onSelect, onDragMove, onDragEnd, onTransform, onTransformEnd }: LayerNodeProps) {
  const w = l.widthIn * box.ppi;
  const h = l.heightIn * box.ppi;
  const cx = box.x + (l.x + l.widthIn / 2) * box.ppi;
  const cy = box.y + (l.y + l.heightIn / 2) * box.ppi;
  const common = { x: cx, y: cy, offsetX: w / 2, offsetY: h / 2, rotation: l.rotation };
  const setCursor = (e: KonvaEventObject<MouseEvent>, c: string) => {
    const st = e.target.getStage();
    if (st) st.container().style.cursor = c;
  };
  const interactive = (
    <Group
      ref={registerNode}
      {...common}
      draggable={!l.locked}
      opacity={l.outOfBounds ? 0.3 : 1}
      onMouseDown={onSelect}
      onTap={onSelect}
      onDragStart={onSelect}
      onDragMove={onDragMove}
      onDragEnd={onDragEnd}
      onTransform={onTransform}
      onTransformEnd={onTransformEnd}
      onMouseEnter={(e) => setCursor(e, l.locked ? 'not-allowed' : 'move')}
      onMouseLeave={(e) => setCursor(e, 'default')}
    >
      <LayerContent layer={l} w={w} h={h} />
      {l.outOfBounds ? <Rect width={w} height={h} stroke="#EF4444" strokeWidth={2 / Math.max(0.5, scale)} listening={false} /> : null}
      {selected && l.locked ? <Rect width={w} height={h} stroke="#6D4AFF" dash={[4, 4]} strokeWidth={1.5} listening={false} /> : null}
    </Group>
  );
  if (!l.outOfBounds) return interactive;
  return (
    <>
      {interactive}
      <Group clipX={box.x} clipY={box.y} clipWidth={box.w} clipHeight={box.h} listening={false}>
        <Group {...common}>
          <LayerContent layer={l} w={w} h={h} />
        </Group>
      </Group>
      <Group {...common} listening={false}>
        <Rect width={w} height={h} stroke="#EF4444" strokeWidth={2 / Math.max(0.5, scale)} />
      </Group>
    </>
  );
}
