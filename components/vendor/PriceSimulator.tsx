'use client';
import * as React from 'react';
import { AlertTriangle, Calculator, Info } from 'lucide-react';
import { Label, NativeSelect } from '@/components/ui/input';
import { Switch, Checkbox } from '@/components/ui/switch';
import { Tip } from '@/components/ui/tooltip';
import { cn } from '@/components/ui/cn';
import { PriceBreakdown } from '@/components/shared/PriceBreakdown';
import { MoneyText } from '@/components/shared/MoneyText';
import { MarketPositionBar } from './MarketPositionBar';
import { NumInput } from './fields';
import { marketQuotes, median, simulate, STITCH_LABEL, tiersFor, ZONE_LABEL, type SimArea, type SimConfig } from './helpers';
import { METHOD_LABEL, TIER_LABEL } from '@/lib/pricing';
import type { AppData, BaseProduct, Offering, Vendor, ZoneKey } from '@/lib/types';

function initialConfig(draft: Offering, product: BaseProduct): SimConfig {
  const light = draft.colorGroups.find((g) => g.name === 'Light')?.colors[0]?.name;
  const firstEnabled = draft.variants.find((v) => v.enabled)?.color;
  const color = light && draft.variants.some((v) => v.color === light && v.enabled) ? light : firstEnabled ?? draft.colorGroups[0]?.colors[0]?.name ?? '';
  const size = product.sizes.includes('M') ? 'M' : product.sizes[0];
  const area = product.printAreas[0];
  const tier = area.sizeTiers.includes('medium') ? 'medium' : area.sizeTiers[0];
  return { color, sizes: { [size]: Math.max(1, draft.pricing.moq) }, method: draft.methods[0] ?? product.allowedMethods[0], areas: [{ areaId: area.id, tier, stitch: 'upTo5k' }], inkColors: 2, zone: 'same_city', rush: false };
}

export function PriceSimulator({ data, draft, product, vendor, dirty, className }: { data: AppData; draft: Offering; product: BaseProduct; vendor: Vendor; dirty: boolean; className?: string }) {
  const [cfg, setCfg] = React.useState<SimConfig>(() => initialConfig(draft, product));
  const [cost, setCost] = React.useState<number | undefined>(() => Math.round(draft.pricing.basePrice * 0.6));

  // keep the config valid when the draft changes (color or method removed)
  const eff: SimConfig = React.useMemo(() => {
    const colors = draft.colorGroups.flatMap((g) => g.colors);
    const color = colors.some((c) => c.name === cfg.color) ? cfg.color : colors[0]?.name ?? '';
    const method = draft.methods.includes(cfg.method) ? cfg.method : draft.methods[0] ?? cfg.method;
    return { ...cfg, color, method };
  }, [cfg, draft.colorGroups, draft.methods]);

  const result = React.useMemo(() => simulate(data, draft, vendor, eff), [data, draft, vendor, eff]);
  const market = React.useMemo(() => marketQuotes(data, draft, vendor, eff), [data, draft, vendor, eff]);
  const q = result.quote;
  const qty = Object.values(eff.sizes).reduce((t, n) => t + (n || 0), 0);
  const med = median(market.map((m) => m.unit));

  const set = (patch: Partial<SimConfig>) => setCfg((c) => ({ ...c, ...patch }));
  const setArea = (areaId: string, patch: Partial<SimArea> | null) =>
    setCfg((c) => {
      const exists = c.areas.some((a) => a.areaId === areaId);
      if (patch === null) return { ...c, areas: c.areas.filter((a) => a.areaId !== areaId) };
      if (!exists) {
        const area = product.printAreas.find((a) => a.id === areaId)!;
        return { ...c, areas: [...c.areas, { areaId, tier: area.sizeTiers[0], stitch: 'upTo5k', ...patch }] };
      }
      return { ...c, areas: c.areas.map((a) => (a.areaId === areaId ? { ...a, ...patch } : a)) };
    });

  const warnings: string[] = [];
  if (q.available && med !== null && q.unitAvg > med * 1.4) warnings.push('More than 40% above the market median. Customers will likely pick another shop.');
  if (q.available && result.sub && cost !== undefined && cost > 0 && result.sub.split.vendor < cost * q.qty)
    warnings.push('Your payout is below your cost for this order. You would lose money on it.');

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center gap-2">
        <Calculator className="h-5 w-5 text-accent-text" />
        <h2 className="font-display text-lg font-semibold">Price simulator</h2>
      </div>
      {dirty ? (
        <p className="flex items-start gap-1.5 rounded-input bg-warning/10 p-2 text-xs text-amber-700 dark:text-amber-300">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /> Using your unsaved changes. Customers see these prices after you save.
        </p>
      ) : (
        <p className="text-xs text-muted">Exactly what a customer pays for this setup, from the same pricing engine.</p>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="sim-color" className="text-xs">Color</Label>
          <NativeSelect id="sim-color" value={eff.color} onChange={(e) => set({ color: e.target.value })}>
            {draft.colorGroups.map((g) => (
              <optgroup key={g.id} label={g.name}>
                {g.colors.map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </NativeSelect>
        </div>
        <div>
          <Label htmlFor="sim-zone" className="text-xs">Deliver to</Label>
          <NativeSelect id="sim-zone" value={eff.zone} onChange={(e) => set({ zone: e.target.value as ZoneKey })}>
            {(Object.keys(ZONE_LABEL) as ZoneKey[]).map((z) => (
              <option key={z} value={z}>
                {ZONE_LABEL[z]}
              </option>
            ))}
          </NativeSelect>
        </div>
      </div>

      <div>
        <Label className="text-xs">Method</Label>
        <div className="flex flex-wrap gap-1.5">
          {draft.methods.length ? (
            draft.methods.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => set({ method: m })}
                aria-pressed={eff.method === m}
                className={cn('h-9 rounded-full border px-3 text-sm font-medium', eff.method === m ? 'border-accent bg-accent text-white' : 'border-border hover:border-accent/60')}
              >
                {METHOD_LABEL[m]}
              </button>
            ))
          ) : (
            <span className="text-sm text-muted">No methods yet. Add one in Basics.</span>
          )}
        </div>
      </div>

      <div>
        <Label className="text-xs">Pieces per size</Label>
        <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-5 lg:grid-cols-3 xl:grid-cols-5">
          {product.sizes.map((s) => {
            const v = draft.variants.find((x) => x.color === eff.color && x.size === s);
            const off = !v || !v.enabled;
            return (
              <label key={s} className={cn('rounded-input border border-border p-1 text-center', off && 'opacity-50')}>
                <span className="block text-[11px] font-semibold">{s}</span>
                <NumInput
                  value={eff.sizes[s] ?? 0}
                  min={0}
                  className="h-8 px-1 text-center"
                  onChange={(n) => setCfg((c) => ({ ...c, sizes: { ...c.sizes, [s]: Math.max(0, Math.round(n ?? 0)) } }))}
                  aria-label={`${s} quantity${off ? ', not offered in this color' : ''}`}
                />
              </label>
            );
          })}
        </div>
        <p className="mt-1 text-xs text-muted">{qty} {qty === 1 ? 'piece' : 'pieces'} in total</p>
      </div>

      <div>
        <Label className="text-xs">Print areas</Label>
        <div className="space-y-1.5">
          {product.printAreas.map((a) => {
            const on = eff.areas.find((x) => x.areaId === a.id);
            return (
              <div key={a.id} className="flex flex-wrap items-center gap-2 rounded-input border border-border px-2 py-1.5">
                <label className="flex min-h-9 flex-1 items-center gap-2 text-sm">
                  <Checkbox checked={!!on} onCheckedChange={(v) => setArea(a.id, v ? {} : null)} aria-label={`Print on ${a.name}`} />
                  {a.name}
                </label>
                {on ? (
                  eff.method === 'embroidery' ? (
                    <NativeSelect value={on.stitch} onChange={(e) => setArea(a.id, { stitch: e.target.value as SimArea['stitch'] })} className="h-9 w-40 text-xs" aria-label={`${a.name} stitch count`}>
                      {(Object.keys(STITCH_LABEL) as SimArea['stitch'][]).map((k) => (
                        <option key={k} value={k}>
                          {STITCH_LABEL[k]}
                        </option>
                      ))}
                    </NativeSelect>
                  ) : (
                    <NativeSelect value={on.tier} onChange={(e) => setArea(a.id, { tier: e.target.value as SimArea['tier'] })} className="h-9 w-36 text-xs" aria-label={`${a.name} print size`}>
                      {tiersFor(a).map((t) => (
                        <option key={t} value={t}>
                          {TIER_LABEL[t]}
                        </option>
                      ))}
                    </NativeSelect>
                  )
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {eff.method === 'screen' ? (
          <div>
            <Label className="text-xs">Ink colors</Label>
            <NumInput value={eff.inkColors} min={1} max={10} onChange={(n) => set({ inkColors: Math.min(10, Math.max(1, Math.round(n ?? 1))) })} aria-label="Ink colors" />
          </div>
        ) : null}
        <div>
          <Label className="text-xs">Rush</Label>
          <Tip content={draft.production.rush.available ? null : 'Turn on rush in the Production tab first'}>
            <span className="flex h-11 items-center gap-2 text-sm">
              <Switch checked={eff.rush} disabled={!draft.production.rush.available} onCheckedChange={(v) => set({ rush: v })} aria-label="Rush order" />
              {draft.production.rush.available ? `+${draft.production.rush.feePct}%, ${draft.production.rush.days} days` : 'Off'}
            </span>
          </Tip>
        </div>
        <div>
          <Label className="text-xs">Your cost per piece</Label>
          <NumInput value={cost} min={0} allowEmpty prefix="৳" onChange={setCost} aria-label="Your cost per piece" />
        </div>
      </div>

      {q.available ? (
        <>
          <PriceBreakdown quote={q} shipping={result.sub?.shipping} split={result.sub?.split} showSplit defaultOpen title="Customer pays" />
          {result.sub ? (
            <div className="flex items-center justify-between rounded-card border border-accent/40 bg-accent-soft p-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-accent-text">Your payout</div>
                <div className="text-xs text-muted">After {data.settings.commissionPct}% Printloom commission, delivery included</div>
              </div>
              <MoneyText value={result.sub.split.vendor} animated className="font-display text-2xl font-bold" />
            </div>
          ) : null}
          {warnings.map((w) => (
            <p key={w} className="flex items-start gap-2 rounded-input border border-warning/40 bg-warning/10 p-2.5 text-sm text-amber-800 dark:text-amber-200">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {w}
            </p>
          ))}
          <div className="rounded-card border border-border bg-surface p-3">
            <div className="text-sm font-semibold">Market position, per piece</div>
            <MarketPositionBar others={market} mine={q.unitAvg} shopName={vendor.shopName} />
          </div>
        </>
      ) : (
        <div className="rounded-card border border-danger/30 bg-danger/5 p-3 text-sm">
          <div className="mb-1 flex items-center gap-2 font-semibold">
            <AlertTriangle className="h-4 w-4 text-danger" /> Customers can't order this setup
          </div>
          <ul className="list-disc space-y-0.5 pl-5 text-muted">
            {q.reasons.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
