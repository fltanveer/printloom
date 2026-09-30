'use client';
import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Lock, ShoppingBag, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/misc';
import { Badge } from '@/components/ui/badge';
import { MoneyText, useMoney } from '@/components/shared/MoneyText';
import { PriceBreakdown } from '@/components/shared/PriceBreakdown';
import { Avatar, EmptyState, ListSkeleton, PageHeader, useFakeLoading } from '@/components/shared/bits';
import { CartLineCard } from '@/components/checkout/CartLineCard';
import { groupDates } from '@/components/checkout/helpers';
import { useCustomerId, useStore } from '@/lib/store';
import { cartLineStatus, customerAddress, groupCart } from '@/lib/selectors';
import { relativeDay } from '@/lib/dates';

export default function CartPage() {
  const loading = useFakeLoading();
  const router = useRouter();
  const cid = useCustomerId();
  const data = useStore();
  const money = useMoney();
  const lines = React.useMemo(() => data.carts[cid] ?? [], [data.carts, cid]);
  const address = customerAddress(data, cid);

  const groups = React.useMemo(() => groupCart(data, lines, address, new Date()), [data, lines, address]);
  const statuses = React.useMemo(() => Object.fromEntries(lines.map((l) => [l.id, cartLineStatus(data, cid, l)])), [data, lines, cid]);
  const blockingCount = Object.values(statuses).filter((s) => s.blocking).length;
  const grandTotal = groups.reduce((s, g) => s + (g.sub?.total ?? 0), 0);
  const pieces = lines.reduce((s, l) => s + Object.values(l.sizeBreakdown).reduce((a, b) => a + b, 0), 0);

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-6">
        <PageHeader title="Your cart" />
        <ListSkeleton rows={3} />
      </div>
    );
  }

  if (!lines.length) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-6">
        <PageHeader title="Your cart" />
        <EmptyState
          kind="shirt"
          title="Your cart is empty"
          body="Nothing here yet. Your next favorite tee is one design away."
          action={
            <Button asChild>
              <Link href="/catalog?category=tshirt">
                <ShoppingBag className="h-4 w-4" /> Start designing
              </Link>
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 pb-28 lg:pb-6">
      <PageHeader
        title="Your cart"
        subtitle={`${pieces} ${pieces === 1 ? 'piece' : 'pieces'} from ${groups.length} ${groups.length === 1 ? 'shop' : 'shops'}${address ? `, delivering to ${address.area}, ${address.city}` : ''}`}
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          {groups.map((g, gi) => {
            const vendor = data.vendors[g.vendorId];
            const offering = data.offerings[g.lines[0].line.offeringId];
            const dates = groupDates(data, cid, g.lines.map((l) => l.line));
            const ship = g.sub?.shipping;
            const threshold = offering?.delivery.freeShippingThreshold ?? null;
            return (
              <section key={g.vendorId} className="rounded-sheet border border-border bg-surface-2/40 p-3 sm:p-4" aria-label={`Items from ${vendor?.shopName}`}>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    {vendor ? <Avatar src={vendor.logo} name={vendor.shopName} color={vendor.logoColor} size={36} square /> : null}
                    <div>
                      <div className="text-xs font-medium uppercase tracking-wide text-muted">Package {gi + 1} of {groups.length}</div>
                      {vendor ? (
                        <Link href={`/shop/${vendor.id}`} className="font-display font-semibold hover:underline">
                          {vendor.shopName}
                        </Link>
                      ) : (
                        <span className="font-semibold">Unknown shop</span>
                      )}
                    </div>
                  </div>
                  {vendor?.status === 'paused' ? <Badge tone="warning">Temporarily closed</Badge> : null}
                </div>
                <div className="space-y-3">
                  {g.lines.map(({ line }) => (
                    <CartLineCard key={line.id} status={statuses[line.id]} customerId={cid} />
                  ))}
                </div>
                <div className="mt-3 space-y-2 rounded-card bg-surface p-3 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-2 text-muted">
                      <Truck className="h-4 w-4" />
                      {ship ? `Delivery, ${ship.zoneLabel.toLowerCase()}` : 'Delivery'}
                    </span>
                    {ship ? (
                      ship.served ? (
                        ship.freeApplied ? (
                          <span className="font-semibold text-green-600 dark:text-green-400">Free</span>
                        ) : (
                          <MoneyText value={ship.fee} className="font-semibold" />
                        )
                      ) : (
                        <span className="font-medium text-danger">Not delivered here</span>
                      )
                    ) : (
                      <span className="text-muted">Fix the items above</span>
                    )}
                  </div>
                  {dates ? (
                    <div className="flex items-center justify-between gap-3 text-muted">
                      <span>Estimated arrival</span>
                      <span className="font-medium text-text">{relativeDay(dates.deliveryDate)}</span>
                    </div>
                  ) : null}
                  {dates?.notices.length ? <p className="text-xs text-muted">{dates.notices.join('. ')}.</p> : null}
                  {ship && ship.remainingForFree !== null && ship.remainingForFree > 0 && threshold ? (
                    <div className="pt-1">
                      <p className="mb-1.5 text-xs font-medium text-accent-text">Add {money(ship.remainingForFree)} for free delivery</p>
                      <Progress value={(1 - ship.remainingForFree / threshold) * 100} />
                    </div>
                  ) : null}
                </div>
              </section>
            );
          })}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <h2 className="font-display text-lg font-semibold">Summary</h2>
          {groups.map((g) =>
            g.sub ? (
              <PriceBreakdown key={g.vendorId} title={data.vendors[g.vendorId]?.shopName ?? 'Shop'} quote={g.sub.lines} shipping={g.sub.shipping} />
            ) : (
              <div key={g.vendorId} className="rounded-card border border-border bg-surface p-4 text-sm text-muted">
                {data.vendors[g.vendorId]?.shopName}: fix the flagged items to see a price.
              </div>
            ),
          )}
          <div className="hidden rounded-card border border-border bg-surface p-4 lg:block">
            <CheckoutBox total={grandTotal} blocking={blockingCount} onCheckout={() => router.push('/checkout')} />
          </div>
        </aside>
      </div>
      <div className="fixed inset-x-0 bottom-[60px] z-30 border-t border-border bg-surface p-3 shadow-s3 md:bottom-0 lg:hidden">
        <CheckoutBox total={grandTotal} blocking={blockingCount} onCheckout={() => router.push('/checkout')} compact />
      </div>
    </div>
  );
}

function CheckoutBox({ total, blocking, onCheckout, compact }: { total: number; blocking: number; onCheckout: () => void; compact?: boolean }) {
  return (
    <div className={compact ? 'flex items-center gap-3' : 'space-y-3'}>
      <div className={compact ? 'min-w-0 flex-1' : 'flex items-center justify-between'}>
        <span className="text-sm text-muted">Total</span>
        <MoneyText value={total} animated className="block font-display text-2xl font-bold" />
      </div>
      {blocking > 0 && !compact ? (
        <p className="flex items-center gap-2 text-sm font-medium text-danger">
          <Lock className="h-4 w-4" /> Fix {blocking} flagged {blocking === 1 ? 'item' : 'items'} to check out
        </p>
      ) : null}
      <Button size="lg" className={compact ? '' : 'w-full'} disabled={blocking > 0} onClick={onCheckout} aria-label={blocking > 0 ? `Fix ${blocking} flagged items to check out` : 'Go to checkout'}>
        {blocking > 0 && compact ? `Fix ${blocking} ${blocking === 1 ? 'item' : 'items'}` : 'Checkout'} <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
