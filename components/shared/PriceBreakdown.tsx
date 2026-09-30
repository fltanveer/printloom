'use client';
import * as React from 'react';
import { ChevronDown, Info } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { MoneyText } from './MoneyText';
import { cn } from '@/components/ui/cn';
import { Tip } from '@/components/ui/tooltip';
import { TIER_LABEL, TIER_RULE, METHOD_LABEL } from '@/lib/pricing';
import type { AvailableQuote, ShippingQuote, Split } from '@/lib/types';
import { useStore } from '@/lib/store';

function Row({ label, value, sub, tone, hint, strong }: { label: React.ReactNode; value: React.ReactNode; sub?: boolean; tone?: 'good' | 'muted'; hint?: string; strong?: boolean }) {
  return (
    <div className={cn('flex items-start justify-between gap-3 py-1 text-sm', sub && 'pl-3 text-muted', strong && 'font-semibold')}>
      <span className="flex min-w-0 items-center gap-1">
        {label}
        {hint ? (
          <Tip content={hint}>
            <button type="button" className="text-muted" aria-label="More info">
              <Info className="h-3.5 w-3.5" />
            </button>
          </Tip>
        ) : null}
      </span>
      <span className={cn('shrink-0 tabular-nums', tone === 'good' && 'font-medium text-green-600 dark:text-green-400', tone === 'muted' && 'text-muted')}>{value}</span>
    </div>
  );
}

/**
 * Itemized price from the pricing engine. Collapsed: unit and total. Expanded: every layer of section 7.9.
 */
export function PriceBreakdown({
  quote,
  shipping,
  split,
  defaultOpen = false,
  collapsible = true,
  showSplit = false,
  title = 'Price breakdown',
  className,
  paymentFee,
}: {
  quote: AvailableQuote | AvailableQuote[];
  shipping?: ShippingQuote | null;
  split?: Split | null;
  defaultOpen?: boolean;
  collapsible?: boolean;
  showSplit?: boolean;
  title?: string;
  className?: string;
  paymentFee?: number;
}) {
  const [open, setOpen] = React.useState(defaultOpen || !collapsible);
  const quotes = Array.isArray(quote) ? quote : [quote];
  const designers = useStore((s) => s.designers);
  const itemsTotal = quotes.reduce((s, q) => s + q.lineTotal, 0);
  const qty = quotes.reduce((s, q) => s + q.qty, 0);
  const total = itemsTotal + (shipping?.fee ?? 0) + (paymentFee ?? 0);
  const single = quotes.length === 1 ? quotes[0] : null;

  return (
    <div className={cn('rounded-card border border-border bg-surface', className)}>
      <button
        type="button"
        onClick={() => collapsible && setOpen((o) => !o)}
        className={cn('flex w-full items-center justify-between gap-3 p-4 text-left', !collapsible && 'cursor-default')}
        aria-expanded={open}
      >
        <div className="min-w-0">
          <div className="text-xs font-medium uppercase tracking-wide text-muted">{title}</div>
          <div className="mt-0.5 text-sm text-muted">
            {single ? (
              <>
                <MoneyText value={single.unitAvg} animated className="font-semibold text-text" /> avg per piece, {qty} {qty === 1 ? 'piece' : 'pieces'}
              </>
            ) : (
              <>
                {quotes.length} lines, {qty} pieces
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <MoneyText value={total} animated className="font-display text-2xl font-bold" />
          {collapsible ? <ChevronDown className={cn('h-5 w-5 text-muted transition-transform', open && 'rotate-180')} /> : null}
        </div>
      </button>
      <AnimatePresence initial={false}>
        {open ? (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.18 }} className="overflow-hidden">
            <div className="space-y-3 border-t border-border p-4">
              {quotes.map((q, qi) => (
                <div key={qi} className="space-y-0.5">
                  {quotes.length > 1 ? <div className="pb-1 text-xs font-semibold uppercase tracking-wide text-muted">Line {qi + 1}</div> : null}
                  {q.sizes.map((s) => (
                    <div key={s.size} className="rounded-input bg-surface-2/60 px-3 py-2">
                      <Row
                        strong
                        label={
                          <span>
                            {s.size} <span className="font-normal text-muted">x {s.qty}</span>
                          </span>
                        }
                        value={
                          <span>
                            <MoneyText value={s.unit} animated /> <span className="font-normal text-muted">each</span>
                          </span>
                        }
                      />
                      <Row sub label={s.garmentOverridden ? 'Garment (shop price for this cell)' : 'Garment'} value={<MoneyText value={s.garment} />} hint={s.garmentOverridden ? undefined : `Base ${q.basePrice}${s.sizeUpcharge ? `, ${s.size} +${s.sizeUpcharge}` : ''}${s.colorUpcharge ? `, ${q.colorGroup} color +${s.colorUpcharge}` : ''}`} />
                      <Row sub label={`Print (${METHOD_LABEL[q.method]})`} value={<MoneyText value={s.print} />} />
                      {s.tierDiscount > 0 ? <Row sub tone="good" label={`Bulk discount ${q.tier?.discountPct}%`} value={<MoneyText value={-s.tierDiscount} decimals />} /> : null}
                      {s.promoDiscount > 0 ? <Row sub tone="good" label={q.promotion?.name ?? 'Promotion'} value={<MoneyText value={-s.promoDiscount} decimals />} /> : null}
                      {s.rushFee > 0 ? <Row sub label={`Rush +${q.rushPct}%`} value={<MoneyText value={s.rushFee} decimals />} /> : null}
                      {s.royalty > 0 ? <Row sub label="Designer royalty" value={<MoneyText value={s.royalty} />} /> : null}
                      {Math.abs(s.unitRaw - s.unit) > 0.001 ? <Row sub label="Rounded to nearest ৳5" value={<MoneyText value={s.unit - s.unitRaw} decimals sign />} tone="muted" /> : null}
                    </div>
                  ))}
                  {q.areas.length ? (
                    <div className="pt-2">
                      <div className="pb-1 text-xs font-semibold uppercase tracking-wide text-muted">Print areas, per piece</div>
                      {q.areas.map((a) => (
                        <Row
                          key={a.areaId}
                          sub
                          label={`${a.name}: ${TIER_LABEL[a.tier].toLowerCase()}`}
                          hint={`${TIER_LABEL[a.tier]}: ${TIER_RULE[a.tier]}`}
                          value={
                            <span>
                              <MoneyText value={a.base} />
                              {a.darkUpcharge ? <> + <MoneyText value={a.darkUpcharge} /> dark</> : null}
                              {a.inkCost ? <> + <MoneyText value={a.inkCost} /> inks</> : null}
                              {a.stitchCost ? <> + <MoneyText value={a.stitchCost} /> stitches</> : null}
                              {a.extraAreaFee ? <> + <MoneyText value={a.extraAreaFee} /> extra area</> : null}
                            </span>
                          }
                        />
                      ))}
                    </div>
                  ) : null}
                  {q.royalties.length ? (
                    <div className="pt-1">
                      {q.royalties.map((r) => (
                        <Row key={r.designId} sub label={`${r.title} by ${designers[r.designerId]?.name ?? 'designer'}`} value={<span><MoneyText value={r.amount} /> x {q.qty}</span>} />
                      ))}
                    </div>
                  ) : null}
                  {q.oneTimeFees.map((f) => (
                    <Row key={f.label} label={f.label} hint="Charged once per order line, not per piece" value={<MoneyText value={f.amount} />} />
                  ))}
                  {q.nextTier ? (
                    <p className="pt-1 text-xs font-medium text-accent-text">
                      Add {q.nextTier.needed} more to save {q.nextTier.discountPct}% on every piece
                    </p>
                  ) : null}
                </div>
              ))}
              <div className="border-t border-dashed border-border pt-2">
                <Row label="Items" value={<MoneyText value={itemsTotal} />} />
                {shipping ? (
                  <Row
                    label={shipping.mode === 'pickup' ? 'Pickup from shop' : `Delivery (${shipping.zoneLabel.toLowerCase()})`}
                    value={
                      shipping.freeApplied ? (
                        <span>
                          <MoneyText value={shipping.baseFee + shipping.extraItemsFee} strike /> <span className="font-semibold text-green-600 dark:text-green-400">Free</span>
                        </span>
                      ) : (
                        <MoneyText value={shipping.fee} />
                      )
                    }
                    hint={shipping.mode === 'pickup' ? undefined : `Zone fee ${shipping.baseFee} + ${shipping.extraItemsFee} for extra items`}
                  />
                ) : null}
                {paymentFee ? <Row label="Cash on delivery fee" value={<MoneyText value={paymentFee} />} /> : null}
                <Row strong label="Total" value={<MoneyText value={total} animated className="text-base" />} />
              </div>
              {showSplit && split ? <SplitView split={split} /> : null}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

export function SplitView({ split, className }: { split: Split; className?: string }) {
  const designers = useStore((s) => s.designers);
  const vendorsTotal = split.vendor;
  const designersTotal = split.designers.reduce((s, d) => s + d.amount, 0);
  const total = vendorsTotal + designersTotal + split.platform;
  const pct = (v: number) => (total ? (v / total) * 100 : 0);
  return (
    <div className={cn('rounded-input bg-surface-2/70 p-3', className)}>
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Where your money goes</div>
      <div className="mb-3 flex h-2.5 overflow-hidden rounded-full">
        <div style={{ width: `${pct(vendorsTotal)}%`, background: '#FF7A1A' }} />
        <div style={{ width: `${pct(designersTotal)}%`, background: '#FF3D8B' }} />
        <div style={{ width: `${pct(split.platform)}%`, background: '#0FB5A6' }} />
      </div>
      <Row label={<span className="flex items-center gap-2"><i className="h-2 w-2 rounded-full bg-vendor" />Print shop</span>} value={<MoneyText value={vendorsTotal} decimals />} />
      {split.designers.map((d) => (
        <Row key={d.designerId} label={<span className="flex items-center gap-2"><i className="h-2 w-2 rounded-full bg-designer" />{designers[d.designerId]?.name ?? 'Designer'}</span>} value={<MoneyText value={d.amount} decimals />} />
      ))}
      <Row label={<span className="flex items-center gap-2"><i className="h-2 w-2 rounded-full bg-admin" />Printloom</span>} value={<MoneyText value={split.platform} decimals />} />
    </div>
  );
}
