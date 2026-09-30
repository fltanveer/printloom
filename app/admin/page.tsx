'use client';
import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertTriangle, ArrowRight, Bell, Coins, Palette, Percent, Scale, ShieldAlert, Store, TrendingUp } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useStore } from '@/lib/store';
import { platformStats } from '@/lib/selectors';
import { ORDER_STATUS_LABEL } from '@/lib/stateMachines';
import type { OrderStatus } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/misc';
import { cn } from '@/components/ui/cn';
import { MoneyText } from '@/components/shared/MoneyText';
import { Ago, EmptyState, KpiCard, ListSkeleton, PageHeader, useFakeLoading } from '@/components/shared/bits';

const STATUS_ORDER: OrderStatus[] = ['placed', 'accepted', 'in_production', 'quality_check', 'shipped', 'delivered', 'completed', 'issue_reported', 'escalated', 'reprint', 'rejected_by_vendor', 'cancelled_by_customer', 'refunded', 'partial_refund', 'issue_rejected', 'reassigned'];

export default function AdminOverview() {
  const loading = useFakeLoading();
  const router = useRouter();
  const state = useStore();
  const adminId = state.personas.admin;
  const stats = React.useMemo(() => platformStats(state), [state]);
  const notes = state.notifications.filter((n) => n.personaId === adminId).slice(0, 8);
  const flagged = Object.values(state.designs).filter((d) => d.status === 'flagged').length;
  const openReports = state.reports.filter((r) => r.status === 'open').length;
  const disputes = Object.values(state.subOrders).filter((s) => s.status === 'escalated').length;
  const chart = STATUS_ORDER.filter((s) => stats.byStatus[s]).map((s) => ({ status: ORDER_STATUS_LABEL[s], count: stats.byStatus[s] }));

  // GMV per day over the last 14 days for the sparkline
  const gmvSpark = React.useMemo(() => {
    const days = Array.from({ length: 14 }, () => 0);
    const now = Date.now();
    Object.values(state.subOrders).forEach((s) => {
      const d = Math.floor((now - new Date(s.createdAt).getTime()) / 86400000);
      if (d >= 0 && d < 14) days[13 - d] += s.total;
    });
    return days;
  }, [state.subOrders]);

  return (
    <div>
      <PageHeader title="Platform overview" subtitle="Live numbers from every order, request and shop." />
      {loading ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
          <KpiCard label="GMV" value={<MoneyText value={stats.gmv} />} icon={<TrendingUp className="h-4 w-4" />} spark={gmvSpark} delta={{ text: `${stats.orders} orders, ${stats.subOrders} shop orders`, good: true }} />
          <KpiCard label="Commission earned" value={<MoneyText value={stats.commission} decimals={false} />} icon={<Coins className="h-4 w-4" />} delta={{ text: `${state.settings.commissionPct}% rate`, good: true }} />
          <KpiCard label="Request fees" value={<MoneyText value={stats.requestFees} />} icon={<Percent className="h-4 w-4" />} delta={{ text: `${state.settings.requestFeePct}% of finished requests`, good: true }} />
          <KpiCard label="Active shops" value={stats.activeVendors} icon={<Store className="h-4 w-4" />} delta={{ text: `${Object.keys(state.vendors).length} total`, good: true }} />
          <KpiCard label="Active designers" value={stats.activeDesigners} icon={<Palette className="h-4 w-4" />} delta={{ text: `${Object.keys(state.designers).length} total`, good: true }} />
          <KpiCard label="Issue rate" value={`${(stats.issueRate * 100).toFixed(1)}%`} icon={<AlertTriangle className="h-4 w-4" />} delta={{ text: stats.issueRate > 0.1 ? 'Above the 10% target' : 'Within the 10% target', good: stats.issueRate <= 0.1 }} />
        </div>
      )}

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <Link href="/admin/moderation" className={cn('flex min-h-[64px] items-center gap-3 rounded-card border p-4 transition-colors hover:border-accent/60', flagged || openReports ? 'border-warning/50 bg-warning/5' : 'border-border bg-surface')}>
          <ShieldAlert className="h-6 w-6 text-amber-600" />
          <div className="flex-1">
            <p className="font-semibold">Moderation</p>
            <p className="text-sm text-muted">
              {flagged} flagged designs, {openReports} open reports
            </p>
          </div>
          <ArrowRight className="h-4 w-4 text-muted" />
        </Link>
        <Link href="/admin/disputes" className={cn('flex min-h-[64px] items-center gap-3 rounded-card border p-4 transition-colors hover:border-accent/60', disputes ? 'border-danger/40 bg-danger/5' : 'border-border bg-surface')}>
          <Scale className="h-6 w-6 text-red-600" />
          <div className="flex-1">
            <p className="font-semibold">Disputes</p>
            <p className="text-sm text-muted">{disputes ? `${disputes} waiting for a decision` : 'Nothing waiting'}</p>
          </div>
          <ArrowRight className="h-4 w-4 text-muted" />
        </Link>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1.5fr_1fr]">
        <Card className="p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">Shop orders by status</h2>
            <Link href="/admin/orders" className="inline-flex min-h-[44px] items-center gap-1 text-sm font-semibold text-accent-text">
              All orders <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          {loading ? (
            <Skeleton className="h-72" />
          ) : chart.length ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chart} layout="vertical" margin={{ top: 0, right: 16, left: 8, bottom: 0 }}>
                  <CartesianGrid horizontal={false} stroke="var(--border)" strokeDasharray="3 3" />
                  <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
                  <YAxis type="category" dataKey="status" width={110} tickLine={false} axisLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
                  <Tooltip cursor={{ fill: 'var(--surface-2)' }} contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, color: 'var(--text)' }} formatter={(v) => [`${v} orders`, 'Count']} />
                  <Bar dataKey="count" fill="#0FB5A6" radius={[0, 4, 4, 0]} maxBarSize={18} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState kind="box" body="No orders yet." />
          )}
        </Card>

        <Card className="p-4 sm:p-5">
          <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-semibold">
            <Bell className="h-5 w-5" /> Recent notifications
          </h2>
          {loading ? (
            <ListSkeleton rows={3} />
          ) : notes.length ? (
            <ul className="divide-y divide-border">
              {notes.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => {
                      state.markNotificationRead(n.id);
                      router.push(n.link);
                    }}
                    className="flex w-full items-start gap-3 py-3 text-left hover:bg-surface-2/60"
                  >
                    <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', n.read ? 'bg-transparent' : 'bg-accent')} aria-label={n.read ? undefined : 'Unread'} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold">{n.title}</span>
                      <span className="block text-sm text-muted">{n.body}</span>
                      <span className="text-xs text-muted">
                        <Ago at={n.at} />
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState kind="inbox" body="All quiet. Escalations and reports will show up here." action={<Button variant="secondary" size="sm" asChild><Link href="/admin/orders">View orders</Link></Button>} />
          )}
        </Card>
      </div>
    </div>
  );
}
