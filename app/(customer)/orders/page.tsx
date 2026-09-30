'use client';
import * as React from 'react';
import Link from 'next/link';
import { ChevronRight, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MoneyText } from '@/components/shared/MoneyText';
import { StatusPill } from '@/components/shared/StatusPill';
import { EmptyState, ListSkeleton, PageHeader, useFakeLoading } from '@/components/shared/bits';
import { MiniStepper } from '@/components/checkout/MiniStepper';
import { LineThumb } from '@/components/checkout/LineThumb';
import { useCustomerId, useStore } from '@/lib/store';
import { isLate } from '@/lib/selectors';
import { formatDate, relativeDay } from '@/lib/dates';

export default function OrdersPage() {
  const loading = useFakeLoading();
  const cid = useCustomerId();
  const orders = useStore((s) => s.orders);
  const subOrders = useStore((s) => s.subOrders);
  const vendors = useStore((s) => s.vendors);
  const list = React.useMemo(
    () =>
      Object.values(orders)
        .filter((o) => o.customerId === cid)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [orders, cid],
  );

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <PageHeader title="Your orders" subtitle="Every shop ships separately, so each package has its own progress." />
      {loading ? (
        <ListSkeleton rows={4} />
      ) : !list.length ? (
        <EmptyState
          kind="box"
          title="No orders yet"
          body="When you place an order, you can follow every step of it here."
          action={
            <Button asChild>
              <Link href="/catalog?category=tshirt">Start designing</Link>
            </Button>
          }
        />
      ) : (
        <ul className="space-y-4">
          {list.map((o) => {
            const subs = o.subOrderIds.map((id) => subOrders[id]).filter(Boolean);
            const first = subs[0]?.lines[0];
            return (
              <li key={o.id} className="rounded-card border border-border bg-surface p-4 shadow-s1">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {first ? <LineThumb customization={first.customization} offeringId={first.offeringId} className="w-14" /> : <Package className="h-8 w-8 text-muted" />}
                    <div>
                      <div className="font-display text-lg font-semibold">Order {o.number}</div>
                      <div className="text-sm text-muted">
                        {formatDate(o.createdAt, { day: 'numeric', month: 'short', year: 'numeric' })} · {subs.length} {subs.length === 1 ? 'package' : 'packages'}
                      </div>
                    </div>
                  </div>
                  <MoneyText value={o.total} className="font-display text-lg font-bold" />
                </div>
                <div className="mt-4 space-y-4">
                  {subs.map((s) => (
                    <div key={s.id} className="rounded-input bg-surface-2/60 p-3">
                      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                        <span className="text-sm font-semibold">{vendors[s.vendorId]?.shopName}</span>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {isLate(s) ? <StatusPill status="delayed" /> : null}
                          <StatusPill status={s.status} />
                        </div>
                      </div>
                      <MiniStepper status={s.status} />
                      {['placed', 'accepted', 'in_production', 'quality_check', 'shipped'].includes(s.status) ? (
                        <p className="mt-2 text-xs text-muted">Estimated arrival {relativeDay(s.estDelivery)}</p>
                      ) : null}
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex justify-end">
                  <Button asChild variant="soft">
                    <Link href={`/orders/${o.id}`}>
                      Track order <ChevronRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
