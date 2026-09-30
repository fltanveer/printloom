'use client';
import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AlertTriangle, ArrowRight, Boxes, ClipboardList, Gauge, PackageCheck, Star, Timer, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/misc';
import { EmptyState, KpiCard, ListSkeleton, PageHeader, useFakeLoading } from '@/components/shared/bits';
import { MoneyText, useMoney } from '@/components/shared/MoneyText';
import { useVendor } from '@/components/vendor/useVendor';
import { lowStock } from '@/components/vendor/helpers';
import { subOrdersForVendor, vendorFinance } from '@/lib/selectors';
import { formatDate, dayKey, addDays } from '@/lib/dates';

const VOID = ['cancelled_by_customer', 'refunded', 'rejected_by_vendor', 'reassigned'];

export default function VendorDashboard() {
  const loading = useFakeLoading();
  const router = useRouter();
  const { data, vendorId, vendor } = useVendor();
  const money = useMoney();

  const subs = React.useMemo(() => subOrdersForVendor(data, vendorId), [data, vendorId]);
  const fin = React.useMemo(() => vendorFinance(data, vendorId), [data, vendorId]);

  const days14 = React.useMemo(() => {
    const now = new Date();
    return Array.from({ length: 14 }).map((_, i) => {
      const d = addDays(now, i - 13);
      const key = dayKey(d);
      const daySubs = subs.filter((s) => dayKey(new Date(s.createdAt)) === key);
      return {
        key,
        label: formatDate(d, { day: 'numeric', month: 'short' }),
        revenue: daySubs.filter((s) => !VOID.includes(s.status)).reduce((t, s) => t + s.split.vendor, 0),
        orders: daySubs.length,
      };
    });
  }, [subs]);

  const offerings = React.useMemo(() => Object.values(data.offerings).filter((o) => o.vendorId === vendorId), [data.offerings, vendorId]);
  const newOrders = subs.filter((s) => s.status === 'placed');
  const openIssues = subs.filter((s) => s.issue && s.issue.status === 'open');
  const lowStockRows = offerings.flatMap((o) => lowStock(o).map((v) => ({ o, v })));

  const top = React.useMemo(() => {
    const m = new Map<string, number>();
    for (const s of subs) {
      if (VOID.includes(s.status)) continue;
      for (const l of s.lines) m.set(l.offeringId, (m.get(l.offeringId) ?? 0) + l.quote.qty);
    }
    return [...m.entries()]
      .map(([id, qty]) => ({ offering: data.offerings[id], qty }))
      .filter((x) => x.offering)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);
  }, [subs, data.offerings]);

  const capacity = React.useMemo(() => {
    const live = offerings.filter((o) => o.status === 'active');
    const pick = (live.length ? live : offerings).reduce<(typeof offerings)[number] | null>(
      (best, o) => (!best || o.production.bookedToday / o.production.dailyCapacity > best.production.bookedToday / best.production.dailyCapacity ? o : best),
      null,
    );
    return pick ? { booked: pick.production.bookedToday, cap: pick.production.dailyCapacity } : null;
  }, [offerings]);

  if (loading || !vendor) return <ListSkeleton rows={6} />;

  const accept = (id: string) => {
    const r = data.advanceSubOrder(id);
    if (r.ok) toast.success('Order accepted. The customer has been told.');
    else toast.error(r.reasons.join('. '));
  };

  const actions = newOrders.length + openIssues.length + lowStockRows.length;
  const capPct = capacity ? (capacity.booked / capacity.cap) * 100 : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Hi, ${vendor.shopName}`}
        subtitle={vendor.status === 'paused' ? 'Your shop is paused. Customers see it as temporarily closed.' : 'Here is how your shop is doing today.'}
        actions={
          <>
            <Button variant="secondary" asChild>
              <Link href="/vendor/offerings">Products and pricing</Link>
            </Button>
            <Button asChild>
              <Link href="/vendor/orders?tab=new">
                Open orders <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard label="Today's orders" value={fin.ordersToday} spark={days14.slice(-7).map((d) => d.orders)} icon={<ClipboardList className="h-4 w-4" />} />
        <KpiCard label="Revenue this week" value={<MoneyText value={fin.revenueWeek} />} spark={days14.slice(-7).map((d) => d.revenue)} icon={<Wallet className="h-4 w-4" />} />
        <KpiCard label="Average rating" value={vendor.rating.toFixed(1)} delta={{ text: `${vendor.reviewCount} reviews`, good: vendor.rating >= 4 }} icon={<Star className="h-4 w-4" />} />
        <KpiCard label="On-time rate" value={`${vendor.onTimeRate}%`} delta={{ text: vendor.onTimeRate >= 90 ? 'Customers love this' : 'Aim for 90% or more', good: vendor.onTimeRate >= 90 }} icon={<Timer className="h-4 w-4" />} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Needs action</CardTitle>
            <Badge tone={actions ? 'warning' : 'success'}>{actions ? `${actions} to do` : 'All clear'}</Badge>
          </CardHeader>
          <CardContent>
            {actions === 0 ? (
              <EmptyState kind="spark" body="Nothing waiting on you. Nice work." className="border-0 py-6" />
            ) : (
              <ul className="divide-y divide-border">
                {newOrders.map((s) => (
                  <li key={s.id} className="flex flex-wrap items-center gap-3 py-3">
                    <span className="grid h-9 w-9 place-items-center rounded-full bg-accent-soft text-accent-text">
                      <ClipboardList className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <Link href={`/vendor/orders/${s.id}`} className="font-semibold hover:underline">
                        New order {data.orders[s.orderId]?.number}
                      </Link>
                      <div className="text-xs text-muted">
                        {s.lines.reduce((t, l) => t + l.quote.qty, 0)} pieces to {data.orders[s.orderId]?.address.city}, payout {money(s.split.vendor)}
                      </div>
                    </div>
                    <Button size="sm" onClick={() => accept(s.id)}>
                      Accept
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => router.push(`/vendor/orders/${s.id}`)}>
                      Review
                    </Button>
                  </li>
                ))}
                {openIssues.map((s) => (
                  <li key={s.id} className="flex flex-wrap items-center gap-3 py-3">
                    <span className="grid h-9 w-9 place-items-center rounded-full bg-danger/10 text-danger">
                      <AlertTriangle className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold">Issue on {data.orders[s.orderId]?.number}</div>
                      <div className="truncate text-xs text-muted">{s.issue?.note}</div>
                    </div>
                    <Button size="sm" variant="secondary" asChild>
                      <Link href="/vendor/issues">Resolve</Link>
                    </Button>
                  </li>
                ))}
                {lowStockRows.slice(0, 6).map(({ o, v }) => (
                  <li key={v.id} className="flex flex-wrap items-center gap-3 py-3">
                    <span className="grid h-9 w-9 place-items-center rounded-full bg-warning/15 text-amber-600">
                      <Boxes className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold">
                        {v.stock === 0 ? 'Out of stock' : `Only ${v.stock} left`}: {v.color} / {v.size}
                      </div>
                      <div className="text-xs text-muted">{data.products[o.productId]?.name}</div>
                    </div>
                    <Button size="sm" variant="secondary" asChild>
                      <Link href={`/vendor/offerings/${o.id}?tab=colors`}>Restock</Link>
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Capacity today</CardTitle>
            <Gauge className="h-5 w-5 text-muted" />
          </CardHeader>
          <CardContent className="space-y-3">
            {capacity ? (
              <>
                <div className="flex items-end justify-between">
                  <span className="font-display text-3xl font-bold tabular-nums">
                    {capacity.booked}
                    <span className="text-base font-medium text-muted"> / {capacity.cap} pieces</span>
                  </span>
                  <span className="text-sm font-semibold tabular-nums">{Math.round(capPct)}%</span>
                </div>
                <Progress value={capPct} tone={capPct >= 90 ? '#EF4444' : capPct >= 70 ? '#F59E0B' : undefined} className="h-3" />
                <p className="text-sm text-muted">
                  {capPct >= 90
                    ? 'Almost full. New orders get one extra day on their delivery date.'
                    : `Room for ${capacity.cap - capacity.booked} more pieces before dates shift.`}
                </p>
              </>
            ) : (
              <p className="text-sm text-muted">Add a product to track daily capacity.</p>
            )}
            <div className="border-t border-border pt-3">
              <div className="mb-2 text-sm font-semibold">Top products</div>
              {top.length ? (
                <ul className="space-y-2">
                  {top.map((t) => (
                    <li key={t.offering.id} className="flex items-center justify-between gap-2 text-sm">
                      <Link href={`/vendor/offerings/${t.offering.id}`} className="truncate hover:underline">
                        {data.products[t.offering.productId]?.name}
                      </Link>
                      <span className="flex items-center gap-1 tabular-nums text-muted">
                        <PackageCheck className="h-3.5 w-3.5" /> {t.qty} sold
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted">No sales yet. Your best sellers will show up here.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Your payout, last 14 days</CardTitle>
            <p className="text-sm text-muted">What you earn after Printloom commission, by order day.</p>
          </div>
          <MoneyText value={days14.reduce((t, d) => t + d.revenue, 0)} className="font-display text-xl font-bold" />
        </CardHeader>
        <CardContent>
          <div className="h-64" role="img" aria-label="Bar chart of daily payout for the last 14 days">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={days14} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} width={56} tickFormatter={(v: number) => money(v)} />
                <Tooltip
                  cursor={{ fill: 'var(--surface-2)' }}
                  contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, color: 'var(--text)' }}
                  formatter={(v) => [money(Number(v)), 'Payout']}
                />
                <Bar dataKey="revenue" fill="var(--accent)" radius={[4, 4, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
