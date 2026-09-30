'use client';
import * as React from 'react';
import { toast } from 'sonner';
import { ArrowDown, ArrowUp, Copy, Eye, EyeOff, GripVertical, Lock, Maximize2, Trash2, Type, Unlock, AlignHorizontalJustifyCenter, AlignVerticalJustifyCenter } from 'lucide-react';
import { layerDpi } from '@/lib/dpi';
import { VIEW_LABEL } from '@/lib/mockups';
import type { Layer } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tip } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/components/ui/cn';
import { EmptyState } from '@/components/shared/bits';
import { useCustomizer } from './model';
import { fitInside, isVectorLayer, layerName, newLayerId, round3 } from './draft';
import { DpiChip } from './DpiMeter';

function NumField({ label, value, onChange, step = 0.1, suffix, min, max, disabled }: { label: string; value: number; onChange: (v: number) => void; step?: number; suffix: string; min?: number; max?: number; disabled?: boolean }) {
  const id = React.useId();
  const [text, setText] = React.useState(String(Math.round(value * 100) / 100));
  React.useEffect(() => setText(String(Math.round(value * 100) / 100)), [value]);
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-xs font-medium text-muted">
        {label}
      </label>
      <div className="relative">
        <Input
          id={id}
          type="number"
          inputMode="decimal"
          step={step}
          min={min}
          max={max}
          disabled={disabled}
          value={text}
          className="h-10 pr-8 tabular-nums"
          onChange={(e) => {
            setText(e.target.value);
            const n = parseFloat(e.target.value);
            if (Number.isFinite(n)) onChange(min !== undefined ? Math.max(min, max !== undefined ? Math.min(max, n) : n) : n);
          }}
        />
        <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted">{suffix}</span>
      </div>
    </div>
  );
}

export function LayersPanel({ compact }: { compact?: boolean }) {
  const { draft, setLayers, patchLayer, selectedId, setSelectedId, product, state, setView } = useCustomizer();
  const designs = state.designs;
  const layers = draft.customization.layers;
  const ordered = [...layers].reverse(); // top-most first
  const [dragId, setDragId] = React.useState<string | null>(null);
  const [overId, setOverId] = React.useState<string | null>(null);
  const selected = layers.find((l) => l.id === selectedId) ?? null;
  const area = selected ? product.printAreas.find((a) => a.id === selected.printAreaId) : null;

  const select = (l: Layer) => {
    setSelectedId(l.id);
    const a = product.printAreas.find((x) => x.id === l.printAreaId);
    if (a) setView(a.view);
  };
  const move = (id: string, dir: 1 | -1) =>
    setLayers((ls) => {
      const i = ls.findIndex((l) => l.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= ls.length) return ls;
      const next = [...ls];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  const reorderTo = (id: string, targetId: string) =>
    setLayers((ls) => {
      const from = ls.findIndex((l) => l.id === id);
      const to = ls.findIndex((l) => l.id === targetId);
      if (from < 0 || to < 0 || from === to) return ls;
      const next = [...ls];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  const duplicate = (l: Layer) => {
    const copy: Layer = { ...l, id: newLayerId(), x: round3(l.x + 0.4), y: round3(l.y + 0.4), locked: false };
    setLayers((ls) => {
      const i = ls.findIndex((x) => x.id === l.id);
      const next = [...ls];
      next.splice(i + 1, 0, copy);
      return next;
    });
    setSelectedId(copy.id);
  };
  const remove = (l: Layer) => {
    setLayers((ls) => ls.filter((x) => x.id !== l.id));
    if (selectedId === l.id) setSelectedId(null);
    toast(`${layerName(l, designs)} removed`, { description: 'Press Ctrl+Z to bring it back.' });
  };

  const setWidth = (l: Layer, w: number) => {
    const ratio = l.heightIn / l.widthIn || 1;
    patchLayer(l.id, { widthIn: round3(Math.max(0.2, w)), heightIn: round3(Math.max(0.2, w) * ratio), fontSize: l.kind === 'text' ? Math.round(Math.max(0.2, w) * ratio * 32) : l.fontSize }, { coalesce: `${l.id}-w` });
  };

  if (!layers.length)
    return <EmptyState kind="shirt" title="No layers yet" body="Upload an image, add text or pick a design. Everything you add shows up here." className={compact ? 'py-6' : undefined} />;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-display text-base font-semibold">Layers</h3>
        <p className="text-xs text-muted">Top of the list prints on top. Drag to reorder.</p>
      </div>
      <ul className="space-y-1.5" aria-label="Layers">
        {ordered.map((l, idx) => {
          const a = product.printAreas.find((x) => x.id === l.printAreaId);
          const dpi = layerDpi(l, isVectorLayer(l, designs));
          const isSel = l.id === selectedId;
          return (
            <li
              key={l.id}
              draggable
              onDragStart={(e) => {
                setDragId(l.id);
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', l.id);
              }}
              onDragOver={(e) => {
                if (!dragId) return;
                e.preventDefault();
                setOverId(l.id);
              }}
              onDragLeave={() => setOverId((o) => (o === l.id ? null : o))}
              onDrop={(e) => {
                e.preventDefault();
                if (dragId) reorderTo(dragId, l.id);
                setDragId(null);
                setOverId(null);
              }}
              onDragEnd={() => {
                setDragId(null);
                setOverId(null);
              }}
              className={cn(
                'rounded-input border bg-surface p-1.5 transition-colors',
                isSel ? 'border-accent bg-accent-soft' : 'border-border',
                overId === l.id && dragId !== l.id && 'border-dashed border-accent',
                l.hidden && 'opacity-60',
              )}
            >
              <div className="flex items-center gap-1.5">
              <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-muted" aria-hidden />
              <button type="button" onClick={() => select(l)} className="flex min-h-11 min-w-0 flex-1 items-center gap-2 text-left" aria-pressed={isSel} aria-label={`Select ${layerName(l, designs)}`}>
                <span className="checker grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-lg border border-border">
                  {l.kind === 'text' ? (
                    <Type className="h-4 w-4" style={{ color: l.fill }} />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={l.src} alt="" className="max-h-full max-w-full object-contain" />
                  )}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{layerName(l, designs)}</span>
                  <span className="flex items-center gap-1 text-[11px] text-muted">
                    {a ? VIEW_LABEL[a.view] : 'Unknown area'}
                    {l.outOfBounds ? <Badge tone="danger" className="px-1.5 py-0 text-[10px]">Outside</Badge> : null}
                    {dpi.dpi !== null && dpi.level !== 'good' ? <DpiChip dpi={dpi.dpi} className="px-1.5 py-0 text-[10px] shadow-none" /> : null}
                  </span>
                </span>
              </button>
              </div>
              <div className="flex items-center justify-end border-t border-border pt-1">
                <Button variant="ghost" size="icon-sm" aria-label="Move up" disabled={idx === 0} onClick={() => move(l.id, 1)}>
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon-sm" aria-label="Move down" disabled={idx === ordered.length - 1} onClick={() => move(l.id, -1)}>
                  <ArrowDown className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon-sm" aria-label={l.locked ? 'Unlock layer' : 'Lock layer'} aria-pressed={!!l.locked} onClick={() => patchLayer(l.id, { locked: !l.locked })}>
                  {l.locked ? <Lock className="h-4 w-4 text-accent-text" /> : <Unlock className="h-4 w-4" />}
                </Button>
                <Button variant="ghost" size="icon-sm" aria-label={l.hidden ? 'Show layer' : 'Hide layer'} aria-pressed={!!l.hidden} onClick={() => patchLayer(l.id, { hidden: !l.hidden })}>
                  {l.hidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                <Button variant="ghost" size="icon-sm" aria-label="Duplicate layer" onClick={() => duplicate(l)}>
                  <Copy className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon-sm" aria-label="Delete layer" onClick={() => remove(l)} className="text-danger">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </li>
          );
        })}
      </ul>

      {selected && area ? (
        <div className="space-y-3 rounded-card border border-border bg-surface-2 p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0 text-sm font-semibold">
              <span className="block truncate">Position: {layerName(selected, designs)}</span>
            </div>
            {selected.locked ? <Badge tone="accent">Locked</Badge> : null}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <NumField label="X from left" suffix="in" value={selected.x} disabled={selected.locked} onChange={(v) => patchLayer(selected.id, { x: round3(v) }, { coalesce: `${selected.id}-x` })} />
            <NumField label="Y from top" suffix="in" value={selected.y} disabled={selected.locked} onChange={(v) => patchLayer(selected.id, { y: round3(v) }, { coalesce: `${selected.id}-y` })} />
            <NumField label="Width" suffix="in" min={0.2} max={40} value={selected.widthIn} disabled={selected.locked} onChange={(v) => setWidth(selected, v)} />
            <NumField label="Rotation" suffix="deg" step={1} min={-360} max={360} value={selected.rotation} disabled={selected.locked} onChange={(v) => patchLayer(selected.id, { rotation: v }, { coalesce: `${selected.id}-r` })} />
          </div>
          <p className="text-xs text-muted tabular-nums">
            Size {selected.widthIn.toFixed(2)} x {selected.heightIn.toFixed(2)} in. Print area {area.widthIn} x {area.heightIn} in. Arrow keys nudge 0.1 in, Shift for 1 in.
          </p>
          <div className="flex flex-wrap gap-1.5">
            <Button variant="secondary" size="sm" disabled={selected.locked} onClick={() => patchLayer(selected.id, { x: round3((area.widthIn - selected.widthIn) / 2) })}>
              <AlignHorizontalJustifyCenter className="h-4 w-4" /> Center across
            </Button>
            <Button variant="secondary" size="sm" disabled={selected.locked} onClick={() => patchLayer(selected.id, { y: round3((area.heightIn - selected.heightIn) / 2) })}>
              <AlignVerticalJustifyCenter className="h-4 w-4" /> Center down
            </Button>
            <Tip content={selected.outOfBounds ? 'Shrink and move it inside the dashed box' : 'Already inside the print area'}>
              <span>
                <Button variant={selected.outOfBounds ? 'primary' : 'secondary'} size="sm" disabled={selected.locked || !selected.outOfBounds} onClick={() => patchLayer(selected.id, fitInside(selected, area))}>
                  <Maximize2 className="h-4 w-4" /> Fit inside
                </Button>
              </span>
            </Tip>
          </div>
        </div>
      ) : (
        <p className="text-xs text-muted">Select a layer to move it with numbers instead of dragging.</p>
      )}
    </div>
  );
}
