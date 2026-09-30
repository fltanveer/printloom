'use client';
import * as React from 'react';
import { toast } from 'sonner';
import { MousePointerClick, Pencil, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch, Checkbox } from '@/components/ui/switch';
import { Label } from '@/components/ui/input';
import { Tip } from '@/components/ui/tooltip';
import { cn } from '@/components/ui/cn';
import { MoneyText } from '@/components/shared/MoneyText';
import { NumInput, type Mutate } from './fields';
import type { BaseProduct, Offering, Variant } from '@/lib/types';

const key = (c: string, s: string) => `${c}__${s}`;

export function ensureVariant(o: Offering, vendorId: string, product: BaseProduct, color: string, size: string): Variant {
  let v = o.variants.find((x) => x.color === color && x.size === size);
  if (!v) {
    v = {
      id: `${o.id}_${color}_${size}_${Math.random().toString(36).slice(2, 6)}`.replace(/\s+/g, '-'),
      color,
      size,
      enabled: false,
      stock: 'unlimited',
      sku: `${vendorId.toUpperCase()}-${product.category.slice(0, 3).toUpperCase()}-${color.slice(0, 3).toUpperCase()}-${size.replace(/\s+/g, '')}`,
    };
    o.variants.push(v);
  }
  return v;
}

export function VariantMatrix({ draft, product, mutate }: { draft: Offering; product: BaseProduct; mutate: Mutate }) {
  const colors = draft.colorGroups.flatMap((g) => g.colors.map((c) => ({ ...c, group: g.name })));
  const sizes = product.sizes;
  const [selectMode, setSelectMode] = React.useState(false);
  const [sel, setSel] = React.useState<Set<string>>(new Set());
  const [bulkStock, setBulkStock] = React.useState<number | undefined>(50);
  const [bulkUnlimited, setBulkUnlimited] = React.useState(false);
  const [bulkPrice, setBulkPrice] = React.useState<number | undefined>(undefined);

  const find = (c: string, s: string) => draft.variants.find((v) => v.color === c && v.size === s);
  const edit = (c: string, s: string, fn: (v: Variant) => void) => mutate((o) => fn(ensureVariant(o, draft.vendorId, product, c, s)));
  const forCells = (cells: [string, string][], fn: (v: Variant) => void) => mutate((o) => cells.forEach(([c, s]) => fn(ensureVariant(o, draft.vendorId, product, c, s))));
  const selCells = (): [string, string][] => [...sel].map((k) => k.split('__') as [string, string]);

  const toggleSel = (c: string, s: string) =>
    setSel((prev) => {
      const n = new Set(prev);
      const k = key(c, s);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });

  const rowAll = (c: string) => sizes.every((s) => find(c, s)?.enabled);
  const colAll = (s: string) => colors.every((c) => find(c.name, s)?.enabled);
  const overrides = draft.variants.filter((v) => v.priceOverride !== undefined).length;

  if (!colors.length) return <p className="text-sm text-muted">Add a color above to build your size grid.</p>;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant={selectMode ? 'primary' : 'secondary'} size="sm" onClick={() => { setSelectMode((m) => !m); setSel(new Set()); }} aria-pressed={selectMode}>
          {selectMode ? <MousePointerClick className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
          {selectMode ? 'Selecting cells' : 'Select cells for bulk edit'}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          disabled={!overrides}
          onClick={() => {
            mutate((o) => o.variants.forEach((v) => delete v.priceOverride));
            toast.success('All price overrides cleared. Cells use your pricing rules again.');
          }}
        >
          Clear all overrides ({overrides})
        </Button>
        <span className="ml-auto flex items-center gap-3 text-xs text-muted">
          <span className="flex items-center gap-1"><i className="h-3 w-3 rounded bg-surface-2 ring-1 ring-border" /> Off</span>
          <span className="flex items-center gap-1"><i className="h-3 w-3 rounded bg-success/15 ring-1 ring-success/40" /> On</span>
          <span className="flex items-center gap-1"><i className="h-3 w-3 rounded bg-accent-soft ring-1 ring-accent" /> Custom price</span>
        </span>
      </div>

      {selectMode ? (
        <div className="flex flex-wrap items-end gap-2 rounded-card border border-accent/40 bg-accent-soft/50 p-3">
          <span className="w-full text-sm font-semibold">{sel.size} selected</span>
          <Button size="sm" variant="secondary" disabled={!sel.size} onClick={() => forCells(selCells(), (v) => (v.enabled = true))}>Enable</Button>
          <Button size="sm" variant="secondary" disabled={!sel.size} onClick={() => forCells(selCells(), (v) => (v.enabled = false))}>Disable</Button>
          <div className="flex items-end gap-2">
            <div className="w-24">
              <Label className="text-xs">Stock</Label>
              <NumInput value={bulkStock} onChange={setBulkStock} min={0} disabled={bulkUnlimited} className="h-9" aria-label="Stock for selection" />
            </div>
            <label className="flex h-9 items-center gap-1.5 text-xs">
              <Checkbox checked={bulkUnlimited} onCheckedChange={(v) => setBulkUnlimited(!!v)} aria-label="Unlimited stock" /> Unlimited
            </label>
            <Button
              size="sm"
              disabled={!sel.size || (!bulkUnlimited && (bulkStock === undefined || bulkStock < 0))}
              onClick={() => {
                forCells(selCells(), (v) => (v.stock = bulkUnlimited ? 'unlimited' : Math.round(bulkStock ?? 0)));
                toast.success(`Stock set for ${sel.size} cells`);
              }}
            >
              Set stock
            </Button>
          </div>
          <div className="flex items-end gap-2">
            <div className="w-28">
              <Label className="text-xs">Price override</Label>
              <NumInput value={bulkPrice} onChange={setBulkPrice} min={1} allowEmpty prefix="৳" className="h-9" aria-label="Price override for selection" />
            </div>
            <Button size="sm" variant="secondary" disabled={!sel.size || !bulkPrice || bulkPrice <= 0} onClick={() => forCells(selCells(), (v) => (v.priceOverride = bulkPrice))}>
              Set price
            </Button>
            <Button size="sm" variant="ghost" disabled={!sel.size} onClick={() => forCells(selCells(), (v) => delete v.priceOverride)}>
              Clear overrides
            </Button>
          </div>
          <Button size="sm" variant="ghost" className="ml-auto" disabled={!sel.size} onClick={() => setSel(new Set())}>
            <X className="h-4 w-4" /> Clear selection
          </Button>
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-card border border-border">
        <table className="border-separate border-spacing-1 text-xs">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-surface p-1 text-left text-muted">Color / size</th>
              {sizes.map((s) => (
                <th key={s} className="p-0.5">
                  <Tip content={colAll(s) ? `Turn off ${s} for every color` : `Turn on ${s} for every color`}>
                    <button
                      type="button"
                      onClick={() => {
                        const on = !colAll(s);
                        forCells(colors.map((c) => [c.name, s] as [string, string]), (v) => (v.enabled = on));
                      }}
                      className="h-9 w-full min-w-[64px] rounded-lg bg-surface-2 px-2 font-semibold hover:bg-accent-soft"
                    >
                      {s}
                    </button>
                  </Tip>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {colors.map((c) => (
              <tr key={c.name}>
                <th className="sticky left-0 z-10 bg-surface p-0.5 text-left font-normal">
                  <Tip content={rowAll(c.name) ? `Turn off every size in ${c.name}` : `Turn on every size in ${c.name}`}>
                    <button
                      type="button"
                      onClick={() => {
                        const on = !rowAll(c.name);
                        forCells(sizes.map((s) => [c.name, s] as [string, string]), (v) => (v.enabled = on));
                      }}
                      className="flex h-14 w-36 items-center gap-2 rounded-lg px-2 text-left hover:bg-surface-2"
                    >
                      <span className="h-5 w-5 shrink-0 rounded-full border border-border" style={{ background: c.hex }} aria-hidden />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold">{c.name}</span>
                        <span className="block text-[11px] text-muted">{c.group}</span>
                      </span>
                    </button>
                  </Tip>
                </th>
                {sizes.map((s) => {
                  const v = find(c.name, s);
                  const on = !!v?.enabled;
                  const over = v?.priceOverride !== undefined;
                  const selected = sel.has(key(c.name, s));
                  const low = v && v.stock !== 'unlimited' && v.stock <= 10;
                  const cls = cn(
                    'flex h-14 w-full min-w-[64px] flex-col items-center justify-center rounded-lg border text-[11px] leading-tight transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                    !on && 'border-border bg-surface-2 text-muted',
                    on && !over && 'border-success/40 bg-success/10',
                    on && over && 'border-accent bg-accent-soft text-accent-text',
                    selected && 'ring-2 ring-accent ring-offset-1 ring-offset-surface',
                  );
                  const body = (
                    <>
                      <span className="font-semibold">{on ? 'On' : 'Off'}</span>
                      <span className={cn('tabular-nums', low && on && 'font-semibold text-danger')}>{v ? (v.stock === 'unlimited' ? '∞' : `${v.stock} left`) : '∞'}</span>
                      {over ? <MoneyText value={v!.priceOverride!} className="font-semibold" /> : null}
                    </>
                  );
                  const label = `${c.name} ${s}: ${on ? 'on' : 'off'}${v && v.stock !== 'unlimited' ? `, ${v.stock} in stock` : ''}${over ? ', custom price' : ''}`;
                  return (
                    <td key={s} className="p-0">
                      {selectMode ? (
                        <button type="button" className={cls} onClick={() => toggleSel(c.name, s)} aria-pressed={selected} aria-label={label}>
                          {body}
                        </button>
                      ) : (
                        <Popover>
                          <PopoverTrigger asChild>
                            <button type="button" className={cls} aria-label={`Edit ${label}`}>
                              {body}
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-72 space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold">
                                {c.name} / {s}
                              </span>
                              <label className="flex items-center gap-2 text-sm">
                                Enabled
                                <Switch checked={on} onCheckedChange={(x) => edit(c.name, s, (vv) => (vv.enabled = x))} aria-label="Enabled" />
                              </label>
                            </div>
                            <div>
                              <Label className="text-xs">Stock</Label>
                              <div className="flex items-center gap-2">
                                <NumInput
                                  value={v && v.stock !== 'unlimited' ? v.stock : undefined}
                                  allowEmpty
                                  min={0}
                                  placeholder="Unlimited"
                                  disabled={!v || v.stock === 'unlimited'}
                                  onChange={(n) => edit(c.name, s, (vv) => (vv.stock = n === undefined ? 0 : Math.max(0, Math.round(n))))}
                                  aria-label="Stock"
                                />
                                <label className="flex shrink-0 items-center gap-1.5 text-xs">
                                  <Checkbox checked={!v || v.stock === 'unlimited'} onCheckedChange={(x) => edit(c.name, s, (vv) => (vv.stock = x ? 'unlimited' : 20))} aria-label="Unlimited" />
                                  Unlimited
                                </label>
                              </div>
                            </div>
                            <div>
                              <Label className="text-xs">Price override (garment only)</Label>
                              <NumInput
                                value={v?.priceOverride}
                                allowEmpty
                                min={1}
                                prefix="৳"
                                placeholder="Use pricing rules"
                                onChange={(n) => edit(c.name, s, (vv) => (n === undefined || n <= 0 ? delete vv.priceOverride : (vv.priceOverride = n)))}
                                aria-label="Price override"
                              />
                              <p className="mt-1 text-[11px] text-muted">Replaces base price plus size and color upcharges for this cell. Print is added on top.</p>
                            </div>
                            {v ? <p className="text-[11px] text-muted">SKU {v.sku}</p> : null}
                          </PopoverContent>
                        </Popover>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted">Tip: click a color name or a size to turn the whole row or column on or off. Click a cell to edit stock and price.</p>
    </div>
  );
}
