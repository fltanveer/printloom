'use client';
import * as React from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { AlertTriangle, ArrowRight, Check, Clock, Info, Layers3, Rocket, Scissors, Sparkles, Store, Truck, Wand2, Zap } from 'lucide-react';
import { METHOD_HINT, METHOD_LABEL } from '@/lib/pricing';
import { deliveryEstimate, matchForCustomization, methodReason, sizeReason, stockLeft } from '@/lib/selectors';
import { relativeDay } from '@/lib/dates';
import { VIEW_LABEL } from '@/lib/mockups';
import type { QualityTier } from '@/lib/types';
import { useStore } from '@/lib/store';
import type { SplitPlan } from './model';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/switch';
import { Tip } from '@/components/ui/tooltip';
import { cn } from '@/components/ui/cn';
import { MoneyText } from '@/components/shared/MoneyText';
import { PriceBreakdown } from '@/components/shared/PriceBreakdown';
import { Avatar, ColorSwatch, Rating, SizeChip } from '@/components/shared/bits';
import { useCustomizer, variantOk, type Warning } from './model';
import { QtyStepper, SizeBreakdownGrid } from './SizeBreakdownGrid';
import { cleanBreakdown, fitInside, totalQty } from './draft';
import { removeWhiteBackground } from './imageUtils';

export interface Gates {
  acceptedLowQuality: boolean;
  setAcceptedLowQuality: (v: boolean) => void;
  oobConfirmed: boolean;
  setOobConfirmed: (v: boolean) => void;
}

const QUALITY_LABEL: Record<QualityTier, string> = { basic: 'Basic', standard: 'Standard', premium: 'Premium' };

function Section({ title, children, aside, id }: { title: string; children: React.ReactNode; aside?: React.ReactNode; id?: string }) {
  return (
    <section className="space-y-2.5" aria-labelledby={id}>
      <div className="flex items-baseline justify-between gap-2">
        <h3 id={id} className="text-sm font-semibold">
          {title}
        </h3>
        {aside ? <div className="text-xs text-muted">{aside}</div> : null}
      </div>
      {children}
    </section>
  );
}

// ---------- quality ----------

function QualityFilter() {
  const { qualities, draft, update } = useCustomizer();
  if (qualities.length < 2) return null;
  const opts: (QualityTier | null)[] = [null, ...qualities];
  return (
    <Section title="Blank quality" aside="Shops use different blanks" id="q-quality">
      <div className="flex rounded-input bg-surface-2 p-1" role="radiogroup" aria-labelledby="q-quality">
        {opts.map((q) => {
          const active = draft.quality === q;
          return (
            <button
              key={q ?? 'all'}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => update((d) => ({ ...d, quality: q, pinnedOfferingId: q && d.pinnedOfferingId && offeringTier(d.pinnedOfferingId) !== q ? null : d.pinnedOfferingId }))}
              className={cn('min-h-10 flex-1 rounded-[10px] px-2 text-sm font-medium transition-colors', active ? 'bg-surface text-text shadow-s1' : 'text-muted hover:text-text')}
            >
              {q ? QUALITY_LABEL[q] : 'Any'}
            </button>
          );
        })}
      </div>
    </Section>
  );
}

function offeringTier(id: string): QualityTier | undefined {
  return useStore.getState().offerings[id]?.blank.qualityTier;
}

// ---------- colors ----------

function ColorPicker() {
  const { colors, draft, setColor, shopCount, state } = useCustomizer();
  const d = draft;
  const current = colors.find((c) => c.name === draft.customization.color);
  const pinned = d.pinnedOfferingId ? state.offerings[d.pinnedOfferingId] : null;
  return (
    <Section title="Color" aside={current ? `${current.name}, ${current.group}` : draft.customization.color} id="q-color">
      <div className="flex flex-wrap gap-1">
        {colors.map((c) => {
          const partial = c.vendorIds.length < shopCount;
          const missingAtPinned = pinned ? !pinned.variants.some((v) => v.color === c.name && v.enabled) : false;
          const hint = missingAtPinned ? `Not at ${state.vendors[pinned!.vendorId].shopName}` : partial ? `Available from ${c.vendorIds.length} of ${shopCount} shops` : undefined;
          return (
            <span key={c.name} className={cn(missingAtPinned && 'opacity-45')}>
              <ColorSwatch name={c.name} hex={c.hex} selected={c.name === draft.customization.color} hint={hint} onClick={() => setColor(c.name)} />
            </span>
          );
        })}
      </div>
      {current && current.vendorIds.length < shopCount ? (
        <p className="text-xs text-muted">
          {current.name} is available from {current.vendorIds.length} of {shopCount} shops.
        </p>
      ) : null}
      {!colors.length ? <p className="text-sm text-muted">No colors available right now.</p> : null}
    </Section>
  );
}

// ---------- methods ----------

function MethodPicker() {
  const { methods, draft, setMethod, state, product, update, inkEstimate } = useCustomizer();
  const color = draft.customization.color;
  const lock = draft.lockVendorId;
  const inks = draft.customization.inkColors ?? inkEstimate;
  const dtfOk = methods.includes('DTF') && !methodReason(state, product.id, color, 'DTF', lock);
  return (
    <Section title="Print method" id="q-method">
      <div className="space-y-1.5" role="radiogroup" aria-labelledby="q-method">
        {methods.map((m) => {
          const reason = methodReason(state, product.id, color, m, lock);
          const active = draft.method === m;
          const body = (
            <button
              type="button"
              role="radio"
              aria-checked={active}
              aria-disabled={!!reason}
              onClick={() => (reason ? toast(reason) : setMethod(m))}
              className={cn(
                'flex w-full items-start gap-3 rounded-input border p-3 text-left transition-colors',
                active ? 'border-accent bg-accent-soft' : 'border-border hover:border-customer/50',
                reason && 'cursor-not-allowed opacity-55 hover:border-border',
              )}
            >
              <span className={cn('mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border-2', active ? 'border-accent bg-accent' : 'border-border')}>{active ? <Check className="h-3 w-3 text-white" strokeWidth={3} /> : null}</span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold">{METHOD_LABEL[m]}</span>
                <span className="block text-xs text-muted">{reason ?? METHOD_HINT[m]}</span>
              </span>
            </button>
          );
          return <div key={m}>{body}</div>;
        })}
      </div>
      {draft.method === 'screen' ? (
        <div className="space-y-2 rounded-input border border-border bg-surface-2 p-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="text-sm font-semibold">Ink colors</div>
              <div className="text-xs text-muted">
                We estimate {inkEstimate} from your design. {draft.customization.inkColors !== undefined ? 'You set it by hand.' : 'Change it if you know better.'}
              </div>
            </div>
            <QtyStepper value={inks} min={1} max={12} label="Ink colors" onChange={(v) => update((d) => ({ ...d, customization: { ...d.customization, inkColors: v } }), { coalesce: 'inks' })} />
          </div>
          {draft.customization.inkColors !== undefined ? (
            <Button variant="link" size="sm" onClick={() => update((d) => ({ ...d, customization: { ...d.customization, inkColors: undefined } }))}>
              Use the estimate ({inkEstimate})
            </Button>
          ) : null}
          {inks > 6 ? (
            <div className="flex items-start gap-2 rounded-input bg-info/10 p-2.5 text-xs">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-info" />
              <div className="flex-1">
                <p className="font-medium">{inks} colors is a lot for screen print. DTF is usually cheaper for colorful designs.</p>
                {dtfOk ? (
                  <Button variant="link" size="sm" className="mt-1" onClick={() => setMethod('DTF')}>
                    Switch to DTF
                  </Button>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </Section>
  );
}

// ---------- quantity ----------

function QuantitySection({ onSplit }: { onSplit: (plan: SplitPlan) => void }) {
  const { draft, update, product, selectedOffering, state, match, coverage } = useCustomizer();
  const color = draft.customization.color;
  const clean = cleanBreakdown(draft.sizeBreakdown);
  const [singleSize, singleQty] = Object.entries(clean)[0] ?? [product.sizes.includes('M') ? 'M' : product.sizes[0], 0];
  const pinnedOrLocked = !!(draft.pinnedOfferingId || draft.lockVendorId);
  const shop = selectedOffering ? state.vendors[selectedOffering.vendorId]?.shopName : null;
  const allOffs = match.options.map((o) => o.offering).concat(match.unavailable.map((u) => u.offering).filter((o): o is NonNullable<typeof o> => !!o));

  const setMode = (mode: 'single' | 'bulk') =>
    update((d) => {
      if (mode === d.qtyMode) return d;
      if (mode === 'single') {
        const entries = Object.entries(cleanBreakdown(d.sizeBreakdown)).sort((a, b) => b[1] - a[1]);
        const size = entries[0]?.[0] ?? singleSize;
        return { ...d, qtyMode: mode, sizeBreakdown: { [size]: Math.max(1, totalQty(d.sizeBreakdown)) } };
      }
      return { ...d, qtyMode: mode };
    });

  const chipReason = (s: string): { reason: string | null; badge?: string } => {
    if (pinnedOrLocked) return { reason: sizeReason(selectedOffering, color, s) };
    if (coverage.missingEverywhere.includes(s) || !allOffs.some((o) => o.status === 'active' && variantOk(o, color, s, 1))) return { reason: `No ${s} in ${color} at any shop` };
    const here = sizeReason(selectedOffering, color, s);
    return { reason: null, badge: here ? '!' : undefined };
  };

  const stock = stockLeft(selectedOffering, color, singleSize);
  const lowStock = typeof stock === 'number' && stock < 50;

  return (
    <Section title="Quantity" id="q-qty">
      <div className="flex rounded-input bg-surface-2 p-1" role="tablist" aria-label="Quantity mode">
        {(
          [
            ['single', 'Single'],
            ['bulk', 'Size breakdown'],
          ] as const
        ).map(([m, label]) => (
          <button key={m} type="button" role="tab" aria-selected={draft.qtyMode === m} onClick={() => setMode(m)} className={cn('min-h-10 flex-1 rounded-[10px] px-2 text-sm font-medium transition-colors', draft.qtyMode === m ? 'bg-surface text-text shadow-s1' : 'text-muted hover:text-text')}>
            {label}
          </button>
        ))}
      </div>
      {draft.qtyMode === 'single' ? (
        <div className="space-y-3">
          {product.sizes.length > 1 ? (
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Size">
              {product.sizes.map((s) => {
                const { reason, badge } = chipReason(s);
                return (
                  <SizeChip
                    key={s}
                    size={s}
                    selected={s === singleSize}
                    disabledReason={reason}
                    badge={badge}
                    onClick={() => update((d) => ({ ...d, sizeBreakdown: { [s]: Math.max(1, singleQty) } }))}
                  />
                );
              })}
            </div>
          ) : null}
          {!pinnedOrLocked && product.sizes.some((s) => chipReason(s).badge) ? <p className="text-xs text-muted">Sizes marked ! are not at {shop ?? 'the current shop'}. Pick one and we switch to a shop that has it.</p> : null}
          <div className="flex flex-wrap items-center gap-3">
            <QtyStepper value={singleQty} min={1} label="Quantity" onChange={(v) => update((d) => ({ ...d, sizeBreakdown: { [singleSize]: v } }), { coalesce: 'qty' })} />
            <span className="text-sm text-muted">
              {singleQty === 1 ? 'piece' : 'pieces'} in {singleSize}
            </span>
          </div>
          {lowStock && shop ? (
            <div className={cn('flex flex-wrap items-center gap-2 rounded-input px-3 py-2 text-sm', typeof stock === 'number' && singleQty > stock ? 'bg-danger/10 text-red-700 dark:text-red-300' : 'bg-warning/15 text-amber-800 dark:text-amber-200')}>
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span className="flex-1">
                {stock === 0 ? `${color} / ${singleSize} is out of stock at ${shop}` : `Only ${stock} left in ${color} / ${singleSize} at this shop`}
              </span>
              {typeof stock === 'number' && stock > 0 && singleQty > stock ? (
                <Button variant="secondary" size="sm" onClick={() => update((d) => ({ ...d, sizeBreakdown: { [singleSize]: stock } }))}>
                  Make it {stock}
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : (
        <SizeBreakdownGrid />
      )}
      <CoverageNotice onSplit={onSplit} />
    </Section>
  );
}

/** 14.1: sizes no single shop has, with split or remove actions. */
function CoverageNotice({ onSplit }: { onSplit: (plan: SplitPlan) => void }) {
  const { coverage, draft, update, product } = useCustomizer();
  if (draft.qtyMode !== 'bulk') return null;
  if (coverage.missingEverywhere.length) {
    const sizes = coverage.missingEverywhere;
    return (
      <div className="space-y-2 rounded-input border border-danger/30 bg-danger/5 p-3 text-sm">
        <p className="font-medium">
          No shop has {sizes.join(', ')} in {draft.customization.color}.
        </p>
        <Button variant="secondary" size="sm" onClick={() => update((d) => ({ ...d, sizeBreakdown: Object.fromEntries(Object.entries(d.sizeBreakdown).filter(([s]) => !sizes.includes(s))) }))}>
          Remove {sizes.join(', ')}
        </Button>
      </div>
    );
  }
  if (!coverage.noSingleShop) return null;
  const split = coverage.split;
  const partial = coverage.bestPartial;
  return (
    <div className="space-y-2.5 rounded-input border border-warning/40 bg-warning/10 p-3 text-sm" role="status">
      <p className="flex items-center gap-2 font-semibold">
        <Scissors className="h-4 w-4" /> No single shop has all these sizes
      </p>
      {split ? (
        <p className="text-xs text-muted">
          Split it: {split.parts.map((p) => `${Object.entries(p.sizes).map(([s, q]) => `${q} ${s}`).join(' + ')} from ${p.vendorName}`).join(', ')}. Two deliveries, <MoneyText value={split.total} /> in total.
        </p>
      ) : (
        <p className="text-xs text-muted">We could not find two shops that cover every size with this method.</p>
      )}
      <div className="flex flex-wrap gap-2">
        {split ? (
          <Button
            size="sm"
            disabled={!draft.customization.layers.some((l) => !l.hidden)}
            onClick={() => onSplit(split)}
          >
            Split across two shops
          </Button>
        ) : null}
        {partial && partial.missing.length ? (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              update((d) => ({ ...d, sizeBreakdown: Object.fromEntries(Object.entries(d.sizeBreakdown).filter(([s]) => !partial.missing.includes(s))) }));
              toast(`Removed ${partial.missing.join(', ')}`, { description: `${product.name} can now come from one shop.` });
            }}
          >
            Remove {partial.missing.join(', ')}
          </Button>
        ) : null}
      </div>
      {!draft.customization.layers.some((l) => !l.hidden) && split ? <p className="text-xs text-muted">Add a design, image or text first.</p> : null}
    </div>
  );
}

// ---------- speed ----------

function SpeedPicker() {
  const { draft, update, selectedOffering, state, customerId, qty, product, selectVendor } = useCustomizer();
  const off = selectedOffering;
  const q = Math.max(1, qty);
  const std = off ? deliveryEstimate(state, customerId, off.id, off.methods.includes(draft.method) ? draft.method : off.methods[0], false, q) : null;
  const rushOk = !!off?.production.rush.available;
  const rush = off && rushOk ? deliveryEstimate(state, customerId, off.id, off.methods.includes(draft.method) ? draft.method : off.methods[0], true, q) : null;
  const shop = off ? state.vendors[off.vendorId]?.shopName : null;

  const alt = React.useMemo(() => {
    if (rushOk || !off || draft.lockVendorId) return null;
    const m = matchForCustomization(state, customerId, draft.customization, draft.method, draft.sizeBreakdown, true, null);
    return m.recommended;
  }, [rushOk, off, draft.lockVendorId, state, customerId, draft.customization, draft.method, draft.sizeBreakdown]);

  const Card = ({ on, disabled, onClick, icon, title, date, extra, reason }: { on: boolean; disabled?: boolean; onClick: () => void; icon: React.ReactNode; title: string; date: string | null; extra?: React.ReactNode; reason?: string | null }) => (
    <button
      type="button"
      role="radio"
      aria-checked={on}
      aria-disabled={disabled}
      onClick={disabled ? () => reason && toast(reason) : onClick}
      className={cn('flex min-h-[72px] flex-1 flex-col items-start gap-0.5 rounded-input border p-3 text-left transition-colors', on ? 'border-accent bg-accent-soft' : 'border-border hover:border-customer/50', disabled && 'cursor-not-allowed opacity-55 hover:border-border')}
    >
      <span className="flex items-center gap-1.5 text-sm font-semibold">
        {icon}
        {title}
        {extra}
      </span>
      <span className="text-xs text-muted">{disabled ? reason : date ? `Arrives ${date}` : 'Pick options to see the date'}</span>
    </button>
  );

  return (
    <Section title="Speed" id="q-speed">
      <div className="flex gap-2" role="radiogroup" aria-labelledby="q-speed">
        <Card on={!draft.rush} onClick={() => update((d) => ({ ...d, rush: false }))} icon={<Truck className="h-4 w-4" />} title="Standard" date={std ? relativeDay(std.deliveryDate) : null} />
        <Card
          on={draft.rush}
          disabled={!!off && !rushOk}
          reason={shop ? `${shop} doesn't do rush orders` : 'No rush here'}
          onClick={() => update((d) => ({ ...d, rush: true }))}
          icon={<Zap className="h-4 w-4" />}
          title="Rush"
          extra={off && rushOk ? <Badge tone="warning">+{off.production.rush.feePct}%</Badge> : null}
          date={rush ? relativeDay(rush.deliveryDate) : null}
        />
      </div>
      {std?.notices.length ? (
        <p className="flex items-start gap-1.5 text-xs text-muted">
          <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {(draft.rush && rush ? rush : std).notices.join('. ')}.
        </p>
      ) : null}
      {off && !rushOk && alt && alt.offering.id !== off.id ? (
        <div className="flex flex-wrap items-center gap-2 rounded-input bg-surface-2 px-3 py-2 text-xs">
          <Rocket className="h-4 w-4 text-accent-text" />
          <span className="flex-1">
            In a hurry? {alt.vendor.shopName} does rush, arrives {relativeDay(alt.deliveryDate)} for <MoneyText value={alt.quote.lineTotal} />.
          </span>
          <Button
            variant="soft"
            size="sm"
            onClick={() => {
              selectVendor(alt.offering.id);
              update((d) => ({ ...d, rush: true }), { coalesce: 'rush-switch' });
            }}
          >
            Switch for rush
          </Button>
        </div>
      ) : null}
    </Section>
  );
}

// ---------- vendor card ----------

function VendorCard() {
  const { effective, draft, selectVendor, setChooserOpen, blockReasons, match, unlock, state, pinnedUnavailable } = useCustomizer();
  const locked = !!draft.lockVendorId;
  if (!effective) {
    const suggestion = draft.pinnedOfferingId ? match.recommended : null;
    const lockVendor = locked ? state.vendors[draft.lockVendorId!] : null;
    const name = pinnedUnavailable?.vendor.shopName ?? lockVendor?.shopName;
    return (
      <div className="space-y-2.5 rounded-card border border-danger/30 bg-danger/5 p-4">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <AlertTriangle className="h-4 w-4 text-danger" />
          {name ? `${name} can't make this yet` : 'No shop can make this yet'}
        </p>
        <ul className="list-disc space-y-0.5 pl-5 text-sm text-muted">
          {blockReasons.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
        <div className="flex flex-wrap gap-2">
          {suggestion ? (
            <Button size="sm" onClick={() => selectVendor(suggestion.offering.id)}>
              Switch to {suggestion.vendor.shopName}, <MoneyText value={suggestion.quote.lineTotal} />
            </Button>
          ) : null}
          {locked ? (
            <Button variant="secondary" size="sm" onClick={unlock}>
              Compare other shops
            </Button>
          ) : (
            <Button variant="secondary" size="sm" onClick={() => setChooserOpen(true)}>
              See why each shop can't
            </Button>
          )}
        </div>
      </div>
    );
  }
  const v = effective.vendor;
  const o = effective.offering;
  const label = locked ? 'Your shop' : draft.pinnedOfferingId ? 'Your pick' : 'Recommended shop';
  return (
    <div className="rounded-card border border-border bg-surface p-4 shadow-s1">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</span>
        <div className="flex flex-wrap justify-end gap-1">
          {effective.badges.map((b) => (
            <Badge key={b} tone={b === 'Recommended' ? 'solid' : b === 'Cheapest' ? 'success' : 'info'}>
              {b}
            </Badge>
          ))}
        </div>
      </div>
      <div className="flex items-start gap-3">
        <Avatar name={v.shopName} src={v.logo} color={v.logoColor} size={44} square />
        <div className="min-w-0 flex-1">
          <Link href={`/shop/${v.id}`} className="block truncate font-display text-base font-semibold hover:underline">
            {v.shopName}
          </Link>
          <div className="flex flex-wrap items-center gap-x-2 text-xs text-muted">
            <Rating value={v.rating} count={v.reviewCount} />
            <span>{v.location.city}</span>
          </div>
        </div>
        <div className="text-right">
          <MoneyText value={effective.quote.lineTotal} animated className="block font-display text-lg font-bold" />
          <span className="text-xs text-muted">
            <MoneyText value={effective.quote.unitAvg} animated /> each
          </span>
        </div>
      </div>
      <div className="mt-3 space-y-1 text-sm">
        <p className="flex items-center gap-2">
          <Truck className="h-4 w-4 text-muted" /> Arrives <strong>{relativeDay(effective.deliveryDate)}</strong>
        </p>
        <p className="flex items-center gap-2 text-muted">
          <Sparkles className="h-4 w-4" /> {effective.reason}
        </p>
        <p className="flex items-center gap-2 text-xs text-muted">
          <Layers3 className="h-4 w-4" /> {o.blank.brand}, {o.blank.fabric}
          {o.blank.gsm ? `, ${o.blank.gsm} GSM` : ''}, {QUALITY_LABEL[o.blank.qualityTier]}
        </p>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {locked ? (
          <Button variant="secondary" size="sm" onClick={unlock}>
            <Store className="h-4 w-4" /> Compare other shops
          </Button>
        ) : (
          <Button variant="secondary" size="sm" onClick={() => setChooserOpen(true)}>
            Compare shops <ArrowRight className="h-4 w-4" />
          </Button>
        )}
        {draft.pinnedOfferingId && !locked ? (
          <Button variant="ghost" size="sm" onClick={() => selectVendor(null)}>
            Use recommended
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function MoqNudge() {
  const { match, quote, draft, update } = useCustomizer();
  const n = match.unavailable.find((u) => u.cheaperIfMoq && (!quote || u.cheaperIfMoq.unit < quote.unitAvg));
  if (!n || !n.cheaperIfMoq) return null;
  const moq = n.cheaperIfMoq.moq;
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-input border border-customer/30 bg-accent-soft px-3 py-2 text-sm">
      <Sparkles className="h-4 w-4 text-accent-text" />
      <span className="flex-1">
        Order {moq}+ to get <MoneyText value={n.cheaperIfMoq.unit} /> each from {n.vendor.shopName}
      </span>
      <Button
        variant="soft"
        size="sm"
        onClick={() =>
          update((d) => {
            const entries = Object.entries(cleanBreakdown(d.sizeBreakdown)).sort((a, b) => b[1] - a[1]);
            const total = totalQty(d.sizeBreakdown);
            const [size] = entries[0] ?? ['M'];
            return { ...d, pinnedOfferingId: null, sizeBreakdown: { ...d.sizeBreakdown, [size]: (d.sizeBreakdown[size] ?? 0) + (moq - total) } };
          })
        }
      >
        Make it {moq}
      </Button>
    </div>
  );
}

// ---------- warnings ----------

export function WarningsList({ gates, compact }: { gates: Gates; compact?: boolean }) {
  const { warnings, patchLayer, draft, product, setSelectedId, setView, state } = useCustomizer();
  const [busy, setBusy] = React.useState<string | null>(null);
  const hasRed = warnings.some((w) => w.kind === 'dpi' && w.level === 'red');
  const hasOob = warnings.some((w) => w.kind === 'bounds');
  if (!warnings.length) return null;

  const focus = (w: Warning) => {
    const l = draft.customization.layers.find((x) => x.id === w.layerId);
    if (!l) return;
    setSelectedId(l.id);
    const a = product.printAreas.find((x) => x.id === l.printAreaId);
    if (a) setView(a.view);
  };

  const removeBg = async (w: Warning) => {
    const l = draft.customization.layers.find((x) => x.id === w.layerId);
    if (!l?.src) return;
    setBusy(w.id);
    try {
      const src = await removeWhiteBackground(l.src);
      patchLayer(l.id, { src, transparent: true });
      toast.success('White background removed', { description: 'This is a quick demo cleanup. Check the preview.' });
    } catch {
      toast.error('Could not clean up this image', { description: 'Try a PNG with a transparent background.' });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-2" aria-live="polite">
      {warnings.map((w) => {
        const l = draft.customization.layers.find((x) => x.id === w.layerId);
        const area = l ? product.printAreas.find((a) => a.id === l.printAreaId) : null;
        return (
          <div
            key={w.id}
            className={cn(
              'flex items-start gap-2 rounded-input border p-2.5 text-sm',
              w.level === 'red' && 'border-danger/30 bg-danger/5',
              w.level === 'amber' && 'border-warning/40 bg-warning/10',
              w.level === 'info' && 'border-info/30 bg-info/5',
            )}
          >
            {w.level === 'info' ? <Info className="mt-0.5 h-4 w-4 shrink-0 text-info" /> : <AlertTriangle className={cn('mt-0.5 h-4 w-4 shrink-0', w.level === 'red' ? 'text-danger' : 'text-warning')} />}
            <div className="min-w-0 flex-1">
              <p className="font-medium">{w.title}</p>
              <p className="text-xs text-muted">
                {w.body}
                {area && !compact ? ` (${VIEW_LABEL[area.view]})` : ''}
              </p>
              <div className="mt-1 flex flex-wrap gap-x-3">
                {w.layerId ? (
                  <Button variant="link" size="sm" onClick={() => focus(w)}>
                    Show me
                  </Button>
                ) : null}
                {w.kind === 'bounds' && l && area ? (
                  <Button variant="link" size="sm" onClick={() => patchLayer(l.id, fitInside(l, area))}>
                    Fit inside
                  </Button>
                ) : null}
                {w.kind === 'background' ? (
                  <Button variant="link" size="sm" disabled={busy === w.id} onClick={() => removeBg(w)}>
                    <Wand2 className="h-3.5 w-3.5" /> {busy === w.id ? 'Cleaning up' : 'Remove white background'}
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
        );
      })}
      {hasRed ? (
        <label className="flex cursor-pointer items-start gap-2 rounded-input bg-surface-2 p-2.5 text-sm">
          <Checkbox checked={gates.acceptedLowQuality} onCheckedChange={(v) => gates.setAcceptedLowQuality(v === true)} aria-label="I accept lower print quality" className="mt-0.5" />
          <span>
            <span className="font-medium">I accept lower print quality</span>
            <span className="block text-xs text-muted">Needed to add a blurry image to your cart.</span>
          </span>
        </label>
      ) : null}
      {hasOob ? (
        <label className="flex cursor-pointer items-start gap-2 rounded-input bg-surface-2 p-2.5 text-sm">
          <Checkbox checked={gates.oobConfirmed} onCheckedChange={(v) => gates.setOobConfirmed(v === true)} aria-label="Print only the part inside the print area" className="mt-0.5" />
          <span>
            <span className="font-medium">Print only the part inside the print area</span>
            <span className="block text-xs text-muted">Or use Fit inside to move it back in.</span>
          </span>
        </label>
      ) : null}
    </div>
  );
}

// ---------- price ----------

function PriceBlock() {
  const { quote, blockReasons } = useCustomizer();
  if (!quote)
    return (
      <div className="rounded-card border border-dashed border-border p-4 text-sm text-muted">
        <p className="font-medium text-text">No price yet</p>
        <p>{blockReasons[0] ?? 'Pick a color, size and method to see your exact price.'}</p>
      </div>
    );
  return <PriceBreakdown quote={quote} title="Your price" />;
}

export function ConfigPanel({ gates, onSplit }: { gates: Gates; onSplit: (plan: SplitPlan) => void }) {
  return (
    <div className="space-y-6">
      <QualityFilter />
      <ColorPicker />
      <MethodPicker />
      <QuantitySection onSplit={onSplit} />
      <SpeedPicker />
      <Section title="Print shop" id="q-shop">
        <VendorCard />
        <MoqNudge />
      </Section>
      <WarningsList gates={gates} />
      <PriceBlock />
    </div>
  );
}

export { PriceBlock, VendorCard };
