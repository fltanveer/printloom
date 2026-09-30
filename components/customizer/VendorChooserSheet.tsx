'use client';
import * as React from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, ChevronDown, MapPin, Sparkles, Store, Truck } from 'lucide-react';
import { deltas, type VendorOption } from '@/lib/vendorMatch';
import { relativeDay } from '@/lib/dates';
import type { ZoneKey } from '@/lib/types';
import { Dialog, SheetContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { NativeSelect } from '@/components/ui/input';
import { cn } from '@/components/ui/cn';
import { MoneyText, useMoney } from '@/components/shared/MoneyText';
import { PriceBreakdown } from '@/components/shared/PriceBreakdown';
import { Avatar, EmptyState, ListSkeleton, Rating, useFakeLoading } from '@/components/shared/bits';
import { useCustomizer } from './model';
import { cleanBreakdown, totalQty } from './draft';

type SortKey = 'recommended' | 'price' | 'speed' | 'rating';

const ZONE_LABEL: Record<ZoneKey, string> = { same_city: 'Same city', same_division: 'Same division', other: 'Other division' };

export function VendorChooserSheet() {
  const { chooserOpen, setChooserOpen } = useCustomizer();
  return (
    <Dialog open={chooserOpen} onOpenChange={setChooserOpen}>
      {chooserOpen ? <ChooserBody /> : null}
    </Dialog>
  );
}

function ChooserBody() {
  const { match, effective, draft, selectVendor, setChooserOpen, unlock, update, qty, state, customerId } = useCustomizer();
  const loading = useFakeLoading(350);
  const [sort, setSort] = React.useState<SortKey>('recommended');
  const [open, setOpen] = React.useState<string | null>(null);
  const money = useMoney();
  const rec = match.recommended;
  const city = state.customers[customerId]?.addresses.find((a) => a.id === state.customers[customerId]?.defaultAddressId)?.city;

  const sorted = React.useMemo(() => {
    const list = [...match.options];
    if (sort === 'price') list.sort((a, b) => a.quote.lineTotal - b.quote.lineTotal);
    else if (sort === 'speed') list.sort((a, b) => a.totalDays - b.totalDays || a.quote.lineTotal - b.quote.lineTotal);
    else if (sort === 'rating') list.sort((a, b) => b.vendor.rating - a.vendor.rating);
    return list;
  }, [match.options, sort]);

  const choose = (o: VendorOption) => {
    if (o.offering.id === effective?.offering.id && draft.pinnedOfferingId) {
      setChooserOpen(false);
      return;
    }
    if (rec && o.offering.id === rec.offering.id && !draft.pinnedOfferingId) {
      setChooserOpen(false);
      return;
    }
    selectVendor(o.offering.id);
    setChooserOpen(false);
  };

  const setMoq = (moq: number) => {
    update((d) => {
      const entries = Object.entries(cleanBreakdown(d.sizeBreakdown)).sort((a, b) => b[1] - a[1]);
      const [size] = entries[0] ?? ['M'];
      return { ...d, pinnedOfferingId: null, sizeBreakdown: { ...d.sizeBreakdown, [size]: (d.sizeBreakdown[size] ?? 0) + (moq - totalQty(d.sizeBreakdown)) } };
    });
  };

  return (
    <SheetContent
      title="Compare shops"
      description={`Exact prices for your design, ${qty} ${qty === 1 ? 'piece' : 'pieces'}${city ? `, delivered to ${city}` : ''}.`}
      footer={
        draft.lockVendorId ? (
          <Button variant="secondary" className="w-full" onClick={unlock}>
            <Store className="h-4 w-4" /> Compare other shops
          </Button>
        ) : draft.pinnedOfferingId ? (
          <Button
            variant="secondary"
            className="w-full"
            onClick={() => {
              selectVendor(null);
              setChooserOpen(false);
            }}
          >
            Let Printloom pick the best shop
          </Button>
        ) : null
      }
    >
      {loading ? (
        <ListSkeleton rows={4} />
      ) : (
        <div className="space-y-5">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-muted">
              {match.options.length} of {match.options.length + match.unavailable.length} shops can make it
            </span>
            <label className="flex items-center gap-2 text-sm">
              <span className="text-muted">Sort</span>
              <NativeSelect value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className="h-10 w-auto" aria-label="Sort shops">
                <option value="recommended">Recommended</option>
                <option value="price">Lowest price</option>
                <option value="speed">Fastest</option>
                <option value="rating">Top rated</option>
              </NativeSelect>
            </label>
          </div>

          {!sorted.length ? (
            <EmptyState kind="search" title="No shop can make this yet" body="Every shop is missing something you picked. The reasons are listed below, try another color, size or method." />
          ) : (
            <ul className="space-y-3">
              {sorted.map((o) => {
                const selected = effective?.offering.id === o.offering.id;
                const d = rec && rec !== o ? deltas(o, rec) : null;
                const isOpen = open === o.offering.id;
                const b = o.offering.blank;
                return (
                  <li key={o.offering.id} className={cn('rounded-card border bg-surface transition-shadow', selected ? 'border-accent shadow-glow' : 'border-border')}>
                    <div className="p-4">
                      <div className="flex items-start gap-3">
                        <Avatar name={o.vendor.shopName} src={o.vendor.logo} color={o.vendor.logoColor} size={44} square />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="truncate font-display font-semibold">{o.vendor.shopName}</span>
                            {o.badges.map((bd) => (
                              <Badge key={bd} tone={bd === 'Recommended' ? 'solid' : bd === 'Cheapest' ? 'success' : 'info'}>
                                {bd}
                              </Badge>
                            ))}
                          </div>
                          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted">
                            <Rating value={o.vendor.rating} count={o.vendor.reviewCount} />
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="h-3.5 w-3.5" />
                              {o.vendor.location.city}
                              {o.zone ? `, ${ZONE_LABEL[o.zone].toLowerCase()}` : ''}
                            </span>
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <MoneyText value={o.quote.lineTotal} className="block font-display text-lg font-bold" />
                          <span className="text-xs text-muted">
                            <MoneyText value={o.quote.unitAvg} /> each
                          </span>
                        </div>
                      </div>
                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        <Badge>{b.qualityTier === 'basic' ? 'Basic' : b.qualityTier === 'standard' ? 'Standard' : 'Premium'} blank</Badge>
                        {b.gsm ? <Badge>{b.gsm} GSM</Badge> : null}
                        <Badge>{b.fabric}</Badge>
                        {d && d.price !== 0 ? <Badge tone={d.price > 0 ? 'success' : 'neutral'}>{d.price > 0 ? `${money(d.price)} cheaper` : `${money(-d.price)} more`}</Badge> : null}
                        {d && d.days !== 0 ? <Badge tone={d.days > 0 ? 'info' : 'neutral'}>{d.days > 0 ? `${d.days} ${d.days === 1 ? 'day' : 'days'} faster` : `${-d.days} ${d.days === -1 ? 'day' : 'days'} slower`}</Badge> : null}
                      </div>
                      <div className="mt-2 space-y-0.5 text-sm">
                        <p className="flex items-center gap-2">
                          <Truck className="h-4 w-4 text-muted" /> Arrives <strong>{relativeDay(o.deliveryDate)}</strong>
                        </p>
                        {o.notices.length ? <p className="pl-6 text-xs text-muted">{o.notices.join('. ')}</p> : null}
                        <p className="flex items-center gap-2 text-xs text-muted">
                          <Sparkles className="h-4 w-4" /> {o.reason}
                        </p>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button size="sm" variant={selected ? 'soft' : 'primary'} onClick={() => choose(o)} aria-pressed={selected}>
                          {selected ? (
                            <>
                              <Check className="h-4 w-4" /> Selected
                            </>
                          ) : (
                            'Choose this shop'
                          )}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setOpen(isOpen ? null : o.offering.id)} aria-expanded={isOpen}>
                          Price details <ChevronDown className={cn('h-4 w-4 transition-transform', isOpen && 'rotate-180')} />
                        </Button>
                        <Button size="sm" variant="link" asChild>
                          <Link href={`/shop/${o.vendor.id}`}>Visit shop</Link>
                        </Button>
                      </div>
                    </div>
                    <AnimatePresence initial={false}>
                      {isOpen ? (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.18 }} className="overflow-hidden">
                          <div className="border-t border-border p-3">
                            <PriceBreakdown quote={o.quote} defaultOpen collapsible={false} title={`${o.vendor.shopName} price`} className="border-0" />
                          </div>
                        </motion.div>
                      ) : null}
                    </AnimatePresence>
                  </li>
                );
              })}
            </ul>
          )}

          {match.unavailable.length ? (
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Can&apos;t make this right now</h3>
              <ul className="space-y-2">
                {match.unavailable.map((u) => (
                  <li key={u.vendor.id} className="rounded-card border border-dashed border-border bg-surface-2 p-3">
                    <div className="flex items-center gap-3 opacity-70">
                      <Avatar name={u.vendor.shopName} src={u.vendor.logo} color={u.vendor.logoColor} size={36} square className="grayscale" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold">{u.vendor.shopName}</div>
                        <div className="text-xs text-muted">{u.reasons.join(' · ')}</div>
                        {u.vendor.status === 'paused' && u.vendor.pausedMessage ? <div className="text-xs italic text-muted">&ldquo;{u.vendor.pausedMessage}&rdquo;</div> : null}
                      </div>
                    </div>
                    {u.cheaperIfMoq ? (
                      <div className="mt-2 flex flex-wrap items-center gap-2 rounded-input bg-accent-soft px-3 py-2 text-sm">
                        <Sparkles className="h-4 w-4 text-accent-text" />
                        <span className="flex-1">
                          Order {u.cheaperIfMoq.moq}+ to get <MoneyText value={u.cheaperIfMoq.unit} /> each from {u.vendor.shopName}
                        </span>
                        <Button size="sm" variant="soft" onClick={() => setMoq(u.cheaperIfMoq!.moq)}>
                          Make it {u.cheaperIfMoq.moq}
                        </Button>
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      )}
    </SheetContent>
  );
}
