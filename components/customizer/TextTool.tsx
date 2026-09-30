'use client';
import * as React from 'react';
import { AlignCenter, AlignLeft, AlignRight, Plus, Type } from 'lucide-react';
import { contrastInk, VIEW_LABEL } from '@/lib/mockups';
import type { Layer } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Tip } from '@/components/ui/tooltip';
import { cn } from '@/components/ui/cn';
import { useCustomizer } from './model';
import { FONTS, fontCss, loadFont, newLayerId, round3, textWidthIn } from './draft';

export const INK_PRESETS: { name: string; hex: string }[] = [
  { name: 'White', hex: '#FFFFFF' },
  { name: 'Black', hex: '#141414' },
  { name: 'Violet', hex: '#6D4AFF' },
  { name: 'Pink', hex: '#FF3D8B' },
  { name: 'Orange', hex: '#FF7A1A' },
  { name: 'Yellow', hex: '#FFE14D' },
  { name: 'Green', hex: '#16A34A' },
  { name: 'Blue', hex: '#3B82F6' },
  { name: 'Red', hex: '#EF4444' },
];

/** Recompute a text layer's width from its content, keeping it centered where it was. */
function withTextGeometry(l: Layer, patch: Partial<Layer>): Partial<Layer> {
  const n = { ...l, ...patch };
  const heightIn = n.heightIn;
  const widthIn = textWidthIn(n.text ?? '', n.font, heightIn, n.letterSpacing ?? 0);
  const cx = l.x + l.widthIn / 2;
  const cy = l.y + l.heightIn / 2;
  return { ...patch, widthIn, heightIn, x: round3(cx - widthIn / 2), y: round3(cy - heightIn / 2), fontSize: Math.round(heightIn * 32) };
}

export function TextTool() {
  const { draft, selectedId, addLayer, patchLayer, activeArea, colorHex } = useCustomizer();
  const layer = draft.customization.layers.find((l) => l.id === selectedId && l.kind === 'text') ?? null;
  const [newText, setNewText] = React.useState('');

  const add = async () => {
    const text = newText.trim() || 'Your text';
    const font = 'Space Grotesk';
    await loadFont(font);
    const heightIn = round3(Math.min(1.4, activeArea.heightIn * 0.3));
    const widthIn = Math.min(activeArea.widthIn * 0.9, textWidthIn(text, font, heightIn, 0));
    const h = widthIn < textWidthIn(text, font, heightIn, 0) ? round3(heightIn * (widthIn / textWidthIn(text, font, heightIn, 0))) : heightIn;
    const w = textWidthIn(text, font, h, 0);
    addLayer({
      id: newLayerId(),
      kind: 'text',
      text,
      font,
      fill: contrastInk(colorHex),
      fontSize: Math.round(h * 32),
      align: 'center',
      letterSpacing: 0,
      outline: null,
      printAreaId: activeArea.id,
      x: round3((activeArea.widthIn - w) / 2),
      y: round3(Math.max(0, activeArea.heightIn * 0.3 - h / 2)),
      widthIn: w,
      heightIn: h,
      rotation: 0,
      outOfBounds: false,
    });
    setNewText('');
  };

  const patch = (p: Partial<Layer>, key: string) => {
    if (!layer) return;
    patchLayer(layer.id, withTextGeometry(layer, p), { coalesce: `${layer.id}-${key}` });
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-display text-base font-semibold">Add text</h3>
        <p className="text-xs text-muted">Names, numbers, slogans. Goes on the {VIEW_LABEL[activeArea.view].toLowerCase()}.</p>
      </div>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void add();
        }}
      >
        <Input value={newText} onChange={(e) => setNewText(e.target.value)} placeholder="Type something" aria-label="New text" maxLength={60} />
        <Button type="submit" aria-label="Add text layer">
          <Plus className="h-4 w-4" /> Add
        </Button>
      </form>

      {layer ? (
        <div className="space-y-4 border-t border-border pt-4">
          <div>
            <Label htmlFor="text-edit">Edit selected text</Label>
            <Input id="text-edit" value={layer.text ?? ''} maxLength={60} onChange={(e) => patch({ text: e.target.value }, 'text')} />
          </div>
          <div>
            <div className="mb-1.5 text-sm font-medium">Font</div>
            <div className="grid grid-cols-2 gap-1.5">
              {FONTS.map((f) => (
                <button
                  key={f}
                  type="button"
                  aria-pressed={layer.font === f}
                  onClick={async () => {
                    await loadFont(f);
                    patch({ font: f }, 'font');
                  }}
                  className={cn('min-h-11 truncate rounded-input border px-2.5 text-left text-base transition-colors', layer.font === f ? 'border-accent bg-accent-soft' : 'border-border hover:border-customer/50')}
                  style={{ fontFamily: fontCss(f) }}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="mb-1.5 text-sm font-medium">Color</div>
            <div className="flex flex-wrap items-center gap-1.5">
              {INK_PRESETS.map((c) => (
                <Tip key={c.hex} content={c.name}>
                  <button
                    type="button"
                    aria-label={`Text color ${c.name}`}
                    aria-pressed={layer.fill?.toLowerCase() === c.hex.toLowerCase()}
                    onClick={() => patchLayer(layer.id, { fill: c.hex })}
                    className={cn('h-9 w-9 rounded-full border border-border', layer.fill?.toLowerCase() === c.hex.toLowerCase() && 'ring-2 ring-accent ring-offset-2 ring-offset-surface')}
                    style={{ background: c.hex }}
                  />
                </Tip>
              ))}
              <label className="relative grid h-9 w-9 cursor-pointer place-items-center overflow-hidden rounded-full border border-dashed border-border text-xs text-muted" title="Custom color">
                +
                <input type="color" aria-label="Custom text color" className="absolute inset-0 cursor-pointer opacity-0" value={layer.fill ?? '#ffffff'} onChange={(e) => patchLayer(layer.id, { fill: e.target.value }, { coalesce: `${layer.id}-fill` })} />
              </label>
            </div>
          </div>
          <div>
            <div className="mb-1.5 text-sm font-medium">Alignment</div>
            <div className="flex gap-1" role="group" aria-label="Alignment">
              {(
                [
                  ['left', AlignLeft],
                  ['center', AlignCenter],
                  ['right', AlignRight],
                ] as const
              ).map(([a, Icon]) => (
                <Button key={a} variant={(layer.align ?? 'center') === a ? 'soft' : 'ghost'} size="icon" aria-label={`Align ${a}`} aria-pressed={(layer.align ?? 'center') === a} onClick={() => patchLayer(layer.id, { align: a })}>
                  <Icon className="h-4 w-4" />
                </Button>
              ))}
            </div>
          </div>
          <div>
            <div className="mb-1.5 flex justify-between text-sm font-medium">
              <span>Size</span>
              <span className="tabular-nums text-muted">{layer.heightIn.toFixed(1)} in tall</span>
            </div>
            <Slider label="Text size" min={0.3} max={Math.min(8, activeArea.heightIn)} step={0.1} value={[layer.heightIn]} onValueChange={([v]) => patch({ heightIn: v }, 'size')} />
          </div>
          <div>
            <div className="mb-1.5 flex justify-between text-sm font-medium">
              <span>Letter spacing</span>
              <span className="tabular-nums text-muted">{layer.letterSpacing ?? 0}</span>
            </div>
            <Slider label="Letter spacing" min={-2} max={20} step={1} value={[layer.letterSpacing ?? 0]} onValueChange={([v]) => patch({ letterSpacing: v }, 'spacing')} />
          </div>
          <div className="flex items-center justify-between gap-3">
            <label htmlFor="outline-toggle" className="text-sm font-medium">
              Outline
            </label>
            <div className="flex items-center gap-2">
              {layer.outline ? (
                <input type="color" aria-label="Outline color" className="h-9 w-9 cursor-pointer rounded-full border border-border bg-transparent" value={layer.outline} onChange={(e) => patchLayer(layer.id, { outline: e.target.value }, { coalesce: `${layer.id}-outline` })} />
              ) : null}
              <Switch id="outline-toggle" checked={!!layer.outline} onCheckedChange={(on) => patchLayer(layer.id, { outline: on ? contrastInk(layer.fill ?? '#ffffff') : null })} />
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-2 rounded-input bg-surface-2 p-3 text-xs text-muted">
          <Type className="mt-0.5 h-4 w-4 shrink-0" />
          Select a text layer on the canvas or in Layers to change its font, color and size.
        </div>
      )}
    </div>
  );
}
